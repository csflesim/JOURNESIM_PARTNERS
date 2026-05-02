import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { STATIC_TRANSLATIONS } from '@/lib/translations'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST /api/admin/translations/seed
// Upserts all keys from the static translations file into the DB.
// Existing custom values are NOT overwritten (uses onConflict: ignore).
export async function POST() {
  const rows = Object.entries(STATIC_TRANSLATIONS).map(([key, val]) => ({
    key,
    zh_tw: val['zh-TW'] ?? '',
    zh_cn: val['zh-CN'] ?? '',
    en:    val['en']    ?? '',
    ja:    val['ja']    ?? '',
    ko:    val['ko']    ?? '',
  }))

  const { error } = await supabase
    .from('translations')
    .upsert(rows, { onConflict: 'key', ignoreDuplicates: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, count: rows.length })
}
