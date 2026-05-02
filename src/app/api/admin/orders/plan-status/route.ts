import { NextResponse } from 'next/server'
import { getPlanUsage } from '@/lib/billionconnect'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/orders/plan-status?iccid=&channel_order_id=
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const iccid = searchParams.get('iccid')?.trim()
  const channelOrderId = searchParams.get('channel_order_id')?.trim()

  if (!iccid) return NextResponse.json({ error: '缺少 ICCID' }, { status: 400 })

  // F012 plan usage
  let bcPlan: any = null
  try {
    const results = await getPlanUsage({ iccid })
    const orderData = Array.isArray(results) ? results[0] : results
    // Find the sub matching this iccid's order
    bcPlan = orderData
  } catch {
    // non-fatal
  }

  // After-sale status from DB
  const supabase = createAdminClient()
  let afterSaleStatus: string | null = null
  if (channelOrderId) {
    const { data } = await supabase
      .from('after_sales')
      .select('status')
      .eq('channel_order_id', channelOrderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    afterSaleStatus = data?.status ?? null
  }

  return NextResponse.json({ bcPlan, afterSaleStatus })
}
