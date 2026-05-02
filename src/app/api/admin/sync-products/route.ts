import { NextResponse } from 'next/server'
import { getProducts, getProductPrices, getAccelerationProducts } from '@/lib/billionconnect'
import { createAdminClient } from '@/lib/supabase/admin'

// ── Google Translate（非官方，免費，不需 API key）──────────
async function googleTranslate(text: string, to: string): Promise<string> {
  if (!text) return text
  const url =
    `https://translate.googleapis.com/translate_a/single` +
    `?client=gtx&sl=en&tl=${to}&dt=t&q=${encodeURIComponent(text)}`
  const res = await fetch(url)
  if (!res.ok) return text
  const data = await res.json()
  // response: [ [[translated, original, ...], ...], ... ]
  return (data[0] as any[][]).map(item => item[0]).join('')
}

// 批次翻譯（分批避免字元限制，每批 30 筆用 \n 連接）
async function translateBatch(texts: string[], to: string): Promise<string[]> {
  const CHUNK = 30
  const results: string[] = []

  for (let i = 0; i < texts.length; i += CHUNK) {
    const chunk = texts.slice(i, i + CHUNK)
    const joined = chunk.join('\n')
    try {
      const translated = await googleTranslate(joined, to)
      const lines = translated.split('\n')
      // 確保行數對齊（翻譯可能合併或拆分）
      for (let j = 0; j < chunk.length; j++) {
        results.push(lines[j] ?? chunk[j])
      }
    } catch {
      results.push(...chunk)  // 失敗時原樣保留
    }
    // 稍作等待避免觸發 rate limit
    if (i + CHUNK < texts.length) {
      await new Promise(r => setTimeout(r, 300))
    }
  }

  return results
}

// ── 主同步邏輯 ────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const { salesMethod = '5' } = await request.json().catch(() => ({}))
    const supabase = createAdminClient()

    // 主資料（簡體中文）+ 英文版
    const [products, prices, accelerationProducts, enProducts, enAccel] = await Promise.all([
      getProducts({ salesMethod, language: '1', networkOperatorScope: '2' }),
      getProductPrices(salesMethod),
      getAccelerationProducts({ language: '1' }),
      getProducts({ salesMethod, language: '2', networkOperatorScope: '2' }).catch(() => [] as any[]),
      getAccelerationProducts({ language: '2' }).catch(() => [] as any[]),
    ])

    // 英文 map：skuId → { name, desc }
    const enMap = new Map<string, { name: string; desc: string }>()
    for (const p of [...enProducts, ...enAccel]) {
      if (p.skuId) enMap.set(p.skuId, { name: p.name ?? '', desc: p.desc ?? '' })
    }

    // 建立價格 map
    const priceMap = new Map<string, { copies: string; retailPrice: string; settlementPrice: string }[]>()
    for (const p of prices) {
      priceMap.set(p.skuId, p.price)
    }

    // 合併商品（去重）
    const productSkuIds = new Set(products.map(p => p.skuId))
    const allProducts = [
      ...products,
      ...accelerationProducts.filter(ap => !productSkuIds.has(ap.skuId)),
    ].filter(p => p.skuId && p.name && p.type)

    if (allProducts.length === 0) {
      return NextResponse.json({ success: true, synced: 0, message: '沒有商品可同步' })
    }

    // 取出所有英文名稱，批次翻譯為日文 & 韓文
    const enNames = allProducts.map(p => enMap.get(p.skuId)?.name ?? p.name)

    const [jaNames, koNames] = await Promise.all([
      translateBatch(enNames, 'ja'),
      translateBatch(enNames, 'ko'),
    ])

    // 組裝資料列
    const rows = allProducts.map((p, idx) => {
      const priceTiers = priceMap.get(p.skuId) ?? []
      const basePrice = priceTiers.find(x => x.copies === '1') ?? priceTiers[0]
      const enData = enMap.get(p.skuId)

      return {
        sku_id: p.skuId,
        name: p.name,
        type: p.type,
        days: p.days ?? null,
        capacity: p.capacity ?? null,
        high_flow_size: p.highFlowSize ?? null,
        limit_flow_speed: p.limitFlowSpeed ?? null,
        hotspot_support: p.hotspotSupport ?? '0',
        plan_type: p.planType ?? null,
        countries: p.country ?? [],
        operator_info: p.operatorInfo ?? null,
        apn: p.apn ?? null,
        desc_text: p.desc ?? null,
        rechargeable_product: p.rechargeableProduct ?? '0',
        rechargeable_series_id: p.rechargeableProductSeriesId ?? null,
        rechargeable_series_name: p.rechargeableProductSeriesName ?? null,
        product_id: p.productId ?? null,
        product_name: p.productName ?? null,
        validity_period: p.validityPeroid ?? null,
        carrier_validity_period: p.carrierValidityPeroid ?? null,
        acceleration_support: p.accelerationSupport ?? '0',
        point_contact_type: p.pointContactType ?? null,
        point_contact_hours: p.pointContactHours ?? null,
        time_zone: p.timeZone ?? null,
        usage_count: p.usageCount ?? null,
        estimated_use_time_flag: p.estimatedUseTimeFlag ?? null,
        estimated_use_time_gap_hours: p.estimatedUseTimeGapHours ?? null,
        apply_to_device: p.applyToDevice ?? null,
        apply_to_device_type: p.applyToDeviceType ?? [],
        provider: p.provider ?? null,
        refund_policy: p.refundPolicy ?? null,
        speed_limit_rule: p.speedLimitRule ?? null,
        prices: priceTiers,
        cost_price: basePrice ? parseFloat(basePrice.settlementPrice) : null,
        // 多語言（名稱翻譯；描述只存英文，JA/KO fallback 英文）
        name_i18n: {
          en: enData?.name ?? null,
          ja: jaNames[idx] ?? null,
          ko: koNames[idx] ?? null,
        },
        desc_i18n: {
          en: enData?.desc ?? null,
        },
        is_active: true,
        synced_at: new Date().toISOString(),
      }
    })

    const { error } = await supabase
      .from('products')
      .upsert(rows, { onConflict: 'sku_id' })

    if (error) throw error

    return NextResponse.json({
      success: true,
      synced: rows.length,
      message: `成功同步 ${rows.length} 個商品`,
    })
  } catch (err: any) {
    console.error('[sync-products]', err)
    return NextResponse.json(
      { success: false, message: err.message ?? '同步失敗' },
      { status: 500 }
    )
  }
}
