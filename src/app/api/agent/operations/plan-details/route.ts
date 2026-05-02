import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlanUsage } from '@/lib/billionconnect'

// GET /api/agent/operations/plan-details?agent_id=&iccid=&order_item_id=
// 同 admin 版本但驗證 agent 歸屬
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agent_id')
  const iccid = searchParams.get('iccid')?.trim()
  const orderItemId = searchParams.get('order_item_id')

  if (!agentId) return NextResponse.json({ error: 'agent_id required' }, { status: 400 })
  if (!iccid && !orderItemId) return NextResponse.json({ error: '缺少參數' }, { status: 400 })

  const supabase = createAdminClient()

  let orderItem: Record<string, any> | null = null
  if (orderItemId) {
    const { data } = await supabase
      .from('order_items')
      .select(`id, channel_sub_order_id, bc_sub_order_id, sku_id, copies, number, iccid, plan_status, plan_start_time, plan_end_time,
        orders!inner(id, channel_order_id, bc_order_id, order_type, created_at, user_email, agent_id),
        products(name, type, days, capacity, plan_type)`)
      .eq('id', orderItemId)
      .eq('orders.agent_id', agentId)
      .single()
    orderItem = data
  }

  let esimProfile: Record<string, any> | null = null
  if (iccid) {
    const { data } = await supabase.from('esim_profiles').select('*').eq('iccid', iccid).maybeSingle()
    esimProfile = data
  }

  let bcPlanUsage = null
  if (iccid) {
    try { bcPlanUsage = await getPlanUsage({ iccid }) } catch { /* non-fatal */ }
  }

  return NextResponse.json({ orderItem, esimProfile, bcPlanUsage })
}
