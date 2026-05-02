import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/agent-products?agent_id=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agent_id')

  if (!agentId) {
    return NextResponse.json({ error: 'agent_id is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('agent_products')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data })
}

// POST /api/admin/agent-products  (batch assign)
// body: { agent_id, items: [{ sku_id, sell_prices: [{copies, price}] }] }
export async function POST(req: Request) {
  const { agent_id, items } = await req.json()

  if (!agent_id || !items?.length) {
    return NextResponse.json({ error: 'agent_id and items required' }, { status: 400 })
  }

  const rows = items.map((it: { sku_id: string; sell_prices: { copies: string; price: number }[] }) => ({
    agent_id,
    sku_id: it.sku_id,
    sell_prices: it.sell_prices,
    is_active: true,
  }))

  const { data, error } = await supabase
    .from('agent_products')
    .upsert(rows, { onConflict: 'agent_id,sku_id' })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data })
}
