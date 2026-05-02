import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getKycStatus } from '@/lib/billionconnect'

// POST /api/agent/operations/kyc-status
// Body: { agent_id, iccids: string[] }
// 限制只能查詢屬於該代理商的 ICCID
export async function POST(req: Request) {
  const { agent_id, iccids } = await req.json().catch(() => ({}))

  if (!agent_id) return NextResponse.json({ error: 'agent_id required' }, { status: 400 })
  if (!Array.isArray(iccids) || iccids.length === 0) return NextResponse.json({ error: '請提供 ICCID' }, { status: 400 })
  if (iccids.length > 50) return NextResponse.json({ error: '單次最多查詢 50 筆' }, { status: 400 })

  const supabase = createAdminClient()

  // 取得代理商所有訂單 ID
  const { data: agentOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('agent_id', agent_id)
  const orderIds = agentOrders?.map(o => o.id) ?? []

  // 取得代理商擁有的 ICCID
  const allowedIccids = new Set<string>()
  if (orderIds.length > 0) {
    const { data: items } = await supabase
      .from('order_items')
      .select('iccid')
      .in('order_id', orderIds)
    items?.forEach(it => {
      if (Array.isArray(it.iccid)) it.iccid.forEach((id: string) => allowedIccids.add(id))
    })

    const { data: profiles } = await supabase
      .from('esim_profiles')
      .select('iccid')
      .in('order_id', orderIds)
    profiles?.forEach(p => allowedIccids.add(p.iccid))
  }

  // 只查詢屬於該代理商的 ICCID
  const results = await Promise.allSettled(
    iccids.map(async (iccid: string) => {
      const trimmed = iccid.trim()
      if (!allowedIccids.has(trimmed)) {
        return { iccid: trimmed, status: null, expiryTime: null, error: '此 ICCID 不屬於您' }
      }
      const data = await getKycStatus(trimmed)
      return { iccid: trimmed, status: data.status, expiryTime: data.expiryTime ?? null, error: null }
    })
  )

  const items = results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { iccid: iccids[i].trim(), status: null, expiryTime: null, error: String((r as PromiseRejectedResult).reason) }
  )

  return NextResponse.json({ items })
}
