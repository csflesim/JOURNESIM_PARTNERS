// ── Plan types ────────────────────────────────────────────────────────

export interface DailyPlan {
  type: 'daily'
  speedLabel: string   // e.g. "1 GB/日"
  speedKey: string     // e.g. "1gb"
  pricePerDay: number  // NT$
}

export interface FixedPlan {
  type: 'fixed'
  id: string
  gb: number
  days: number         // 0 = 無期限（加速包用）
  price: number        // NT$
}

export type Plan = DailyPlan | FixedPlan

// ── Product ───────────────────────────────────────────────────────────

export interface Product {
  id: string
  iso: string                       // ISO 3166-1 alpha-2
  nameZh: string
  nameEn: string
  kind: 'esim' | 'sim' | 'accel'   // accel = 加速包
  imageQuery: string
  coverageCount: number
  dailyPlans: DailyPlan[]           // 日費方案（eSIM 專用）
  fixedPlans: FixedPlan[]           // 固定方案 / 加速包方案
  features: { zh: string; en: string }[]
  relatedIsos: string[]
}

// ── Shared templates ──────────────────────────────────────────────────

const STD_DAILY: DailyPlan[] = [
  { type: 'daily', speedKey: '500mb', speedLabel: '500 MB/日', pricePerDay: 25 },
  { type: 'daily', speedKey: '1gb',   speedLabel: '1 GB/日',   pricePerDay: 39 },
  { type: 'daily', speedKey: '2gb',   speedLabel: '2 GB/日',   pricePerDay: 59 },
  { type: 'daily', speedKey: '3gb',   speedLabel: '3 GB/日',   pricePerDay: 79 },
]

function esimFixed(base: number): FixedPlan[] {
  return [
    { type: 'fixed', id: '1gb3d',   gb: 1,  days: 3,  price: Math.round(base * 1)   },
    { type: 'fixed', id: '3gb5d',   gb: 3,  days: 5,  price: Math.round(base * 2.5) },
    { type: 'fixed', id: '5gb7d',   gb: 5,  days: 7,  price: Math.round(base * 4)   },
    { type: 'fixed', id: '10gb15d', gb: 10, days: 15, price: Math.round(base * 7.5) },
    { type: 'fixed', id: '20gb30d', gb: 20, days: 30, price: Math.round(base * 14)  },
    { type: 'fixed', id: '30gb30d', gb: 30, days: 30, price: Math.round(base * 20)  },
    { type: 'fixed', id: '50gb30d', gb: 50, days: 30, price: Math.round(base * 30)  },
  ]
}

function simFixed(base: number): FixedPlan[] {
  return [
    { type: 'fixed', id: '3gb7d',   gb: 3,  days: 7,  price: Math.round(base * 1)   },
    { type: 'fixed', id: '5gb15d',  gb: 5,  days: 15, price: Math.round(base * 1.6) },
    { type: 'fixed', id: '10gb30d', gb: 10, days: 30, price: Math.round(base * 3)   },
    { type: 'fixed', id: '20gb30d', gb: 20, days: 30, price: Math.round(base * 5.5) },
    { type: 'fixed', id: 'unl30d',  gb: 99, days: 30, price: Math.round(base * 8)   },
  ]
}

// 加速包：days = 0 = 無限期（用完即止）
function accelFixed(base: number): FixedPlan[] {
  return [
    { type: 'fixed', id: '1gb',  gb: 1,  days: 0, price: Math.round(base * 1)   },
    { type: 'fixed', id: '2gb',  gb: 2,  days: 0, price: Math.round(base * 1.8) },
    { type: 'fixed', id: '3gb',  gb: 3,  days: 0, price: Math.round(base * 2.5) },
    { type: 'fixed', id: '5gb',  gb: 5,  days: 0, price: Math.round(base * 3.8) },
    { type: 'fixed', id: '10gb', gb: 10, days: 0, price: Math.round(base * 7)   },
  ]
}

const ESIM_FEATURES: Product['features'] = [
  { zh: '數據：每日高速流量，用完後限速 384kbps 無限使用', en: 'Data: High-speed quota, then unlimited at 384kbps' },
  { zh: '每日基準：自激活起，每 24 小時計為 1 天',        en: 'Daily reset: Every 24 hours from activation' },
  { zh: '套餐服務：僅流量',                              en: 'Service: Data only' },
  { zh: '有效期限：自購買起 90 天內有效，抵達後自動激活',  en: 'Validity: 90 days from purchase, auto-activates on arrival' },
  { zh: '熱點分享：支援',                               en: 'Hotspot: Supported' },
]

