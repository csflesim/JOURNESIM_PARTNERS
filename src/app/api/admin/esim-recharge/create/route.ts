import { NextResponse } from 'next/server'
import { createRechargeOrder } from '@/lib/billionconnect'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/admin/esim-recharge/create
// 使用 F007 建立充值訂單
export async function POST(req: Request) {
  const { iccid, skuId, copies, unitPrice } = await req.json().catch(() => ({}))

  if (!iccid?.trim()) return NextResponse.json({ error: '請輸入 ICCID' }, { status: 400 })
  if (!skuId) return NextResponse.json({ error: '請選擇套餐' }, { status: 400 })
  if (!copies || copies < 1) return NextResponse.json({ error: '份數無效' }, { status: 400 })

  const channelOrderId = `FS${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
  const channelSubOrderId = `${channelOrderId}-001`
  const totalAmount = unitPrice > 0 ? String(unitPrice) : undefined

  let bcResult
  try {
    bcResult = await createRechargeOrder({
      channelOrderId,
      ...(totalAmount ? { totalAmount } : {}),
      subOrderList: [{
        channelSubOrderId,
        iccid: [iccid.trim()],
        skuId,
        copies: String(copies),
      }],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? '建立失敗' }, { status: 502 })
  }

  const supabase = createAdminClient()

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      source: 'admin',
      channel_order_id: channelOrderId,
      bc_order_id: bcResult.orderId,
      order_type: 'esim_recharge',
      total_amount: unitPrice > 0 ? unitPrice : null,
      order_status: 'processing',
    })
    .select()
    .single()

  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 })

  const bcSub = bcResult.subOrderList[0]
  const { error: itemErr } = await supabase.from('order_items').insert({
    order_id: order.id,
    channel_sub_order_id: channelSubOrderId,
    bc_sub_order_id: bcSub?.subOrderId ?? null,
    sku_id: skuId,
    copies,
    number: 1,
    unit_price: unitPrice ?? null,
  })

  if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 })

  return NextResponse.json({ order, channelOrderId, bcOrderId: bcResult.orderId })
}
