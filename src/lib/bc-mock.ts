/**
 * 模擬從 BillionConnect F002 同步進採購模組的商品清單
 * 實際資料儲存在 Supabase，此處為本地開發用 mock
 *
 * BC API 的 country[].mcc 欄位值為 2碼大寫 ISO 國碼（如 "JP"、"US"），
 * 並非電信標準 MCC 數字。
 */
import type { BCProduct, BCProductCountry } from './billionconnect'

function c(iso: string, name: string): BCProductCountry {
  return { mcc: iso, name, apn: '' }
}

// ── 單國覆蓋 ──────────────────────────────────────────────────────────

const JP = [c('JP', '日本')]
const KR = [c('KR', '韓國')]
const TW = [c('TW', '台灣')]
const HK = [c('HK', '香港')]
const MO = [c('MO', '澳門')]
const TH = [c('TH', '泰國')]
const VN = [c('VN', '越南')]
const SG = [c('SG', '新加坡')]
const MY = [c('MY', '馬來西亞')]
const ID = [c('ID', '印尼')]
const PH = [c('PH', '菲律賓')]
const KH = [c('KH', '柬埔寨')]
const MM = [c('MM', '緬甸')]
const US = [c('US', '美國')]
const CA = [c('CA', '加拿大')]
const GB = [c('GB', '英國')]
const FR = [c('FR', '法國')]
const DE = [c('DE', '德國')]
const IT = [c('IT', '義大利')]
const ES = [c('ES', '西班牙')]
const AT = [c('AT', '奧地利')]
const NL = [c('NL', '荷蘭')]
const BE = [c('BE', '比利時')]
const DK = [c('DK', '丹麥')]
const FI = [c('FI', '芬蘭')]
const SE = [c('SE', '瑞典')]
const NO = [c('NO', '挪威')]
const CH = [c('CH', '瑞士')]
const HU = [c('HU', '匈牙利')]
const CZ = [c('CZ', '捷克')]
const AU = [c('AU', '澳洲')]
const NZ = [c('NZ', '紐西蘭')]
const AE = [c('AE', '阿聯酋')]

// ── 多國區域 ──────────────────────────────────────────────────────────

const NEA4 = [...JP, ...KR, ...TW, ...HK]
const SEA5 = [...SG, ...TH, ...MY, ...ID, ...PH]
const SEA8 = [...SG, ...TH, ...MY, ...ID, ...PH, ...VN, ...KH, ...MM]
const EU30 = [...GB, ...FR, ...DE, ...IT, ...ES, ...AT, ...NL, ...BE, ...DK, ...FI, ...SE, ...NO, ...CH, ...HU, ...CZ]
const AUME = [...AU, ...NZ]

// ── BC 商品清單（模擬採購模組已同步商品）────────────────────────────

