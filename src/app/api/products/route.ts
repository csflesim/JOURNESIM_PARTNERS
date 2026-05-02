import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { COUNTRIES } from '@/lib/countries'
import type { Product, DailyPlan, FixedPlan } from '@/lib/products'

const ESIM_SIM_TYPES = ['110', '111', '210', '211', '212', '220', '221', '230', '250', '311']

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const iso = searchParams.get('iso')?.toLowerCase()

  if (!iso) {
    return NextResponse.json({ success: false, message: 'iso is required' }, { status: 400 })
  }

  const countryCode = iso.toUpperCase() // BC API 用 2碼大寫 ISO，如 "JP"
  const country = COUNTRIES.find(c => c.iso === iso)

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('products')
    .select('sku_id, name, name_i18n, type, plan_type, days, capacity, high_flow_size, prices, retail_price, countries')
    .in('type', ESIM_SIM_TYPES)
    .eq('is_active', true)

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }

  // 用 2碼 ISO 過濾（BC 的 countries[].mcc 欄位值為 "JP" 等 2碼大寫 ISO）
  const matching = (data ?? []).filter(p => {
    const countries = p.countries as { mcc: string }[] | null
    return countries?.some(c => c.mcc.toUpperCase() === countryCode) ?? false
  })

  function resolvePrice(p: typeof matching[number]): number {
    if (p.retail_price != null) return Math.round(Number(p.retail_price))
    const tiers = p.prices as { copies: string; retailPrice: string }[] | null ?? []
    const tier = tiers.find(x => x.copies === '1') ?? tiers[0]
    return tier ? Math.round(Number(tier.retailPrice)) : 0
  }

  const dailyPlans: DailyPlan[] = matching
    .filter(p => p.plan_type === '1' && p.high_flow_size)
    .map(p => {
      const mb = Number(p.high_flow_size)
      const speedLabel = mb < 1024 ? `${mb} MB/日` : `${mb / 1024} GB/日`
      const speedKey = mb < 1024 ? `${mb}mb` : `${mb / 1024}gb`
      return { type: 'daily' as const, speedKey, speedLabel, pricePerDay: resolvePrice(p) }
    })

  const fixedPlans: FixedPlan[] = matching
    .filter(p => p.plan_type === '0' && p.capacity && p.days)
    .map(p => {
      const gb = Number(p.capacity) / 1024
      const days = Number(p.days)
      return { type: 'fixed' as const, id: p.sku_id, gb, days, price: resolvePrice(p) }
    })

  const products: Product[] = []

  if (dailyPlans.length > 0 || fixedPlans.length > 0) {
    products.push({
      id: `${iso}-esim`,
      iso,
      nameZh: `${country?.zh ?? iso.toUpperCase()} eSIM`,
      nameEn: `${country?.en ?? iso.toUpperCase()} eSIM`,
      kind: 'esim',
      imageQuery: `${country?.en?.toLowerCase() ?? iso} travel`,
      coverageCount: 1,
      dailyPlans,
      fixedPlans,
      features: [],
      relatedIsos: [],
    })
  }

  return NextResponse.json({ success: true, products })
}
