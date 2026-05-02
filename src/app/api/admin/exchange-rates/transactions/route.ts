import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CURRENCIES = ['TWD', 'USD', 'HKD', 'CNY']

// GET /api/admin/exchange-rates/transactions
export async function GET() {
  const { data, error } = await supabase
    .from('exchange_transactions')
    .select('*')
    .order('date', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = data ?? []

  // Running balances per currency
  const balances: Record<string, number> = { TWD: 0, USD: 0, HKD: 0, CNY: 0 }

  // Weighted average rate accumulators: fromCcy → toCcy → { sumTo, sumFrom }
  const rateAcc: Record<string, Record<string, { sumTo: number; sumFrom: number }>> = {}

  const enriched = rows.map(row => {
    if (row.from_currency && row.from_amount != null) {
      balances[row.from_currency] = (balances[row.from_currency] ?? 0) - Number(row.from_amount)
    }
    if (row.to_currency && row.to_amount != null) {
      balances[row.to_currency] = (balances[row.to_currency] ?? 0) + Number(row.to_amount)
    }

    // Accumulate rate stats (only for exchange type, both currencies present)
    if (row.type === 'exchange' && row.from_currency && row.to_currency && row.from_amount && row.to_amount) {
      const fc = row.from_currency, tc = row.to_currency
      if (!rateAcc[fc]) rateAcc[fc] = {}
      if (!rateAcc[fc][tc]) rateAcc[fc][tc] = { sumTo: 0, sumFrom: 0 }
      rateAcc[fc][tc].sumTo += Number(row.to_amount)
      // Use from_amount + from_fee as the effective cost for weighted avg
      rateAcc[fc][tc].sumFrom += Number(row.from_amount) + Number(row.from_fee ?? 0)
    }

    // rate = to_amount / (from_amount + from_fee)
    const totalFrom = (Number(row.from_amount) || 0) + (Number(row.from_fee) || 0)
    const rate =
      totalFrom > 0 && row.to_amount
        ? Number(row.to_amount) / totalFrom
        : null

    return {
      ...row,
      rate,
      running_balances: { ...balances },
    }
  })

  // Build avg rates: for each pair, avg = sumTo / sumFrom
  const avgRates: Record<string, Record<string, number>> = {}
  for (const [fc, tcs] of Object.entries(rateAcc)) {
    avgRates[fc] = {}
    for (const [tc, acc] of Object.entries(tcs)) {
      avgRates[fc][tc] = acc.sumFrom > 0 ? acc.sumTo / acc.sumFrom : 0
    }
  }

  return NextResponse.json({
    transactions: enriched,
    balances: { ...balances },
    avgRates,
    currencies: CURRENCIES,
  })
}

// POST /api/admin/exchange-rates/transactions
export async function POST(req: Request) {
  const body = await req.json()
  const { date, description, type, from_currency, from_amount, to_currency, to_amount, notes } = body

  const { data, error } = await supabase
    .from('exchange_transactions')
    .insert({
      date,
      description: description ?? '',
      type,
      from_currency: from_currency || null,
      from_amount:   from_amount   ? Number(from_amount)  : null,
      from_fee:      body.from_fee ? Number(body.from_fee) : 0,
      to_currency:   to_currency   || null,
      to_amount:     to_amount     ? Number(to_amount)    : null,
      notes: notes ?? '',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ transaction: data })
}
