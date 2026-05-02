import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ALL_PERMISSION_KEYS } from '@/lib/permissions'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/roles/[id]/permissions
// Returns { permissions: Record<PermissionKey, boolean> }
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabase
    .from('admin_role_permissions')
    .select('permission_key, enabled')
    .eq('role_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build full map; keys not yet in DB default to true (all-access for admins)
  const map: Record<string, boolean> = {}
  for (const key of ALL_PERMISSION_KEYS) map[key] = true
  for (const row of data ?? []) map[row.permission_key] = row.enabled

  return NextResponse.json({ permissions: map })
}

// PATCH /api/admin/roles/[id]/permissions
// body: { permission_key, enabled }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { permission_key, enabled } = await req.json()

  const { error } = await supabase
    .from('admin_role_permissions')
    .upsert({ role_id: id, permission_key, enabled }, { onConflict: 'role_id,permission_key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
