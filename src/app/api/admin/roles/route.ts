import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/roles  — list roles with account count
export async function GET() {
  const { data: roles, error } = await supabase
    .from('admin_roles')
    .select('id, name, description, created_at')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Count accounts per role
  const { data: counts } = await supabase
    .from('admin_accounts')
    .select('role_id')

  const countMap: Record<string, number> = {}
  for (const row of counts ?? []) {
    if (row.role_id) countMap[row.role_id] = (countMap[row.role_id] ?? 0) + 1
  }

  const result = (roles ?? []).map(r => ({ ...r, user_count: countMap[r.id] ?? 0 }))
  return NextResponse.json({ roles: result })
}

// POST /api/admin/roles  — create role
export async function POST(req: Request) {
  const { name, description } = await req.json()
  const { data, error } = await supabase
    .from('admin_roles')
    .insert({ name, description: description ?? '' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ role: data })
}
