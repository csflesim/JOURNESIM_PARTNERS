import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/params/operators?mcc=xxx
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const mcc = searchParams.get('mcc')

  let query = supabase
    .from('bc_operators')
    .select('*')
    .order('country_name')
    .order('operator')

  if (mcc) query = query.eq('mcc', mcc)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ operators: data, total: data?.length ?? 0 })
}
