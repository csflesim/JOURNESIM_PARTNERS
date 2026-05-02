import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ESIM_SIM_TYPES = ['110', '111', '210', '211', '212', '220', '221', '230', '250', '311', '3105', '3106', '3101', '3102', '3103', '3104', '3201', '3202', '3211', '3212']

// GET /api/agent/plans?agent_id=xxx&types=110,111 or &acceleration=true
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agent_id')
  const types = searchParams.get('types')?.split(',')
  const acceleration = searchParams.get('acceleration') === 'true'

  if (!agentId) {
    return NextResponse.json({ error: 'agent_id is required' }, { status: 400 })
  }

  // 1. 取得代理商被授權且啟用的商品 SKU
  const { data: agentProducts, error: apErr } = await supabase
    .from('agent_products')
    .select('sku_id, sell_prices, is_active')
    .eq('agent_id', agentId)
    .eq('is_active', true)

  if (apErr) return NextResponse.json({ error: apErr.message }, { status: 500 })
  if (!agentProducts?.length) return NextResponse.json({ success: true, products: [] })

  const skuIds = agentProducts.map(ap => ap.sku_id)

  // 2. 查詢商品，加上類型過濾
  let query = supabase
    .from('products')
    .select('*')
    .in('sku_id', skuIds)
    .eq('is_active', true)
    .order('name')

  if (acceleration) {
    query = query.not('type', 'in', `(${ESIM_SIM_TYPES.join(',')})`)
  } else if (types && types.length > 0) {
    query = query.in('type', types)
  }

  const { data: products, error: pErr } = await query

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  // 3. 附上代理商售價
  const sellMap = new Map(agentProducts.map(ap => [ap.sku_id, ap.sell_prices]))
  const result = (products ?? []).map(p => ({
    ...p,
    sell_prices: sellMap.get(p.sku_id) ?? [],
  }))

  return NextResponse.json({ success: true, products: result })
}
