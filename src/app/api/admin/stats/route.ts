import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createAdminClient()
  const [products, orders, agents] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('agents').select('id', { count: 'exact', head: true }),
  ])
  return NextResponse.json({
    products: products.count ?? 0,
    orders: orders.count ?? 0,
    agents: agents.count ?? 0,
  })
}
