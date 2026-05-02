import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/params/countries
export async function GET() {
  const { data, error } = await supabase
    .from('bc_countries')
    .select('*')
    .order('continent')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ countries: data, total: data?.length ?? 0 })
}
