import { NextResponse } from 'next/server'
import { getPlanUsageV2 } from '@/lib/billionconnect'

// GET /api/agent/operations/plan-usage?iccid=&orderId=&channelOrderId=
// 直接代理 BC F046（ICCID 歸屬已在前端頁面層限制）
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const iccid = searchParams.get('iccid')?.trim()
  const orderId = searchParams.get('orderId')?.trim() || undefined
  const channelOrderId = searchParams.get('channelOrderId')?.trim() || undefined

  if (!iccid) return NextResponse.json({ error: '缺少 ICCID' }, { status: 400 })

  try {
    const data = await getPlanUsageV2({ iccid, orderId, channelOrderId })
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
