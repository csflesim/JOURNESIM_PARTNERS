import { NextResponse } from 'next/server'
import { getPlanUsageV2 } from '@/lib/billionconnect'

// GET /api/admin/operations/plan-usage?iccid=&orderId=&channelOrderId=
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const iccid = searchParams.get('iccid')?.trim()
  const orderId = searchParams.get('orderId')?.trim() || undefined
  const channelOrderId = searchParams.get('channelOrderId')?.trim() || undefined

  if (!iccid) return NextResponse.json({ error: '缺少 ICCID' }, { status: 400 })

  try {
    const data = await getPlanUsageV2({ iccid, orderId, channelOrderId })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? '查詢失敗' }, { status: 502 })
  }
}
