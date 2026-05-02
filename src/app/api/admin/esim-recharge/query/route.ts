import { NextResponse } from 'next/server'
import { getEsimRechargeProducts } from '@/lib/billionconnect'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/admin/esim-recharge/query
// 輸入 ICCID，呼叫 F052 取得匹配 SKU，再從 DB 查詢完整商品資料
export async function POST(req: Request) {
  const { iccid } = await req.json().catch(() => ({}))

  if (!iccid?.trim()) {
    return NextResponse.json({ error: '請輸入 ICCID' }, { status: 400 })
  }

  let result
  try {
    result = await getEsimRechargeProducts(iccid.trim())
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? '查詢失敗' }, { status: 502 })
  }

  const skuIds: string[] = result.skuId ?? []

  if (skuIds.length === 0) {
    return NextResponse.json({
      products: [],
      iccidValidity: result.iccidValidity ?? null,
    })
  }

  const supabase = createAdminClient()
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .in('sku_id', skuIds)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    products: products ?? [],
    iccidValidity: result.iccidValidity ?? null,
  })
}
