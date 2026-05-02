import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

const APP_SECRET = process.env.BILLIONCONNECT_APP_SECRET!

// ── Signature verification ────────────────────────────────────────────────
// BC signs incoming webhooks the same way we sign outgoing calls:
// MD5(APP_SECRET + raw_body_text)
function verifySign(rawBody: string, signHeader: string | null): boolean {
  if (!signHeader) return false
  const expected = crypto.createHash('md5').update(APP_SECRET + rawBody, 'utf8').digest('hex')
  return expected === signHeader
}

// ── Success response ──────────────────────────────────────────────────────
function ok() {
  return NextResponse.json({ tradeCode: '1000', tradeMsg: '成功' })
}

// ── Handler: N013 充值訂單結果 ─────────────────────────────────────────────
async function handleN013(tradeData: any, supabase: ReturnType<typeof createAdminClient>) {
  const { orderId, channelOrderId, status } = tradeData
  if (!channelOrderId) return

  const orderStatus = status === '0' ? 'success' : 'failed'

  const { error } = await supabase
    .from('orders')
    .update({
      order_status: orderStatus,
      ...(orderId ? { bc_order_id: orderId } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('channel_order_id', channelOrderId)

  if (error) throw new Error(`N013 order update failed: ${error.message}`)
}

// ── Handler: N001 訂單發貨通知 ────────────────────────────────────────────
async function handleN001(tradeData: any, supabase: ReturnType<typeof createAdminClient>) {
  const { orderId, channelOrderId, subOrderList } = tradeData
  if (!channelOrderId || !Array.isArray(subOrderList)) return

  // Update order status to success
  await supabase
    .from('orders')
    .update({
      order_status: 'success',
      ...(orderId ? { bc_order_id: orderId } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('channel_order_id', channelOrderId)

  // Update each sub-order's ICCID list
  for (const sub of subOrderList) {
    const { subOrderId, iccid } = sub
    if (!subOrderId || !Array.isArray(iccid)) continue

    await supabase
      .from('order_items')
      .update({
        iccid,
        updated_at: new Date().toISOString(),
      })
      .eq('bc_sub_order_id', subOrderId)
  }
}

// ── Handler: N009 eSIM 二維碼通知 ────────────────────────────────────────
async function handleN009(tradeData: any, supabase: ReturnType<typeof createAdminClient>) {
  const { orderId, channelOrderId, subOrderList } = tradeData
  if (!Array.isArray(subOrderList)) return

  // Find the order for order_id / order_item_id
  let orderRow: any = null
  if (channelOrderId) {
    const { data } = await supabase
      .from('orders')
      .select('id')
      .eq('channel_order_id', channelOrderId)
      .single()
    orderRow = data

    // Update order status
    if (orderRow) {
      await supabase
        .from('orders')
        .update({
          order_status: 'success',
          ...(orderId ? { bc_order_id: orderId } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderRow.id)
    }
  }

  for (const sub of subOrderList) {
    const { iccid, uid, qrCodeContent, confirmationCode, apn, apnUsername, apnPassword, pin, puk, msisdn, validTime, rechargeableESIM } = sub
    if (!iccid) continue

    // Find matching order_item
    let orderItemId: string | null = null
    if (orderRow) {
      const { data: item } = await supabase
        .from('order_items')
        .select('id, bc_sub_order_id')
        .eq('order_id', orderRow.id)
        .maybeSingle()
      orderItemId = item?.id ?? null

      // Update order_items.iccid if needed
      if (item) {
        await supabase
          .from('order_items')
          .update({ iccid: [iccid], updated_at: new Date().toISOString() })
          .eq('id', item.id)
      }
    }

    // Upsert esim_profiles
    await supabase
      .from('esim_profiles')
      .upsert({
        ...(orderRow ? { order_id: orderRow.id } : {}),
        ...(orderItemId ? { order_item_id: orderItemId } : {}),
        iccid,
        uid: uid ?? null,
        qr_code_content: qrCodeContent ?? null,
        confirmation_code: confirmationCode ?? null,
        apn: apn ?? null,
        apn_username: apnUsername ?? null,
        apn_password: apnPassword ?? null,
        pin: pin ?? null,
        puk: puk ?? null,
        msisdn: msisdn ?? null,
        valid_time: validTime ?? null,
        rechargeable_esim: rechargeableESIM ?? '0',
        profile_status: 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'iccid' })
  }
}

// ── Handler: N002 流量開始 / N003 流量結束 ───────────────────────────────
async function handleN002N003(tradeType: string, tradeData: any, supabase: ReturnType<typeof createAdminClient>) {
  const items = Array.isArray(tradeData) ? tradeData : [tradeData]

  for (const item of items) {
    const { channelSubOrderId, iccid, startTime, endTime } = item
    if (!channelSubOrderId) continue

    const planStatus = tradeType === 'N002' ? '1' : '2'
    await supabase
      .from('order_items')
      .update({
        plan_status: planStatus,
        ...(startTime ? { plan_start_time: startTime } : {}),
        ...(endTime ? { plan_end_time: endTime } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('channel_sub_order_id', channelSubOrderId)
  }
}

// ── Main handler ─────────────────────────────────────────────────────────
export async function POST(req: Request) {
  // Read raw body for signature verification
  const rawBody = await req.text()
  const signHeader = req.headers.get('x-sign-value')

  // Verify signature (skip in dev if secret not set)
  if (APP_SECRET && signHeader && !verifySign(rawBody, signHeader)) {
    return NextResponse.json({ tradeCode: '9999', tradeMsg: '簽名錯誤' }, { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ tradeCode: '9999', tradeMsg: '格式錯誤' }, { status: 400 })
  }

  const { tradeType, tradeTime, tradeData } = payload

  const supabase = createAdminClient()

  // Log webhook
  const { data: logRow } = await supabase
    .from('webhook_logs')
    .insert({ trade_type: tradeType, trade_time: tradeTime, payload, processed: false })
    .select('id')
    .single()
  const logId = logRow?.id

  try {
    switch (tradeType) {
      case 'N013': await handleN013(tradeData, supabase); break
      case 'N001': await handleN001(tradeData, supabase); break
      case 'N009': await handleN009(tradeData, supabase); break
      case 'N002':
      case 'N003': await handleN002N003(tradeType, tradeData, supabase); break
      default:
        // Unhandled type — log and return success (don't retry)
        console.log(`Unhandled webhook type: ${tradeType}`)
    }

    // Mark as processed
    if (logId) {
      await supabase
        .from('webhook_logs')
        .update({ processed: true })
        .eq('id', logId)
    }
  } catch (err: any) {
    console.error(`Webhook ${tradeType} error:`, err.message)
    if (logId) {
      await supabase
        .from('webhook_logs')
        .update({ error_msg: err.message })
        .eq('id', logId)
    }
    // Return 200 anyway to prevent BC from retrying unnecessarily
    // (Log the error for manual review)
  }

  return ok()
}
