import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PATCH /api/admin/agents/[id]
// 可同時更新基本資料 + 認證資料（body 中帶 verification 物件）
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  const { verification, ...basicFields } = body

  // 更新基本資料
  const allowed = ['avatar_url','nickname','phone','email','password_hash','account_type',
                   'verification_status','account_status','referrer_id','note']
  const update: Record<string, unknown> = {}
  for (const k of allowed) {
    if (basicFields[k] !== undefined) update[k] = basicFields[k]
  }

  if (Object.keys(update).length > 0) {
    const { error } = await supabase.from('agents').update(update).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 更新認證資料
  if (verification && Object.keys(verification).length > 0) {
    const { error } = await supabase
      .from('agent_verifications')
      .upsert({ agent_id: id, ...verification, updated_at: new Date().toISOString() }, { onConflict: 'agent_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/admin/agents/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await supabase.from('agents').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
