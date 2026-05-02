import { NextResponse } from 'next/server'
import { getCardExpiry } from '@/lib/billionconnect'

// POST /api/admin/orders/card-expiry
// Body: { iccids: string[] }
export async function POST(req: Request) {
  const { iccids } = await req.json().catch(() => ({}))
  if (!Array.isArray(iccids) || iccids.length === 0) {
    return NextResponse.json({ error: '請提供 ICCID' }, { status: 400 })
  }
  try {
    const data = await getCardExpiry(iccids)
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? '查詢失敗' }, { status: 502 })
  }
}