const SIM_FEATURES: Product['features'] = [
  { zh: '類型：實體 SIM 卡（郵寄配送）',         en: 'Type: Physical SIM card (mail delivery)' },
  { zh: '網路：支援 4G/LTE 高速網路',            en: 'Network: 4G/LTE high-speed' },
  { zh: '套餐服務：語音 + 數據 或 僅數據',        en: 'Service: Voice + Data or Data only' },
  { zh: '熱點分享：支援',                        en: 'Hotspot: Supported' },
  { zh: '出貨時間：訂單確認後 1-3 個工作天出貨',  en: 'Shipping: 1-3 business days after confirmation' },
]

const ACCEL_FEATURES: Product['features'] = [
  { zh: '類型：加速補充包，適用於已激活的 eSIM',    en: 'Type: Data booster for activated eSIM' },
  { zh: '有效期限：購買後 365 天內使用，用完即止', en: 'Validity: 365 days from purchase, valid until used' },
  { zh: '無最低使用量限制',                       en: 'No minimum usage requirement' },
]

// ── eSIM products ─────────────────────────────────────────────────────

const ESIM_PRODUCTS: Product[] = [
  { id: 'jp-esim',  iso: 'jp', nameZh: '日本 eSIM',    nameEn: 'Japan eSIM',        kind: 'esim', imageQuery: 'japan mount fuji',            coverageCount: 1, dailyPlans: STD_DAILY, fixedPlans: esimFixed(95),  features: ESIM_FEATURES, relatedIsos: ['kr', 'tw', 'hk'] },
  { id: 'kr-esim',  iso: 'kr', nameZh: '南韓 eSIM',    nameEn: 'South Korea eSIM',  kind: 'esim', imageQuery: 'korea seoul city',            coverageCount: 1, dailyPlans: STD_DAILY, fixedPlans: esimFixed(90),  features: ESIM_FEATURES, relatedIsos: ['jp', 'tw', 'hk'] },
  { id: 'tw-esim',  iso: 'tw', nameZh: '台灣 eSIM',    nameEn: 'Taiwan eSIM',       kind: 'esim', imageQuery: 'taiwan taipei city',          coverageCount: 1, dailyPlans: STD_DAILY, fixedPlans: esimFixed(70),  features: ESIM_FEATURES, relatedIsos: ['jp', 'hk', 'sg'] },
  { id: 'hk-esim',  iso: 'hk', nameZh: '香港 eSIM',    nameEn: 'Hong Kong eSIM',    kind: 'esim', imageQuery: 'hong kong skyline',           coverageCount: 1, dailyPlans: STD_DAILY, fixedPlans: esimFixed(80),  features: ESIM_FEATURES, relatedIsos: ['mo', 'cn', 'tw'] },
  { id: 'mo-esim',  iso: 'mo', nameZh: '澳門 eSIM',    nameEn: 'Macao eSIM',        kind: 'esim', imageQuery: 'macao casino',                coverageCount: 1, dailyPlans: STD_DAILY, fixedPlans: esimFixed(75),  features: ESIM_FEATURES, relatedIsos: ['hk', 'cn', 'tw'] },
  { id: 'th-esim',  iso: 'th', nameZh: '泰國 eSIM',    nameEn: 'Thailand eSIM',     kind: 'esim', imageQuery: 'thailand temple beach',       coverageCount: 1, dailyPlans: STD_DAILY, fixedPlans: esimFixed(75),  features: ESIM_FEATURES, relatedIsos: ['vn', 'my', 'sg'] },
  { id: 'vn-esim',  iso: 'vn', nameZh: '越南 eSIM',    nameEn: 'Vietnam eSIM',      kind: 'esim', imageQuery: 'vietnam rice terrace',        coverageCount: 1, dailyPlans: STD_DAILY, fixedPlans: esimFixed(80),  features: ESIM_FEATURES, relatedIsos: ['th', 'kh', 'my'] },
  { id: 'sg-esim',  iso: 'sg', nameZh: '新加坡 eSIM',  nameEn: 'Singapore eSIM',    kind: 'esim', imageQuery: 'singapore city skyline',      coverageCount: 1, dailyPlans: STD_DAILY, fixedPlans: esimFixed(88),  features: ESIM_FEATURES, relatedIsos: ['my', 'id', 'th'] },
  { id: 'my-esim',  iso: 'my', nameZh: '馬來西亞 eSIM', nameEn: 'Malaysia eSIM',    kind: 'esim', imageQuery: 'malaysia kuala lumpur',       coverageCount: 1, dailyPlans: STD_DAILY, fixedPlans: esimFixed(72),  features: ESIM_FEATURES, relatedIsos: ['sg', 'th', 'id'] },
  { id: 'id-esim',  iso: 'id', nameZh: '印尼 eSIM',    nameEn: 'Indonesia eSIM',    kind: 'esim', imageQuery: 'indonesia bali temple',       coverageCount: 1, dailyPlans: STD_DAILY, fixedPlans: esimFixed(75),  features: ESIM_FEATURES, relatedIsos: ['my', 'sg', 'ph'] },
  { id: 'ph-esim',  iso: 'ph', nameZh: '菲律賓 eSIM',  nameEn: 'Philippines eSIM',  kind: 'esim', imageQuery: 'philippines island beach',    coverageCount: 1, dailyPlans: STD_DAILY, fixedPlans: esimFixed(78),  features: ESIM_FEATURES, relatedIsos: ['id', 'my', 'vn'] },
  { id: 'us-esim',  iso: 'us', nameZh: '美國 eSIM',    nameEn: 'USA eSIM',          kind: 'esim', imageQuery: 'united states new york city', coverageCount: 1, dailyPlans: STD_DAILY, fixedPlans: esimFixed(120), features: ESIM_FEATURES, relatedIsos: ['ca', 'mx', 'gb'] },
  { id: 'ca-esim',  iso: 'ca', nameZh: '加拿大 eSIM',  nameEn: 'Canada eSIM',       kind: 'esim', imageQuery: 'canada toronto',             coverageCount: 1, dailyPlans: STD_DAILY, fixedPlans: esimFixed(115), features: ESIM_FEATURES, relatedIsos: ['us', 'mx', 'gb'] },
  { id: 'gb-esim',  iso: 'gb', nameZh: '英國 eSIM',    nameEn: 'UK eSIM',           kind: 'esim', imageQuery: 'london big ben',             coverageCount: 1, dailyPlans: STD_DAILY, fixedPlans: esimFixed(115), features: ESIM_FEATURES, relatedIsos: ['fr', 'de', 'it'] },
  { id: 'fr-esim',  iso: 'fr', nameZh: '法國 eSIM',    nameEn: 'France eSIM',       kind: 'esim', imageQuery: 'paris eiffel tower',         coverageCount: 1, dailyPlans: STD_DAILY, fixedPlans: esimFixed(118), features: ESIM_FEATURES, relatedIsos: ['de', 'it', 'es'] },
  { id: 'de-esim',  iso: 'de', nameZh: '德國 eSIM',    nameEn: 'Germany eSIM',      kind: 'esim', imageQuery: 'germany berlin',             coverageCount: 1, dailyPlans: STD_DAILY, fixedPlans: esimFixed(118), features: ESIM_FEATURES, relatedIsos: ['fr', 'it', 'at'] },
  { id: 'au-esim',  iso: 'au', nameZh: '澳洲 eSIM',    nameEn: 'Australia eSIM',    kind: 'esim', imageQuery: 'australia sydney opera house',coverageCount: 1, dailyPlans: STD_DAILY, fixedPlans: esimFixed(130), features: ESIM_FEATURES, relatedIsos: ['nz', 'sg', 'jp'] },
  { id: 'ae-esim',  iso: 'ae', nameZh: '阿聯酋 eSIM',  nameEn: 'UAE eSIM',          kind: 'esim', imageQuery: 'dubai burj khalifa',          coverageCount: 1, dailyPlans: STD_DAILY, fixedPlans: esimFixed(110), features: ESIM_FEATURES, relatedIsos: ['sa', 'qa', 'bh'] },
]

