import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/admin/agents/[id]/api-key  → 重新產生 API 憑證
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // 產生新的 key/secret（hex 字串）
  const newKey    = Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => b.toString(16).padStart(2, '0')).join('')
  const newSecret = Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, '0')).join('')

  const { data, error } = await supabase
    .from('agent_api_keys')
    .upsert(
      { agent_id: id, app_key: newKey, app_secret: newSecret, created_at: new Date().toISOString() },
      { onConflict: 'agent_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ apiKey: data })
}
