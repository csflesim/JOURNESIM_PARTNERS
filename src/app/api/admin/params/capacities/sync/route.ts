import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** 將 KB 字串轉換為人類可讀格式 */
function formatKB(kb: string): string {
  const val = parseFloat(kb)
  if (isNaN(val) || val === -1) return '無限'
  if (val === 0) return '0'
  if (val >= 1048576) return `${(val / 1048576).toFixed(val % 1048576 === 0 ? 0 : 1)} GB`
  if (val >= 1024) return `${(val / 1024).toFixed(val % 1024 === 0 ? 0 : 1)} MB`
  return `${val} KB`
}

/** 將 kbps 轉換為人類可讀格式 */
function formatSpeed(kbps: string): string {
  const val = parseFloat(kbps)
  if (isNaN(val) || val === -1) return '不限速'
  if (val === 0) return '斷網'
  if (val >= 1024) return `${(val / 1024).toFixed(val % 1024 === 0 ? 0 : 1)} Mbps`
  return `${val} kbps`
}

// POST /api/admin/params/capacities/sync
// 從 products 表提取 high_flow_size 和 limit_flow_speed
export async function POST() {
  const { data: products, error: fetchErr } = await supabase
    .from('products')
    .select('high_flow_size, limit_flow_speed')

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  if (!products || products.length === 0) {
    return NextResponse.json({ error: '尚無商品資料，請先同步商品' }, { status: 400 })
  }

  // 提取唯一的 highFlowSize
  const hfsSet = new Set<string>()
  const slSet = new Set<string>()
  for (const p of products) {
    if (p.high_flow_size) hfsSet.add(p.high_flow_size)
    if (p.limit_flow_speed) slSet.add(p.limit_flow_speed)
  }

  // highFlowSize 排序並寫入
  const hfsSorted = Array.from(hfsSet).sort((a, b) => parseFloat(a) - parseFloat(b))
  const hfsRows = hfsSorted.map((v, idx) => ({
    high_flow_size: v,
    label: formatKB(v),
    sort_order: idx,
    synced_at: new Date().toISOString(),
  }))

  // limitFlowSpeed 排序並寫入
  const slSorted = Array.from(slSet).sort((a, b) => parseFloat(a) - parseFloat(b))
  const slRows = slSorted.map((v, idx) => ({
    limit_flow_speed: v,
    label: formatSpeed(v),
    sort_order: idx,
    synced_at: new Date().toISOString(),
  }))

  const [hfsRes, slRes] = await Promise.all([
    hfsRows.length > 0
      ? supabase.from('bc_high_flow_sizes').upsert(hfsRows, { onConflict: 'high_flow_size' })
      : Promise.resolve({ error: null }),
    slRows.length > 0
      ? supabase.from('bc_speed_limits').upsert(slRows, { onConflict: 'limit_flow_speed' })
      : Promise.resolve({ error: null }),
  ])

  if (hfsRes.error) return NextResponse.json({ error: hfsRes.error.message }, { status: 500 })
  if (slRes.error) return NextResponse.json({ error: slRes.error.message }, { status: 500 })

  return NextResponse.json({
    syncedHighFlow: hfsRows.length,
    syncedSpeed: slRows.length,
  })
}
