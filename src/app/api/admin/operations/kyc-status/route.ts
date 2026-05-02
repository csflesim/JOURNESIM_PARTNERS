import { NextResponse } from 'next/server'
import { getKycStatus } from '@/lib/billionconnect'

// POST /api/admin/operations/kyc-status
// Body: { iccids: string[] }
export async function POST(req: Request) {
  const { iccids } = await req.json().catch(() => ({}))

  if (!Array.isArray(iccids) || iccids.length === 0) {
    return NextResponse.json({ error: '請提供 ICCID' }, { status: 400 })
  }
  if (iccids.length > 50) {
    return NextResponse.json({ error: '單次最多查詢 50 筆' }, { status: 400 })
  }

  const results = await Promise.allSettled(
    iccids.map(async (iccid: string) => {
      const data = await getKycStatus(iccid.trim())
      return { iccid: iccid.trim(), status: data.status, expiryTime: data.expiryTime ?? null, error: null }
    })
  )

  const items = results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { iccid: iccids[i].trim(), status: null, expiryTime: null, error: String((r as PromiseRejectedResult).reason) }
  )

  return NextResponse.json({ items })
}
