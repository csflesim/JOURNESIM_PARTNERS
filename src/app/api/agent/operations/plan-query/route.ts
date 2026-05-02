import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlanUsage } from '@/lib/billionconnect'

// GET /api/agent/operations/plan-query?agent_id=xxx&iccid=&...
// 跟 admin 版本邏輯一致，但限制只能查該代理商的訂單
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agent_id')
  if (!agentId) return NextResponse.json({ error: 'agent_id required' }, { status: 400 })

  const iccid = searchParams.get('iccid')?.trim()
  const planStatus = searchParams.get('plan_status')
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const offset = (page - 1) * limit

  const supabase = createAdminClient()

  // 取得該代理商所有訂單 ID
  const { data: agentOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('agent_id', agentId)
  const agentOrderIds = agentOrders?.map(o => o.id) ?? []
  if (agentOrderIds.length === 0) return NextResponse.json({ items: [], total: 0 })

  // ── ICCID 搜尋：先驗證是否屬於代理商 ──
  if (iccid) {
    // 確認此 ICCID 屬於代理商
    const { data: itemCheck } = await supabase
      .from('order_items')
      .select('id, order_id')
      .in('order_id', agentOrderIds)
      .contains('iccid', [iccid])
      .maybeSingle()

    const { data: profileCheck } = await supabase
      .from('esim_profiles')
      .select('order_item_id, order_id')
      .eq('iccid', iccid)
      .in('order_id', agentOrderIds)
      .maybeSingle()

    if (!itemCheck && !profileCheck) {
      return NextResponse.json({ items: [], total: 0 }) // 不屬於此代理商
    }

    // 呼叫 BC F012
    let bcResults: any[] = []
    try {
      const result = await getPlanUsage({ iccid })
      bcResults = Array.isArray(result) ? result : [result]
    } catch { /* ignore */ }

    const orderItemId = profileCheck?.order_item_id ?? itemCheck?.id ?? null
    const orderId = profileCheck?.order_id ?? itemCheck?.order_id ?? null

    let localOrder: any = null
    if (orderId) {
      const { data } = await supabase.from('orders').select('id, channel_order_id, bc_order_id, order_type, created_at').eq('id', orderId).single()
      localOrder = data
    }
    let localItem: any = null
    if (orderItemId) {
      const { data } = await supabase.from('order_items').select('id, channel_sub_order_id, bc_sub_order_id, sku_id, plan_status, plan_start_time, plan_end_time, iccid, products(name, type)').eq('id', orderItemId).single()
      localItem = data
    }

    if (bcResults.length > 0) {
      const bcOrder = bcResults[0]
      const items = bcOrder.subOrderList?.map((sub: any) => ({
        id: localItem?.id ?? sub.subOrderId ?? iccid,
        channel_sub_order_id: localItem?.channel_sub_order_id ?? sub.channelSubOrderId ?? '',
        bc_sub_order_id: sub.subOrderId ?? localItem?.bc_sub_order_id ?? null,
        sku_id: sub.skuId ?? localItem?.sku_id ?? '',
        sku_name: sub.skuName ?? (Array.isArray(localItem?.products) ? localItem.products[0]?.name : localItem?.products?.name) ?? sub.skuId,
        order_type: localOrder?.order_type ?? 'esim',
        iccids: localItem?.iccid ?? [iccid],
        plan_status: sub.planStatus ?? localItem?.plan_status ?? null,
        plan_start_time: sub.planStartTime ?? localItem?.plan_start_time ?? null,
        plan_end_time: sub.planEndTime ?? localItem?.plan_end_time ?? null,
        channel_order_id: localOrder?.channel_order_id ?? bcOrder.channelOrderId ?? '',
        bc_order_id: localOrder?.bc_order_id ?? bcOrder.orderId ?? null,
        order_created_at: localOrder?.created_at ?? null,
        has_esim_profile: !!profileCheck,
        matched_iccid: iccid,
        total_traffic: sub.totalTraffic,
        remaining_traffic: sub.remainingTraffic,
        remaining_days: sub.remainingDays,
        total_days: sub.totalDays,
      })) ?? []
      const filtered = planStatus ? items.filter((i: any) => i.plan_status === planStatus) : items
      return NextResponse.json({ items: filtered, total: filtered.length })
    }

    if (localItem && localOrder) {
      const product = Array.isArray(localItem.products) ? localItem.products[0] : localItem.products
      return NextResponse.json({ items: [{ id: localItem.id, channel_sub_order_id: localItem.channel_sub_order_id, bc_sub_order_id: localItem.bc_sub_order_id, sku_id: localItem.sku_id, sku_name: product?.name ?? localItem.sku_id, order_type: localOrder.order_type, iccids: localItem.iccid ?? [iccid], plan_status: localItem.plan_status, plan_start_time: localItem.plan_start_time, plan_end_time: localItem.plan_end_time, channel_order_id: localOrder.channel_order_id, bc_order_id: localOrder.bc_order_id, order_created_at: localOrder.created_at, has_esim_profile: !!profileCheck, matched_iccid: iccid }], total: 1 })
    }
    return NextResponse.json({ items: [], total: 0 })
  }

  // ── 無 ICCID：本地 DB 搜尋，限制代理商訂單 ──
  let query = supabase
    .from('order_items')
    .select(
      `id, channel_sub_order_id, bc_sub_order_id, sku_id, copies, number,
       iccid, plan_status, plan_start_time, plan_end_time, created_at,
       orders!inner(id, channel_order_id, bc_order_id, order_type, created_at, agent_id),
       products(name, type)`,
      { count: 'exact' }
    )
    .in('order_id', agentOrderIds)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (planStatus) query = query.eq('plan_status', planStatus)
  if (dateFrom) query = query.gte('orders.created_at', dateFrom)
  if (dateTo) query = query.lte('orders.created_at', dateTo + 'T23:59:59Z')

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const allItemIds = (data ?? []).map(item => item.id)
  const profileMap: Record<string, boolean> = {}
  if (allItemIds.length > 0) {
    const { data: profiles } = await supabase.from('esim_profiles').select('order_item_id').in('order_item_id', allItemIds)
    profiles?.forEach(p => { if (p.order_item_id) profileMap[p.order_item_id] = true })
  }

  const items = (data ?? []).map(item => {
    const order = Array.isArray(item.orders) ? item.orders[0] : item.orders
    const product = Array.isArray(item.products) ? item.products[0] : item.products
    return { id: item.id, channel_sub_order_id: item.channel_sub_order_id, bc_sub_order_id: item.bc_sub_order_id, sku_id: item.sku_id, sku_name: product?.name ?? item.sku_id, order_type: order?.order_type ?? '', iccids: item.iccid ?? [], plan_status: item.plan_status, plan_start_time: item.plan_start_time, plan_end_time: item.plan_end_time, channel_order_id: order?.channel_order_id ?? '', bc_order_id: order?.bc_order_id ?? null, order_created_at: order?.created_at ?? item.created_at, has_esim_profile: profileMap[item.id] ?? false, matched_iccid: null }
  })

  return NextResponse.json({ items, total: count ?? 0 })
}
