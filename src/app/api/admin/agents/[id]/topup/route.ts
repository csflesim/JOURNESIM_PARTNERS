import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/admin/agents/[id]/topup
// body: { amount, note, operated_by }
// amount 正數=充值, 負數=扣款
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { amount, note, operated_by } = await req.json()
  const amt = Number(amount)
  if (!amt || isNaN(amt)) {
    return NextResponse.json({ error: '金額不得為零' }, { status: 400 })
  }

  // 記錄充值紀錄
  const { error: logError } = await supabase
    .from('agent_topup_logs')
    .insert({ agent_id: id, amount: amt, note: note ?? '', operated_by: operated_by ?? '' })

  if (logError) return NextResponse.json({ error: logError.message }, { status: 500 })

  // 更新餘額（用 rpc 或 read-modify-write）
  const { data: agent, error: readErr } = await supabase
    .from('agents')
    .select('balance')
    .eq('id', id)
    .single()

  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })

  const newBalance = Number(agent.balance) + amt
  const { data, error } = await supabase
    .from('agents')
    .update({ balance: newBalance })
    .eq('id', id)
    .select('id, balance')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ balance: data.balance })
}

// GET /api/admin/agents/[id]/topup → 充值紀錄列表
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabase
    .from('agent_topup_logs')
    .select('*')
    .eq('agent_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ logs: data })
}
