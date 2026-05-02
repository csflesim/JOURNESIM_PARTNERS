import { NextResponse } from 'next/server'
import { getBalance } from '@/lib/billionconnect'

export async function GET() {
  try {
    const data = await getBalance()
    const amount = data.availableBalance ?? data.saleBalance ?? data.accountBalance ?? '0'
    return NextResponse.json({ success: true, balance: amount, currency: data.currency ?? 'CNY' })
  } catch (err: any) {
    return NextResponse.json({ success: false, balance: '—', currency: '' })
  }
}
