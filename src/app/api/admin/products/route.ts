import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/products?types=230,250&acceleration=true
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const types = searchParams.get('types')?.split(',')
  const acceleration = searchParams.get('acceleration') === 'true'

  const supabase = createAdminClient()
  let query = supabase.from('products').select('*').order('name')

  if (acceleration) {
    // 加速包：非 eSIM 非 SIM 主商品類型
    const esimSimTypes = ['110','111','210','211','212','220','221','230','250','311']
    query = query.not('type', 'in', `(${esimSimTypes.join(',')})`)
  } else if (types && types.length > 0) {
    query = query.in('type', types)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, products: data })
}
