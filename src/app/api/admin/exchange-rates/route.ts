import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/exchange-rates
// Returns trading rates (base: TWD). rate = 1 TWD → X currency.
export async function GET() {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('currency, rate, updated_at, updated_by')
    .order('currency')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rates: data })
}

// PATCH /api/admin/exchange-rates
// body: { currency, rate, updated_by? }
// rate = 1 TWD → X currency (TWD is the immutable base)
export async function PATCH(req: Request) {
  const { currency, rate, updated_by } = await req.json()
  if (Number(rate) <= 0) {
    return NextResponse.json({ error: 'Rate must be positive.' }, { status: 400 })
  }
  const { error } = await supabase
    .from('exchange_rates')
    .upsert({
      currency,
      rate: Number(rate),
      updated_at: new Date().toISOString(),
      updated_by: updated_by ?? '',
    }, { onConflict: 'currency' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
