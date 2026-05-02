import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/params/capacities
// 回傳高速流量 + 降速速率兩組參數
export async function GET() {
  const [hfsRes, slRes] = await Promise.all([
    supabase.from('bc_high_flow_sizes').select('*').order('sort_order'),
    supabase.from('bc_speed_limits').select('*').order('sort_order'),
  ])

  if (hfsRes.error) return NextResponse.json({ error: hfsRes.error.message }, { status: 500 })
  if (slRes.error) return NextResponse.json({ error: slRes.error.message }, { status: 500 })

  return NextResponse.json({
    highFlowSizes: hfsRes.data,
    speedLimits: slRes.data,
    totalHighFlow: hfsRes.data?.length ?? 0,
    totalSpeed: slRes.data?.length ?? 0,
  })
}
