import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/members
export async function GET() {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ members: data })
}

// POST /api/admin/members
export async function POST(req: Request) {
  const body = await req.json()
  const { data, error } = await supabase
    .from('members')
    .insert({
      email: body.email,
      phone: body.phone ?? '',
      display_name: body.display_name ?? '',
      auth_provider: body.auth_provider ?? 'email',
      is_active: body.is_active ?? true,
      note: body.note ?? '',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ member: data })
}
