import { NextResponse } from 'next/server'
import { createRechargeOrder } from '@/lib/billionconnect'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/sim-orders
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const channelOrderId = searchParams.get('channel_order_id')?.trim()
  const bcOrderId = searchParams.get('bc_order_id')?.trim()
  const iccid = searchParams.get('iccid')?.trim()
  const skuName = searchParams.get('sku_name')?.trim()
  const orderStatus = searchParams.get('order_status')
  const planStatus = searchParams.get('plan_status')
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const afterSaleStatus = searchParams.get('after_sale_status')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const offset = (page - 1) * limit

  const supabase = createAdminClient()

  // If filtering by ICCID, find matching order_ids first
  let filterOrderIds: string[] | null = null
  if (iccid) {
    const { data: items } = await supabase
      .from('order_items')
      .select('order_id')
      .contains('iccid', [iccid])
    filterOrderIds = items?.map(i => i.order_id) ?? []
    if (filterOrderIds.length === 0) return NextResponse.json({ orders: [], total: 0 })
  }

  // If filtering by sku_name, find matching sku_ids first
  let filterSkuIds: string[] | null = null
  if (skuName) {
    const { data: products } = await supabase
      .from('products')
      .select('sku_id')
      .ilike('name', `%${skuName}%`)
    filterSkuIds = products?.map(p => p.sku_id) ?? []
  }

  // If filtering by plan_status or sku, get matching order_ids
  if (planStatus || filterSkuIds) {
    let itemQuery = supabase.from('order_items').select('order_id')
    if (planStatus) itemQuery = itemQuery.eq('plan_status', planStatus)
    if (filterSkuIds) {
      if (filterSkuIds.length === 0) return NextResponse.json({ orders: [], total: 0 })
      itemQuery = itemQuery.in('sku_id', filterSkuIds)
    }
    const { data: items } = await itemQuery
    const ids = items?.map(i => i.order_id) ?? []
    filterOrderIds = filterOrderIds ? filterOrderIds.filter(id => ids.includes(id)) : ids
    if (filterOrderIds.length === 0) return NextResponse.json({ orders: [], total: 0 })
  }

  let query = supabase
    .from('orders')
    .select(
      `id, channel_order_id, bc_order_id, order_type, order_status,
       total_amount, estimated_use_time, comment, created_at, source, user_email,
       order_items(id, channel_sub_order_id, bc_sub_order_id, sku_id, copies, number, iccid, plan_status,
         plan_start_time, plan_end_time, products(name, type, days, capacity, high_flow_size, limit_flow_speed,
           hotspot_support, desc_text, apn, provider, speed_limit_rule, plan_type))`,
      { count: 'exact' }
    )
    .eq('order_type', 'sim')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (channelOrderId) query = query.ilike('channel_order_id', `%${channelOrderId}%`)
  if (bcOrderId) query = query.ilike('bc_order_id', `%${bcOrderId}%`)
  if (orderStatus) query = query.eq('order_status', orderStatus)
  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59Z')
  if (filterOrderIds) query = query.in('id', filterOrderIds.length ? filterOrderIds : ['__none__'])

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch after-sale status per order if needed
  const orderIds = (data ?? []).map(o => o.id)
  let afterSaleMap: Record<string, string> = {}
  if (orderIds.length > 0) {
    const { data: aftersales } = await supabase
      .from('after_sales')
      .select('order_id, status')
      .in('order_id', orderIds)
    aftersales?.forEach(a => { afterSaleMap[a.order_id] = a.status })
  }

  const orders = (data ?? []).map(o => ({
    ...o,
    after_sale_status: afterSaleMap[o.id] ?? null,
  }))

  // Apply after_sale_status filter in-memory if needed
  const filtered = afterSaleStatus
    ? orders.filter(o => (afterSaleStatus === 'none' ? !o.after_sale_status : o.after_sale_status === afterSaleStatus))
    : orders

  return NextResponse.json({ orders: filtered, total: afterSaleStatus ? filtered.length : (count ?? 0) })
}

// POST /api/admin/sim-orders
// 使用 F007 建立 SIM 卡充值訂單
export async function POST(req: Request) {
  const { skuId, iccids, copies, unitPrice, agentId, comment } = await req.json().catch(() => ({}))

  if (!skuId) return NextResponse.json({ error: '請選擇套餐' }, { status: 400 })
  if (!iccids?.length) return NextResponse.json({ error: '請輸入 ICCID' }, { status: 400 })

  const channelOrderId = `FS${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
  const channelSubOrderId = `${channelOrderId}-001`
  const effectiveCopies = copies ?? 1
  const totalAmount = unitPrice > 0 ? unitPrice * iccids.length : undefined

  let bcResult
  try {
    bcResult = await createRechargeOrder({
      channelOrderId,
      ...(totalAmount ? { totalAmount: String(totalAmount) } : {}),
      subOrderList: [{
        channelSubOrderId,
        iccid: iccids,
        skuId,
        copies: String(effectiveCopies),
      }],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? '建立失敗' }, { status: 502 })
  }

  const supabase = createAdminClient()

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      source: 'admin',
      agent_id: agentId ?? null,
      channel_order_id: channelOrderId,
      bc_order_id: bcResult.orderId,
      order_type: 'sim',
      total_amount: totalAmount ?? null,
      order_status: 'processing',
      comment: comment ?? null,
    })
    .select()
    .single()

  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 })

  const bcSub = bcResult.subOrderList[0]
  const { error: itemErr } = await supabase.from('order_items').insert({
    order_id: order.id,
    channel_sub_order_id: channelSubOrderId,
    bc_sub_order_id: bcSub?.subOrderId ?? null,
    sku_id: skuId,
    copies: effectiveCopies,
    number: iccids.length,
    unit_price: unitPrice ?? null,
    iccid: iccids,
  })

  if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 })

  return NextResponse.json({ order, channelOrderId, bcOrderId: bcResult.orderId })
}