// ── SIM products ──────────────────────────────────────────────────────

const SIM_PRODUCTS: Product[] = [
  { id: 'jp-sim',  iso: 'jp', nameZh: '日本 SIM 卡',    nameEn: 'Japan SIM Card',       kind: 'sim', imageQuery: 'japan tokyo shibuya',        coverageCount: 1, dailyPlans: [], fixedPlans: simFixed(180), features: SIM_FEATURES, relatedIsos: ['kr', 'tw'] },
  { id: 'kr-sim',  iso: 'kr', nameZh: '南韓 SIM 卡',    nameEn: 'South Korea SIM Card', kind: 'sim', imageQuery: 'korea seoul night',          coverageCount: 1, dailyPlans: [], fixedPlans: simFixed(170), features: SIM_FEATURES, relatedIsos: ['jp', 'tw'] },
  { id: 'th-sim',  iso: 'th', nameZh: '泰國 SIM 卡',    nameEn: 'Thailand SIM Card',    kind: 'sim', imageQuery: 'thailand bangkok',           coverageCount: 1, dailyPlans: [], fixedPlans: simFixed(150), features: SIM_FEATURES, relatedIsos: ['vn', 'sg'] },
  { id: 'vn-sim',  iso: 'vn', nameZh: '越南 SIM 卡',    nameEn: 'Vietnam SIM Card',     kind: 'sim', imageQuery: 'vietnam hanoi street',       coverageCount: 1, dailyPlans: [], fixedPlans: simFixed(155), features: SIM_FEATURES, relatedIsos: ['th', 'my'] },
  { id: 'sg-sim',  iso: 'sg', nameZh: '新加坡 SIM 卡',  nameEn: 'Singapore SIM Card',   kind: 'sim', imageQuery: 'singapore gardens by the bay',coverageCount: 1, dailyPlans: [], fixedPlans: simFixed(165), features: SIM_FEATURES, relatedIsos: ['my', 'id'] },
  { id: 'my-sim',  iso: 'my', nameZh: '馬來西亞 SIM 卡', nameEn: 'Malaysia SIM Card',   kind: 'sim', imageQuery: 'malaysia petronas towers',   coverageCount: 1, dailyPlans: [], fixedPlans: simFixed(150), features: SIM_FEATURES, relatedIsos: ['sg', 'th'] },
  { id: 'us-sim',  iso: 'us', nameZh: '美國 SIM 卡',    nameEn: 'USA SIM Card',         kind: 'sim', imageQuery: 'new york times square',      coverageCount: 1, dailyPlans: [], fixedPlans: simFixed(220), features: SIM_FEATURES, relatedIsos: ['ca', 'mx'] },
  { id: 'au-sim',  iso: 'au', nameZh: '澳洲 SIM 卡',    nameEn: 'Australia SIM Card',   kind: 'sim', imageQuery: 'australia great barrier reef',coverageCount: 1, dailyPlans: [], fixedPlans: simFixed(230), features: SIM_FEATURES, relatedIsos: ['nz', 'sg'] },
]

