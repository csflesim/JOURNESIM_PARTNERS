import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PATCH /api/admin/products/toggle
export async function PATCH(request: Request) {
  const { skuId, isActive } = await request.json()

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('products')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('sku_id', skuId)

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
