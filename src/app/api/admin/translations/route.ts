import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/translations
export async function GET() {
  const { data, error } = await supabase
    .from('translations')
    .select('key, zh_tw, zh_cn, en, ja, ko')
    .order('key')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ translations: data })
}

// PATCH /api/admin/translations
// body: { key, lang, value }
export async function PATCH(req: Request) {
  const { key, lang, value } = await req.json()
  const col = lang.replace('-', '_').toLowerCase() // zh-TW → zh_tw

  const { error } = await supabase
    .from('translations')
    .update({ [col]: value, updated_at: new Date().toISOString() })
    .eq('key', key)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
