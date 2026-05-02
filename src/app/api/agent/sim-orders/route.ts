import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRechargeOrder } from '@/lib/billionconnect'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/agent/sim-orders?agent_id=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agent_id')
  if (!agentId) return NextResponse.json({ error: 'agent_id required' }, { status: 400 })

  const { data, error, count } = await supabase
    .from('orders')
    .select('*, order_items(*)', { count: 'exact' })
    .eq('source', 'partner')
    .eq('agent_id', agentId)
    .eq('order_type', 'sim')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data, total: count })
}

// POST /api/agent/sim-orders
// 代理商下單 SIM → 向 BC 採購 → 關聯兩筆訂單
export async function POST(req: Request) {
  const body = await req.json()
  const { agentId, skuId, iccids, copies, agentSellPrice, bcSettlementPrice, comment } = body

  if (!agentId) return NextResponse.json({ error: '請選擇代理商' }, { status: 400 })
  if (!skuId) return NextResponse.json({ error: '請選擇套餐' }, { status: 400 })
  if (!iccids?.length) return NextResponse.json({ error: '請輸入 ICCID' }, { status: 400 })

  const effectiveCopies = copies ?? 1
  const agentTotal = agentSellPrice * iccids.length
  const bcTotal = bcSettlementPrice * effectiveCopies * iccids.length

  const ts = Date.now()
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  const partnerChannelOrderId = `FP${ts}${rand}`
  const purchaseChannelOrderId = `FS${ts}${rand}`
  const purchaseSubOrderId = `${purchaseChannelOrderId}-001`

  // 1. 呼叫 BC F007 建立採購
  let bcResult
  try {
    bcResult = await createRechargeOrder({
      channelOrderId: purchaseChannelOrderId,
      ...(bcTotal > 0 ? { totalAmount: String(bcTotal) } : {}),
      subOrderList: [{
        channelSubOrderId: purchaseSubOrderId,
        iccid: iccids,
        skuId,
        copies: String(effectiveCopies),
      }],
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  // 2. 寫入採購訂單
  const { data: purchaseOrder, error: poErr } = await supabase
    .from('orders')
    .insert({
      source: 'admin',
      agent_id: agentId,
      channel_order_id: purchaseChannelOrderId,
      bc_order_id: bcResult.orderId,
      order_type: 'sim',
      total_amount: bcTotal > 0 ? bcTotal : null,
      order_status: 'processing',
      comment: comment ?? null,
    })
    .select()
    .single()

  if (poErr) return NextResponse.json({ error: poErr.message }, { status: 500 })

  const bcSub = bcResult.subOrderList[0]
  await supabase.from('order_items').insert({
    order_id: purchaseOrder.id,
    channel_sub_order_id: purchaseSubOrderId,
    bc_sub_order_id: bcSub?.subOrderId ?? null,
    sku_id: skuId,
    copies: effectiveCopies,
    number: iccids.length,
    unit_price: bcSettlementPrice,
    iccid: iccids,
  })

  // 3. 寫入代理商訂單
  const { data: partnerOrder, error: ptErr } = await supabase
    .from('orders')
    .insert({
      source: 'partner',
      agent_id: agentId,
      channel_order_id: partnerChannelOrderId,
      bc_order_id: bcResult.orderId,
      order_type: 'sim',
      total_amount: agentTotal > 0 ? agentTotal : null,
      order_status: 'processing',
      comment: comment ?? null,
      partner_order_id: purchaseOrder.id,
    })
    .select()
    .single()

  if (ptErr) return NextResponse.json({ error: ptErr.message }, { status: 500 })

  await supabase.from('order_items').insert({
    order_id: partnerOrder.id,
    channel_sub_order_id: `${partnerChannelOrderId}-001`,
    bc_sub_order_id: bcSub?.subOrderId ?? null,
    sku_id: skuId,
    copies: effectiveCopies,
    number: iccids.length,
    unit_price: agentSellPrice,
    agent_sell_price: agentSellPrice,
    iccid: iccids,
  })

  // 4. 回填採購訂單指向代理商訂單
  await supabase.from('orders').update({ partner_order_id: partnerOrder.id }).eq('id', purchaseOrder.id)

  return NextResponse.json({
    partnerOrder,
    purchaseOrder: { id: purchaseOrder.id, channelOrderId: purchaseChannelOrderId },
    bcOrderId: bcResult.orderId,
  })
}
