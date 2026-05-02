import { NextResponse } from 'next/server'
import { getDailyTraffic } from '@/lib/billionconnect'

// GET /api/agent/operations/daily-traffic?iccid=&beginDate=&endDate=&tzType=
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const iccid = searchParams.get('iccid')?.trim()
  const beginDate = searchParams.get('beginDate')?.trim()
  const endDate = searchParams.get('endDate')?.trim()
  const tzType = searchParams.get('tzType') ?? '1'

  if (!iccid || !beginDate || !endDate) {
    return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
  }

  try {
    const data = await getDailyTraffic({ iccid, beginDate, endDate, tzType })
    return NextResponse.json(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
