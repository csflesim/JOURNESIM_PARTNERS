import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/agents
export async function GET() {
  const { data, error } = await supabase
    .from('agents')
    .select(`
      *,
      referrer:referrer_id (id, nickname),
      agent_api_keys (app_key, app_secret, created_at),
      agent_verifications (*)
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ agents: data })
}

// POST /api/admin/agents
export async function POST(req: Request) {
  const body = await req.json()
  const { nickname, email, phone, account_type, password, referrer_id, note } = body

  if (!nickname || !email) {
    return NextResponse.json({ error: '暱稱和 Email 為必填' }, { status: 400 })
  }

  const { data: agent, error } = await supabase
    .from('agents')
    .insert({
      nickname,
      email,
      phone:        phone        ?? '',
      account_type: account_type ?? 'travel_agent',
      password_hash: password   ?? '',
      referrer_id:  referrer_id || null,
      note:         note        ?? '',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 自動產生 API 憑證
  const newKey    = Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b => b.toString(16).padStart(2, '0')).join('')
  const newSecret = Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, '0')).join('')
  await supabase.from('agent_api_keys').insert({ agent_id: agent.id, app_key: newKey, app_secret: newSecret })

  // 建立空的認證資料列
  await supabase.from('agent_verifications').insert({ agent_id: agent.id })

  return NextResponse.json({ agent })
}
