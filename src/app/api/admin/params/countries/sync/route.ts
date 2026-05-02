import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/admin/params/countries/sync
// 從已同步的 products 表中提取國家資訊，寫入 bc_countries
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

  // 從所有商品的 countries JSONB 欄位提取唯一國家
  const merged = new Map<string, { mcc: string; name: string; continent: string; flag_url: string | null }>()

  for (const product of products) {
    const countries = product.countries as Array<{ mcc: string; name: string }> | null
    if (!countries) continue
    for (const c of countries) {
      if (!c.mcc) continue
      if (!merged.has(c.mcc)) {
        merged.set(c.mcc, {
          mcc: c.mcc,
          name: c.name ?? '',
          continent: '', // 商品資料不含洲別，保留空值或由既有資料保留
          flag_url: null,
        })
      }
    }
  }

  if (merged.size === 0) {
    return NextResponse.json({ error: '商品中無國家資料' }, { status: 400 })
  }

  const rows = Array.from(merged.values()).map(c => ({
    ...c,
    synced_at: new Date().toISOString(),
  }))

  // 使用 upsert，continent 和 flag_url 若已有資料則保留（不覆蓋空值）
  // 先取得既有資料以保留 continent / flag_url
  const { data: existing } = await supabase
    .from('bc_countries')
    .select('mcc, continent, flag_url')

  const existingMap = new Map<string, { continent: string; flag_url: string | null }>()
  if (existing) {
    for (const e of existing) {
      existingMap.set(e.mcc, { continent: e.continent, flag_url: e.flag_url })
    }
  }

  const finalRows = rows.map(r => {
    const prev = existingMap.get(r.mcc)
    return {
      ...r,
      continent: prev?.continent || r.continent,
      flag_url: prev?.flag_url || r.flag_url,
    }
  })

  const { error } = await supabase
    .from('bc_countries')
    .upsert(finalRows, { onConflict: 'mcc' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ synced: finalRows.length })
}
