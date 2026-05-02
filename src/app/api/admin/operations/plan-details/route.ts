import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlanUsage } from '@/lib/billionconnect'

// GET /api/admin/operations/plan-details?iccid=&order_item_id=
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const iccid = searchParams.get('iccid')?.trim()
  const orderItemId = searchParams.get('order_item_id')

  if (!iccid && !orderItemId) {
    return NextResponse.json({ error: '缺少參數' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Fetch order_item with order + product info
  let orderItem: Record<string, any> | null = null
  if (orderItemId) {
    const { data } = await supabase
      .from('order_items')
      .select(`
        id, channel_sub_order_id, bc_sub_order_id, sku_id, copies, number,
        iccid, plan_status, plan_start_time, plan_end_time,
        orders(id, channel_order_id, bc_order_id, order_type, created_at, user_email, agent_id),
        products(name, type, days, capacity, plan_type)
      `)
      .eq('id', orderItemId)
      .single()
    orderItem = data
  }

  // Fetch esim_profile if iccid provided
  let esimProfile: Record<string, any> | null = null
  if (iccid) {
    const { data } = await supabase
      .from('esim_profiles')
      .select('*')
      .eq('iccid', iccid)
      .maybeSingle()
    esimProfile = data
  }

  // Fetch F012 plan usage from BC
  let bcPlanUsage = null
  if (iccid) {
    try {
      const results = await getPlanUsage({ iccid })
      bcPlanUsage = results
    } catch {
      // BC API failure is non-fatal
    }
  }

  return NextResponse.json({ orderItem, esimProfile, bcPlanUsage })
}