export const BC_PLANS: BCProduct[] = [

  // ── 日本 ──────────────────────────────────────────────────────────
  { skuId: 'JP-D-500M',   name: '日本 500MB 日費',   type: 'eSIM', desc: '', planType: '1', highFlowSize: '512',   days: '1',  country: JP },
  { skuId: 'JP-D-1G',     name: '日本 1GB 日費',     type: 'eSIM', desc: '', planType: '1', highFlowSize: '1024',  days: '1',  country: JP },
  { skuId: 'JP-D-2G',     name: '日本 2GB 日費',     type: 'eSIM', desc: '', planType: '1', highFlowSize: '2048',  days: '1',  country: JP },
  { skuId: 'JP-D-3G',     name: '日本 3GB 日費',     type: 'eSIM', desc: '', planType: '1', highFlowSize: '3072',  days: '1',  country: JP },
  { skuId: 'JP-F-1G3D',   name: '日本 1GB/3天',      type: 'eSIM', desc: '', planType: '0', capacity: '1024',  days: '3',  country: JP },
  { skuId: 'JP-F-3G5D',   name: '日本 3GB/5天',      type: 'eSIM', desc: '', planType: '0', capacity: '3072',  days: '5',  country: JP },
  { skuId: 'JP-F-5G7D',   name: '日本 5GB/7天',      type: 'eSIM', desc: '', planType: '0', capacity: '5120',  days: '7',  country: JP },
  { skuId: 'JP-F-10G15D', name: '日本 10GB/15天',    type: 'eSIM', desc: '', planType: '0', capacity: '10240', days: '15', country: JP },
  { skuId: 'JP-F-20G30D', name: '日本 20GB/30天',    type: 'eSIM', desc: '', planType: '0', capacity: '20480', days: '30', country: JP },
  { skuId: 'JP-F-30G30D', name: '日本 30GB/30天',    type: 'eSIM', desc: '', planType: '0', capacity: '30720', days: '30', country: JP },
  { skuId: 'JP-F-50G30D', name: '日本 50GB/30天',    type: 'eSIM', desc: '', planType: '0', capacity: '51200', days: '30', country: JP },

  // ── 南韓 ──────────────────────────────────────────────────────────
  { skuId: 'KR-D-500M',   name: '南韓 500MB 日費',   type: 'eSIM', desc: '', planType: '1', highFlowSize: '512',   days: '1',  country: KR },
  { skuId: 'KR-D-1G',     name: '南韓 1GB 日費',     type: 'eSIM', desc: '', planType: '1', highFlowSize: '1024',  days: '1',  country: KR },
  { skuId: 'KR-D-2G',     name: '南韓 2GB 日費',     type: 'eSIM', desc: '', planType: '1', highFlowSize: '2048',  days: '1',  country: KR },
  { skuId: 'KR-F-1G3D',   name: '南韓 1GB/3天',      type: 'eSIM', desc: '', planType: '0', capacity: '1024',  days: '3',  country: KR },
  { skuId: 'KR-F-5G7D',   name: '南韓 5GB/7天',      type: 'eSIM', desc: '', planType: '0', capacity: '5120',  days: '7',  country: KR },
  { skuId: 'KR-F-10G15D', name: '南韓 10GB/15天',    type: 'eSIM', desc: '', planType: '0', capacity: '10240', days: '15', country: KR },
  { skuId: 'KR-F-20G30D', name: '南韓 20GB/30天',    type: 'eSIM', desc: '', planType: '0', capacity: '20480', days: '30', country: KR },

  // ── 台灣 ──────────────────────────────────────────────────────────
  { skuId: 'TW-D-500M',   name: '台灣 500MB 日費',   type: 'eSIM', desc: '', planType: '1', highFlowSize: '512',   days: '1',  country: TW },
  { skuId: 'TW-D-1G',     name: '台灣 1GB 日費',     type: 'eSIM', desc: '', planType: '1', highFlowSize: '1024',  days: '1',  country: TW },
  { skuId: 'TW-F-1G3D',   name: '台灣 1GB/3天',      type: 'eSIM', desc: '', planType: '0', capacity: '1024',  days: '3',  country: TW },
  { skuId: 'TW-F-5G7D',   name: '台灣 5GB/7天',      type: 'eSIM', desc: '', planType: '0', capacity: '5120',  days: '7',  country: TW },
  { skuId: 'TW-F-10G15D', name: '台灣 10GB/15天',    type: 'eSIM', desc: '', planType: '0', capacity: '10240', days: '15', country: TW },

  // ── 香港 ──────────────────────────────────────────────────────────
  { skuId: 'HK-D-500M',  name: '香港 500MB 日費',    type: 'eSIM', desc: '', planType: '1', highFlowSize: '512',   days: '1', country: HK },
  { skuId: 'HK-D-1G',    name: '香港 1GB 日費',      type: 'eSIM', desc: '', planType: '1', highFlowSize: '1024',  days: '1', country: HK },
  { skuId: 'HK-F-1G3D',  name: '香港 1GB/3天',       type: 'eSIM', desc: '', planType: '0', capacity: '1024',  days: '3', country: HK },
  { skuId: 'HK-F-5G7D',  name: '香港 5GB/7天',       type: 'eSIM', desc: '', planType: '0', capacity: '5120',  days: '7', country: HK },

  // ── 澳門 ──────────────────────────────────────────────────────────
  { skuId: 'MO-D-1G',    name: '澳門 1GB 日費',      type: 'eSIM', desc: '', planType: '1', highFlowSize: '1024',  days: '1', country: MO },
  { skuId: 'MO-F-3G5D',  name: '澳門 3GB/5天',       type: 'eSIM', desc: '', planType: '0', capacity: '3072',  days: '5', country: MO },

  // ── 東北亞四國（JP+KR+TW+HK）─────────────────────────────────────
  { skuId: 'NEA4-D-500M',   name: '東北亞四國 500MB 日費',  type: 'eSIM', desc: '', planType: '1', highFlowSize: '512',   days: '1',  country: NEA4 },
  { skuId: 'NEA4-D-1G',     name: '東北亞四國 1GB 日費',    type: 'eSIM', desc: '', planType: '1', highFlowSize: '1024',  days: '1',  country: NEA4 },
  { skuId: 'NEA4-F-3G5D',   name: '東北亞四國 3GB/5天',     type: 'eSIM', desc: '', planType: '0', capacity: '3072',  days: '5',  country: NEA4 },
  { skuId: 'NEA4-F-10G15D', name: '東北亞四國 10GB/15天',   type: 'eSIM', desc: '', planType: '0', capacity: '10240', days: '15', country: NEA4 },

  // ── 泰國 ──────────────────────────────────────────────────────────
  { skuId: 'TH-D-500M',   name: '泰國 500MB 日費',   type: 'eSIM', desc: '', planType: '1', highFlowSize: '512',   days: '1',  country: TH },
  { skuId: 'TH-D-1G',     name: '泰國 1GB 日費',     type: 'eSIM', desc: '', planType: '1', highFlowSize: '1024',  days: '1',  country: TH },
  { skuId: 'TH-D-2G',     name: '泰國 2GB 日費',     type: 'eSIM', desc: '', planType: '1', highFlowSize: '2048',  days: '1',  country: TH },
  { skuId: 'TH-F-1G3D',   name: '泰國 1GB/3天',      type: 'eSIM', desc: '', planType: '0', capacity: '1024',  days: '3',  country: TH },
  { skuId: 'TH-F-5G7D',   name: '泰國 5GB/7天',      type: 'eSIM', desc: '', planType: '0', capacity: '5120',  days: '7',  country: TH },
  { skuId: 'TH-F-10G15D', name: '泰國 10GB/15天',    type: 'eSIM', desc: '', planType: '0', capacity: '10240', days: '15', country: TH },

  // ── 越南 ──────────────────────────────────────────────────────────
  { skuId: 'VN-D-500M',  name: '越南 500MB 日費',    type: 'eSIM', desc: '', planType: '1', highFlowSize: '512',   days: '1', country: VN },
  { skuId: 'VN-D-1G',    name: '越南 1GB 日費',      type: 'eSIM', desc: '', planType: '1', highFlowSize: '1024',  days: '1', country: VN },
  { skuId: 'VN-F-1G3D',  name: '越南 1GB/3天',       type: 'eSIM', desc: '', planType: '0', capacity: '1024',  days: '3', country: VN },
  { skuId: 'VN-F-5G7D',  name: '越南 5GB/7天',       type: 'eSIM', desc: '', planType: '0', capacity: '5120',  days: '7', country: VN },

  // ── 新加坡 ────────────────────────────────────────────────────────
  { skuId: 'SG-D-500M',  name: '新加坡 500MB 日費',  type: 'eSIM', desc: '', planType: '1', highFlowSize: '512',   days: '1', country: SG },
  { skuId: 'SG-D-1G',    name: '新加坡 1GB 日費',    type: 'eSIM', desc: '', planType: '1', highFlowSize: '1024',  days: '1', country: SG },
  { skuId: 'SG-F-1G3D',  name: '新加坡 1GB/3天',     type: 'eSIM', desc: '', planType: '0', capacity: '1024',  days: '3', country: SG },
  { skuId: 'SG-F-5G7D',  name: '新加坡 5GB/7天',     type: 'eSIM', desc: '', planType: '0', capacity: '5120',  days: '7', country: SG },

  // ── 馬來西亞 ──────────────────────────────────────────────────────
  { skuId: 'MY-D-1G',    name: '馬來西亞 1GB 日費',  type: 'eSIM', desc: '', planType: '1', highFlowSize: '1024',  days: '1', country: MY },
  { skuId: 'MY-F-5G7D',  name: '馬來西亞 5GB/7天',   type: 'eSIM', desc: '', planType: '0', capacity: '5120',  days: '7', country: MY },

  // ── 印尼 ──────────────────────────────────────────────────────────
  { skuId: 'ID-D-1G',    name: '印尼 1GB 日費',      type: 'eSIM', desc: '', planType: '1', highFlowSize: '1024',  days: '1', country: ID },
  { skuId: 'ID-F-5G7D',  name: '印尼 5GB/7天',       type: 'eSIM', desc: '', planType: '0', capacity: '5120',  days: '7', country: ID },

  // ── 菲律賓 ────────────────────────────────────────────────────────
  { skuId: 'PH-D-1G',    name: '菲律賓 1GB 日費',    type: 'eSIM', desc: '', planType: '1', highFlowSize: '1024',  days: '1', country: PH },
  { skuId: 'PH-F-5G7D',  name: '菲律賓 5GB/7天',     type: 'eSIM', desc: '', planType: '0', capacity: '5120',  days: '7', country: PH },

  // ── 東南亞五國（SG+TH+MY+ID+PH）──────────────────────────────────
  { skuId: 'SEA5-D-500M',   name: '東南亞五國 500MB 日費',  type: 'eSIM', desc: '', planType: '1', highFlowSize: '512',   days: '1',  country: SEA5 },
  { skuId: 'SEA5-D-1G',     name: '東南亞五國 1GB 日費',    type: 'eSIM', desc: '', planType: '1', highFlowSize: '1024',  days: '1',  country: SEA5 },
  { skuId: 'SEA5-D-2G',     name: '東南亞五國 2GB 日費',    type: 'eSIM', desc: '', planType: '1', highFlowSize: '2048',  days: '1',  country: SEA5 },
  { skuId: 'SEA5-F-3G5D',   name: '東南亞五國 3GB/5天',     type: 'eSIM', desc: '', planType: '0', capacity: '3072',  days: '5',  country: SEA5 },
  { skuId: 'SEA5-F-5G7D',   name: '東南亞五國 5GB/7天',     type: 'eSIM', desc: '', planType: '0', capacity: '5120',  days: '7',  country: SEA5 },
  { skuId: 'SEA5-F-10G15D', name: '東南亞五國 10GB/15天',   type: 'eSIM', desc: '', planType: '0', capacity: '10240', days: '15', country: SEA5 },
  { skuId: 'SEA5-F-20G30D', name: '東南亞五國 20GB/30天',   type: 'eSIM', desc: '', planType: '0', capacity: '20480', days: '30', country: SEA5 },

  // ── 東南亞八國（SEA5+VN+KH+MM）───────────────────────────────────
  { skuId: 'SEA8-D-1G',     name: '東南亞八國 1GB 日費',    type: 'eSIM', desc: '', planType: '1', highFlowSize: '1024',  days: '1',  country: SEA8 },
  { skuId: 'SEA8-F-5G7D',   name: '東南亞八國 5GB/7天',     type: 'eSIM', desc: '', planType: '0', capacity: '5120',  days: '7',  country: SEA8 },
  { skuId: 'SEA8-F-10G15D', name: '東南亞八國 10GB/15天',   type: 'eSIM', desc: '', planType: '0', capacity: '10240', days: '15', country: SEA8 },

  // ── 美國 ──────────────────────────────────────────────────────────
  { skuId: 'US-D-1G',     name: '美國 1GB 日費',     type: 'eSIM', desc: '', planType: '1', highFlowSize: '1024',  days: '1',  country: US },
  { skuId: 'US-D-2G',     name: '美國 2GB 日費',     type: 'eSIM', desc: '', planType: '1', highFlowSize: '2048',  days: '1',  country: US },
  { skuId: 'US-F-5G7D',   name: '美國 5GB/7天',      type: 'eSIM', desc: '', planType: '0', capacity: '5120',  days: '7',  country: US },
  { skuId: 'US-F-10G15D', name: '美國 10GB/15天',    type: 'eSIM', desc: '', planType: '0', capacity: '10240', days: '15', country: US },
  { skuId: 'US-F-20G30D', name: '美國 20GB/30天',    type: 'eSIM', desc: '', planType: '0', capacity: '20480', days: '30', country: US },

  // ── 加拿大 ────────────────────────────────────────────────────────
  { skuId: 'CA-D-1G',    name: '加拿大 1GB 日費',    type: 'eSIM', desc: '', planType: '1', highFlowSize: '1024',  days: '1', country: CA },
  { skuId: 'CA-F-5G7D',  name: '加拿大 5GB/7天',     type: 'eSIM', desc: '', planType: '0', capacity: '5120',  days: '7', country: CA },

  // ── 英國 ──────────────────────────────────────────────────────────
  { skuId: 'GB-D-1G',    name: '英國 1GB 日費',      type: 'eSIM', desc: '', planType: '1', highFlowSize: '1024',  days: '1', country: GB },
  { skuId: 'GB-F-5G7D',  name: '英國 5GB/7天',       type: 'eSIM', desc: '', planType: '0', capacity: '5120',  days: '7', country: GB },

  // ── 歐洲三十國 ────────────────────────────────────────────────────
  { skuId: 'EU30-D-500M',   name: '歐洲30國 500MB 日費',    type: 'eSIM', desc: '', planType: '1', highFlowSize: '512',   days: '1',  country: EU30 },
  { skuId: 'EU30-D-1G',     name: '歐洲30國 1GB 日費',      type: 'eSIM', desc: '', planType: '1', highFlowSize: '1024',  days: '1',  country: EU30 },
  { skuId: 'EU30-D-2G',     name: '歐洲30國 2GB 日費',      type: 'eSIM', desc: '', planType: '1', highFlowSize: '2048',  days: '1',  country: EU30 },
  { skuId: 'EU30-F-5G7D',   name: '歐洲30國 5GB/7天',       type: 'eSIM', desc: '', planType: '0', capacity: '5120',  days: '7',  country: EU30 },
  { skuId: 'EU30-F-10G15D', name: '歐洲30國 10GB/15天',     type: 'eSIM', desc: '', planType: '0', capacity: '10240', days: '15', country: EU30 },
  { skuId: 'EU30-F-20G30D', name: '歐洲30國 20GB/30天',     type: 'eSIM', desc: '', planType: '0', capacity: '20480', days: '30', country: EU30 },

  // ── 德國 ──────────────────────────────────────────────────────────
  { skuId: 'DE-D-1G',    name: '德國 1GB 日費',      type: 'eSIM', desc: '', planType: '1', highFlowSize: '1024',  days: '1', country: DE },
  { skuId: 'DE-F-5G7D',  name: '德國 5GB/7天',       type: 'eSIM', desc: '', planType: '0', capacity: '5120',  days: '7', country: DE },

  // ── 法國 ──────────────────────────────────────────────────────────
  { skuId: 'FR-D-1G',    name: '法國 1GB 日費',      type: 'eSIM', desc: '', planType: '1', highFlowSize: '1024',  days: '1', country: FR },
  { skuId: 'FR-F-5G7D',  name: '法國 5GB/7天',       type: 'eSIM', desc: '', planType: '0', capacity: '5120',  days: '7', country: FR },

  // ── 澳洲 ──────────────────────────────────────────────────────────
  { skuId: 'AU-D-1G',      name: '澳洲 1GB 日費',    type: 'eSIM', desc: '', planType: '1', highFlowSize: '1024',  days: '1',  country: AU },
  { skuId: 'AU-F-5G7D',    name: '澳洲 5GB/7天',     type: 'eSIM', desc: '', planType: '0', capacity: '5120',  days: '7',  country: AU },
  { skuId: 'AUME-D-1G',    name: '澳紐 1GB 日費',    type: 'eSIM', desc: '', planType: '1', highFlowSize: '1024',  days: '1',  country: AUME },
  { skuId: 'AUME-F-10G15D',name: '澳紐 10GB/15天',   type: 'eSIM', desc: '', planType: '0', capacity: '10240', days: '15', country: AUME },

  // ── 阿聯酋 ────────────────────────────────────────────────────────
  { skuId: 'AE-D-1G',    name: '阿聯酋 1GB 日費',    type: 'eSIM', desc: '', planType: '1', highFlowSize: '1024',  days: '1', country: AE },
  { skuId: 'AE-F-5G7D',  name: '阿聯酋 5GB/7天',     type: 'eSIM', desc: '', planType: '0', capacity: '5120',  days: '7', country: AE },
]

/**
 * 依 2碼 ISO 國碼搜尋：只要商品 country[].mcc（即 BC 的 2碼國碼）包含目標即命中
 */
export function searchBCPlansByIso(isos: string[]): BCProduct[] {
  const isoSet = new Set(isos.map(s => s.toUpperCase()))
  return BC_PLANS.filter(p =>
    p.country?.some(c => isoSet.has(c.mcc.toUpperCase()))
  )
}

/** @deprecated 改用 searchBCPlansByIso */
export function searchBCPlansByMccs(mccs: string[]): BCProduct[] {
  return searchBCPlansByIso(mccs)
}
