import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCardExpiry } from '@/lib/billionconnect'

// POST /api/agent/operations/iccid
// Body: { agent_id, iccids: string[] }
// 限制只能查該代理商的 ICCID
export async function POST(req: Request) {
  const { agent_id, iccids } = await req.json().catch(() => ({}))

  if (!agent_id) return NextResponse.json({ error: 'agent_id required' }, { status: 400 })
  if (!Array.isArray(iccids) || iccids.length === 0) return NextResponse.json({ error: '請提供 ICCID' }, { status: 400 })
  if (iccids.length > 100) return NextResponse.json({ error: '單次最多查詢 100 筆' }, { status: 400 })

  const trimmed = iccids.map((s: string) => s.trim()).filter(Boolean)
  const supabase = createAdminClient()

  // 取得代理商擁有的 ICCID
  const { data: agentOrders } = await supabase.from('orders').select('id').eq('agent_id', agent_id)
  const orderIds = agentOrders?.map(o => o.id) ?? []

  const allowedIccids = new Set<string>()
  if (orderIds.length > 0) {
    const { data: items } = await supabase.from('order_items').select('iccid').in('order_id', orderIds)
    items?.forEach(it => { if (Array.isArray(it.iccid)) it.iccid.forEach((id: string) => allowedIccids.add(id)) })
    const { data: profiles } = await supabase.from('esim_profiles').select('iccid').in('order_id', orderIds)
    profiles?.forEach(p => allowedIccids.add(p.iccid))
  }

  // 過濾只屬於代理商的 ICCID
  const allowed = trimmed.filter(id => allowedIccids.has(id))
  const denied = trimmed.filter(id => !allowedIccids.has(id))

  if (allowed.length === 0) {
    return NextResponse.json({ items: denied.map(id => ({ iccid: id, error: '此 ICCID 不屬於您' })) })
  }

  let bcItems: any[] = []
  try {
    bcItems = await getCardExpiry(allowed)
    if (!Array.isArray(bcItems)) bcItems = [bcItems]
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }

  const items = [
    ...bcItems.map((bc: any) => ({
      iccid: bc.iccid,
      type: bc.type,
      status: bc.status,
      expiration_date: bc.expirationDate,
      postponed_month: bc.postponedMonth,
      max_delay_month: bc.maxDelayMonth,
      usage_count: bc.usageCount,
    })),
    ...denied.map(id => ({ iccid: id, error: '此 ICCID 不屬於您' })),
  ]

  return NextResponse.json({ items })
}
