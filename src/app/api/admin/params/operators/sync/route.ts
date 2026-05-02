import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/admin/params/operators/sync
// 從已同步的 products 表中提取運營商資訊，寫入 bc_operators
export async function POST() {
  const { data: products, error: fetchErr } = await supabase
    .from('products')
    .select('countries')

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  if (!products || products.length === 0) {
    return NextResponse.json({ error: '尚無商品資料，請先同步商品' }, { status: 400 })
  }

  // mcc+operator+network 為唯一鍵
  const merged = new Map<string, {
    mcc: string
    country_name: string
    operator: string
    network: string
    priority: string
  }>()

  for (const product of products) {
    const countries = product.countries as Array<{
      mcc: string
      name: string
      operatorInfo?: Array<{ operator: string; network: string; priority: string }>
    }> | null
    if (!countries) continue

    for (const country of countries) {
      if (!country.operatorInfo) continue
      for (const op of country.operatorInfo) {
        const key = `${country.mcc}||${op.operator}||${op.network ?? ''}`
        if (!merged.has(key)) {
          merged.set(key, {
            mcc: country.mcc,
            country_name: country.name ?? '',
            operator: op.operator,
            network: op.network ?? '',
            priority: op.priority ?? '',
          })
        }
      }
    }
  }

  if (merged.size === 0) {
    return NextResponse.json({ error: '商品中無運營商資料' }, { status: 400 })
  }

  const rows = Array.from(merged.values()).map(o => ({
    ...o,
    synced_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('bc_operators')
    .upsert(rows, { onConflict: 'mcc, operator, network' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ synced: rows.length })
}
