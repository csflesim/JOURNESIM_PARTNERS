import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createEsimOrder } from '@/lib/billionconnect'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/esim-orders
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const offset = (page - 1) * limit

  const { data, error, count } = await supabase
    .from('orders')
    .select('*, order_items(*), agents(id,nickname)', { count: 'exact' })
    .in('order_type', ['esim', 'esim_air'])
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data, total: count })
}

// POST /api/admin/esim-orders
export async function POST(req: Request) {
  const body = await req.json()
  const {
    agentId,
    email,
    estimatedUseTime,
    comment,
    items, // { skuId, copies, number, rechargeableEsim?, unitPrice? }[]
  } = body

  if (!items || items.length === 0) {
    return NextResponse.json({ error: '請選擇商品' }, { status: 400 })
  }

  // 產生訂單號
  const channelOrderId = `FS${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`

  // 組裝 BC 子訂單
  const subOrderList = items.map((item: {
    skuId: string
    copies: number
    number: number
    rechargeableEsim?: string
    unitPrice?: number
  }, idx: number) => ({
    channelSubOrderId: `${channelOrderId}-${String(idx + 1).padStart(3, '0')}`,
    deviceSkuId: item.skuId,
    planSkuCopies: String(item.copies),
    number: String(item.number),
    ...(item.rechargeableEsim ? { rechargeableESIM: item.rechargeableEsim } : {}),
  }))

  // 計算總金額
  const totalAmount = items.reduce((sum: number, item: { copies: number; number: number; unitPrice?: number }) => {
    return sum + (item.unitPrice ?? 0) * item.copies * item.number
  }, 0)

  // 呼叫 BC F040
  let bcResult
  try {
    bcResult = await createEsimOrder({
      channelOrderId,
      ...(email ? { email } : {}),
      ...(totalAmount > 0 ? { totalAmount: String(totalAmount) } : {}),
      ...(estimatedUseTime ? { estimatedUseTime } : {}),
      subOrderList,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }

  // 判斷訂單類型（取第一個 item 的 type 決定）
  const firstSkuId = items[0].skuId
  const { data: product } = await supabase
    .from('products')
    .select('type')
    .eq('sku_id', firstSkuId)
    .single()
  const orderType = ['3105', '3106'].includes(product?.type) ? 'esim_air' : 'esim'

  // 寫入 orders
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      source: 'admin',
      agent_id: agentId ?? null,
      user_email: email ?? null,
      channel_order_id: channelOrderId,
      bc_order_id: bcResult.orderId,
      order_type: orderType,
      total_amount: totalAmount > 0 ? totalAmount : null,
      order_status: 'processing',
      estimated_use_time: estimatedUseTime ?? null,
      comment: comment ?? null,
    })
    .select()
    .single()

  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 })

  // 寫入 order_items
  const orderItemsData = items.map((item: {
    skuId: string
    copies: number
    number: number
    unitPrice?: number
  }, idx: number) => {
    const bcSub = bcResult.subOrderList[idx]
    return {
      order_id: order.id,
      channel_sub_order_id: subOrderList[idx].channelSubOrderId,
      bc_sub_order_id: bcSub?.subOrderId ?? null,
      sku_id: item.skuId,
      copies: item.copies,
      number: item.number,
      unit_price: item.unitPrice ?? null,
    }
  })

  const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsData)
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })

  return NextResponse.json({ order, channelOrderId, bcOrderId: bcResult.orderId })
}
