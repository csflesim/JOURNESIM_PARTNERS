import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createEsimOrder } from '@/lib/billionconnect'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/agent/esim-orders?agent_id=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agent_id')
  if (!agentId) return NextResponse.json({ error: 'agent_id required' }, { status: 400 })

  const { data, error, count } = await supabase
    .from('orders')
    .select('*, order_items(*)', { count: 'exact' })
    .eq('source', 'partner')
    .eq('agent_id', agentId)
    .in('order_type', ['esim', 'esim_air'])
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data, total: count })
}

// POST /api/agent/esim-orders
// 代理商下單 → 記錄代理商訂單 → 向 BC 採購 → 記錄採購訂單 → 關聯
export async function POST(req: Request) {
  const body = await req.json()
  const { agentId, email, estimatedUseTime, comment, items } = body
  // items: [{ skuId, copies, number, agentSellPrice, bcSettlementPrice }]

  if (!agentId) return NextResponse.json({ error: '請選擇代理商' }, { status: 400 })
  if (!items?.length) return NextResponse.json({ error: '請選擇商品' }, { status: 400 })

  // 1. 計算代理商售價總額
  const agentTotal = items.reduce((sum: number, it: { copies: number; number: number; agentSellPrice: number }) =>
    sum + it.agentSellPrice * it.number, 0)

  // 2. 計算 BC 結算價總額
  const bcTotal = items.reduce((sum: number, it: { copies: number; number: number; bcSettlementPrice: number }) =>
    sum + it.bcSettlementPrice * it.copies * it.number, 0)

  // 3. 產生訂單號
  const ts = Date.now()
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  const partnerChannelOrderId = `FP${ts}${rand}`   // 代理商訂單號
  const purchaseChannelOrderId = `FS${ts}${rand}`   // 對應採購訂單號

  // 4. 呼叫 BC F040 建立採購訂單
  const subOrderList = items.map((item: { skuId: string; copies: number; number: number; rechargeableEsim?: string }, idx: number) => ({
    channelSubOrderId: `${purchaseChannelOrderId}-${String(idx + 1).padStart(3, '0')}`,
    deviceSkuId: item.skuId,
    planSkuCopies: String(item.copies),
    number: String(item.number),
    ...(item.rechargeableEsim ? { rechargeableESIM: item.rechargeableEsim } : {}),
  }))

  let bcResult
  try {
    bcResult = await createEsimOrder({
      channelOrderId: purchaseChannelOrderId,
      ...(email ? { email } : {}),
      ...(bcTotal > 0 ? { totalAmount: String(bcTotal) } : {}),
      ...(estimatedUseTime ? { estimatedUseTime } : {}),
      subOrderList,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }

  // 5. 判斷訂單類型
  const firstSkuId = items[0].skuId
  const { data: product } = await supabase.from('products').select('type').eq('sku_id', firstSkuId).single()
  const orderType = ['3105', '3106'].includes(product?.type) ? 'esim_air' : 'esim'

  // 6. 寫入採購訂單（source=admin）
  const { data: purchaseOrder, error: poErr } = await supabase
    .from('orders')
    .insert({
      source: 'admin',
      agent_id: agentId,
      user_email: email ?? null,
      channel_order_id: purchaseChannelOrderId,
      bc_order_id: bcResult.orderId,
      order_type: orderType,
      total_amount: bcTotal > 0 ? bcTotal : null,
      order_status: 'processing',
      estimated_use_time: estimatedUseTime ?? null,
      comment: comment ?? null,
    })
    .select()
    .single()

  if (poErr) return NextResponse.json({ error: poErr.message }, { status: 500 })

  // 寫入採購子訂單
  const purchaseItems = items.map((item: { skuId: string; copies: number; number: number; bcSettlementPrice: number }, idx: number) => ({
    order_id: purchaseOrder.id,
    channel_sub_order_id: subOrderList[idx].channelSubOrderId,
    bc_sub_order_id: bcResult.subOrderList[idx]?.subOrderId ?? null,
    sku_id: item.skuId,
    copies: item.copies,
    number: item.number,
    unit_price: item.bcSettlementPrice,
  }))
  await supabase.from('order_items').insert(purchaseItems)

  // 7. 寫入代理商訂單（source=partner）
  const { data: partnerOrder, error: ptErr } = await supabase
    .from('orders')
    .insert({
      source: 'partner',
      agent_id: agentId,
      user_email: email ?? null,
      channel_order_id: partnerChannelOrderId,
      bc_order_id: bcResult.orderId,
      order_type: orderType,
      total_amount: agentTotal > 0 ? agentTotal : null,
      order_status: 'processing',
      estimated_use_time: estimatedUseTime ?? null,
      comment: comment ?? null,
      partner_order_id: purchaseOrder.id,  // 指向採購訂單
    })
    .select()
    .single()

  if (ptErr) return NextResponse.json({ error: ptErr.message }, { status: 500 })

  // 寫入代理商子訂單（含代理商售價）
  const partnerItems = items.map((item: { skuId: string; copies: number; number: number; agentSellPrice: number }, idx: number) => ({
    order_id: partnerOrder.id,
    channel_sub_order_id: `${partnerChannelOrderId}-${String(idx + 1).padStart(3, '0')}`,
    bc_sub_order_id: bcResult.subOrderList[idx]?.subOrderId ?? null,
    sku_id: item.skuId,
    copies: item.copies,
    number: item.number,
    unit_price: item.agentSellPrice,
    agent_sell_price: item.agentSellPrice,
  }))
  await supabase.from('order_items').insert(partnerItems)

  // 8. 回填採購訂單的 partner_order_id
  await supabase.from('orders').update({ partner_order_id: partnerOrder.id }).eq('id', purchaseOrder.id)

  return NextResponse.json({
    partnerOrder,
    purchaseOrder: { id: purchaseOrder.id, channelOrderId: purchaseChannelOrderId },
    bcOrderId: bcResult.orderId,
  })
}
