import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAfterSaleInfo } from '@/lib/billionconnect'

// GET /api/admin/operations/after-sales
// Params: channel_order_id?, bc_after_sale_id?, iccid?, status?, date_from?, date_to?, page, limit
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const channelOrderId = searchParams.get('channel_order_id')?.trim()
  const bcAfterSaleId = searchParams.get('bc_after_sale_id')?.trim()
  const iccid = searchParams.get('iccid')?.trim()
  const status = searchParams.get('status')
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '20')
  const offset = (page - 1) * limit

  const supabase = createAdminClient()

  let query = supabase
    .from('after_sales')
    .select(
      `id, channel_order_id, channel_sub_order_id, bc_after_sale_id,
       iccid, reason, refund_type, refund_amount, unsubscribe_flow,
       status, comment, created_at,
       orders(bc_order_id, order_type,
         order_items(sku_id, products(name)))`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (channelOrderId) query = query.ilike('channel_order_id', `%${channelOrderId}%`)
  if (bcAfterSaleId) query = query.ilike('bc_after_sale_id', `%${bcAfterSaleId}%`)
  if (iccid) query = query.contains('iccid', [iccid])
  if (status) query = query.eq('status', status)
  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59Z')

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items = (data ?? []).map(row => {
    const order = Array.isArray(row.orders) ? row.orders[0] : row.orders
    const orderItem = Array.isArray(order?.order_items) ? order.order_items[0] : order?.order_items
    const product = Array.isArray(orderItem?.products) ? orderItem.products[0] : orderItem?.products
    return {
      ...row,
      bc_order_id: order?.bc_order_id ?? null,
      order_type: order?.order_type ?? null,
      sku_name: product?.name ?? null,
    }
  })

  return NextResponse.json({ items, total: count ?? 0 })
}

// GET /api/admin/operations/after-sales/detail?bc_after_sale_id=
export async function POST(req: Request) {
  const { bcAfterSaleId } = await req.json().catch(() => ({}))
  if (!bcAfterSaleId) return NextResponse.json({ error: '缺少售後單號' }, { status: 400 })
  try {
    const data = await getAfterSaleInfo(bcAfterSaleId)
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? '查詢失敗' }, { status: 502 })
  }
}
