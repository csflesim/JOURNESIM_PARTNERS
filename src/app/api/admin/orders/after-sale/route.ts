import { NextResponse } from 'next/server'
import { createAfterSale } from '@/lib/billionconnect'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/admin/orders/after-sale
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const {
    orderId,
    channelOrderId,
    channelSubOrderId,   // required by BC F017
    reason,              // BC reason code e.g. "20"
    iccid,               // string[]
    refundType,          // '0' 自動退款 | '1' 協定退款
    refundAmount,
    unSubscribeFlow,
    comment,
  } = body

  if (!channelOrderId || !channelSubOrderId || !reason || !iccid?.length || !refundType) {
    return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
  }

  let bcResult
  try {
    bcResult = await createAfterSale({
      channelOrderId,
      channelSubOrderId,
      reason,
      iccid,
      refundType,
      ...(refundAmount ? { refundAmount: String(refundAmount) } : {}),
      ...(unSubscribeFlow ? { unSubscribeFlow } : {}),
      ...(comment ? { comment } : {}),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? '售後申請失敗' }, { status: 502 })
  }

  const supabase = createAdminClient()
  await supabase.from('after_sales').insert({
    order_id: orderId ?? null,
    channel_order_id: channelOrderId,
    channel_sub_order_id: channelSubOrderId,
    bc_after_sale_id: bcResult.afterSaleId,
    iccid,
    reason,
    refund_type: refundType,
    refund_amount: refundAmount ? parseFloat(refundAmount) : null,
    unsubscribe_flow: unSubscribeFlow ?? null,
    comment: comment ?? null,
    status: 'pending',
  })

  return NextResponse.json({ afterSaleId: bcResult.afterSaleId })
}