// ── Acceleration packs ────────────────────────────────────────────────

const ACCEL_PRODUCTS: Product[] = [
  { id: 'jp-accel',  iso: 'jp', nameZh: '日本加速包',    nameEn: 'Japan Booster',        kind: 'accel', imageQuery: 'japan fuji sakura',         coverageCount: 1, dailyPlans: [], fixedPlans: accelFixed(59), features: ACCEL_FEATURES, relatedIsos: ['kr', 'tw'] },
  { id: 'kr-accel',  iso: 'kr', nameZh: '南韓加速包',    nameEn: 'South Korea Booster',  kind: 'accel', imageQuery: 'korea namsan tower',        coverageCount: 1, dailyPlans: [], fixedPlans: accelFixed(55), features: ACCEL_FEATURES, relatedIsos: ['jp', 'tw'] },
  { id: 'th-accel',  iso: 'th', nameZh: '泰國加速包',    nameEn: 'Thailand Booster',     kind: 'accel', imageQuery: 'thailand phuket sea',       coverageCount: 1, dailyPlans: [], fixedPlans: accelFixed(49), features: ACCEL_FEATURES, relatedIsos: ['vn', 'my'] },
  { id: 'vn-accel',  iso: 'vn', nameZh: '越南加速包',    nameEn: 'Vietnam Booster',      kind: 'accel', imageQuery: 'vietnam halong bay',        coverageCount: 1, dailyPlans: [], fixedPlans: accelFixed(49), features: ACCEL_FEATURES, relatedIsos: ['th', 'kh'] },
  { id: 'sg-accel',  iso: 'sg', nameZh: '新加坡加速包',  nameEn: 'Singapore Booster',    kind: 'accel', imageQuery: 'singapore night city',      coverageCount: 1, dailyPlans: [], fixedPlans: accelFixed(55), features: ACCEL_FEATURES, relatedIsos: ['my', 'id'] },
  { id: 'us-accel',  iso: 'us', nameZh: '美國加速包',    nameEn: 'USA Booster',          kind: 'accel', imageQuery: 'usa california highway',    coverageCount: 1, dailyPlans: [], fixedPlans: accelFixed(79), features: ACCEL_FEATURES, relatedIsos: ['ca', 'mx'] },
  { id: 'eu-accel',  iso: 'gb', nameZh: '歐洲加速包',    nameEn: 'Europe Booster',       kind: 'accel', imageQuery: 'europe france paris',       coverageCount: 30, dailyPlans: [], fixedPlans: accelFixed(85), features: ACCEL_FEATURES, relatedIsos: ['fr', 'de', 'it'] },
]

// ── Combined export ───────────────────────────────────────────────────

export const PRODUCTS: Product[] = [
  ...ESIM_PRODUCTS,
  ...SIM_PRODUCTS,
  ...ACCEL_PRODUCTS,
]

export function getProductsByIso(iso: string): Product[] {
  return PRODUCTS.filter(p => p.iso === iso)
}

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find(p => p.id === id)
}

/** Landscape photo for a product via Unsplash Source */
export function productImageUrl(query: string, w = 800, h = 600) {
  return `https://source.unsplash.com/${w}x${h}/?${encodeURIComponent(query)}`
}
