import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/accounts
export async function GET() {
  const { data, error } = await supabase
    .from('admin_accounts')
    .select('id, username, role_id, is_active, created_at, admin_roles(name)')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ accounts: data })
}

// POST /api/admin/accounts
export async function POST(req: Request) {
  const { username, role_id, is_active } = await req.json()
  const { data, error } = await supabase
    .from('admin_accounts')
    .insert({ username, role_id, is_active: is_active ?? true })
    .select('id, username, role_id, is_active, created_at, admin_roles(name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ account: data })
}
