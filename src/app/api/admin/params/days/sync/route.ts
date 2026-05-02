import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/admin/params/days/sync
// 從已同步的 products 表中提取所有唯一天數，寫入 bc_days
export async function POST() {
  const { data: products, error: fetchErr } = await supabase
    .from('products')
    .select('days')

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  if (!products || products.length === 0) {
    return NextResponse.json({ error: '尚無商品資料，請先同步商品' }, { status: 400 })
  }

  // 提取所有唯一天數
  const daysSet = new Set<string>()
  for (const p of products) {
    if (p.days) daysSet.add(p.days)
  }

  if (daysSet.size === 0) {
    return NextResponse.json({ error: '商品中無天數資料' }, { status: 400 })
  }

  // 排序並生成 label
  const sorted = Array.from(daysSet).sort((a, b) => parseInt(a) - parseInt(b))

  const rows = sorted.map((d, idx) => ({
    days: d,
    label: `${d} 天`,
    sort_order: idx,
    synced_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('bc_days')
    .upsert(rows, { onConflict: 'days' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ synced: rows.length })
}
