'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, RefreshCw, ChevronRight, X, FileText, ExternalLink, ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'
import { useLanguage } from '@/components/language-provider'

export interface PriceTier {
  copies: string
  retailPrice: string
  settlementPrice: string
}

export interface ProductCountry {
  mcc: string
  name: string
  apn: string
  apnUsername?: string
  apnPassword?: string
  apnType?: string
  operatorInfo?: { operator: string; network: string; priority: string }[]
}

export interface Product {
  id: string
  sku_id: string
  name: string
  name_i18n: Record<string, string | null> | null
  type: string
  days: string | null
  capacity: string | null
  high_flow_size: string | null
  limit_flow_speed: string | null
  hotspot_support: string
  plan_type: string | null
  acceleration_support: string | null
  point_contact_type: string | null
  time_zone: string | null
  usage_count: string | null
  countries: ProductCountry[]
  prices: PriceTier[]
  cost_price: number | null
  retail_price: number | null
  desc_text: string | null
  desc_i18n: Record<string, string | null> | null
  is_active: boolean
  synced_at: string
}

const TYPE_KEYS: Record<string, string> = {
  '110': 'type.selfSelect', '111': 'type.fixed',
  '210': 'type.singleSIM',  '211': 'type.multiSIM', '212': 'type.physicalSIM',
  '230': 'type.esim',       '250': 'type.esimAir',
}

const ACCEL_LABELS: Record<string, string> = {
  '0': '不支持', '1': '支持SIM', '2': '支持eSIM', '3': '支持全部', '4': 'eSIM Air',
}

function formatCapacity(kb: string | null, perDay = false) {
  const suffix = perDay ? '/天' : ''
  if (!kb || kb === '') return perDay ? '無限/天' : '不限量'
  const val = parseFloat(kb)
  if (isNaN(val) || val === -1) return perDay ? '無限/天' : '不限量'
  const mb = val / 1024
  const str = mb >= 1024 ? `${(mb / 1024) % 1 === 0 ? mb / 1024 : (mb / 1024).toFixed(1)}GB` : `${mb % 1 === 0 ? mb : mb.toFixed(0)}MB`
  return `${str}${suffix}`
}

// ── 覆蓋國家表格彈窗 ────────────────────────────────────
function CoverageModal({ countries, onClose }: { countries: ProductCountry[]; onClose: () => void }) {
  const { convert, t } = useLanguage()
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">{t('coverage.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left whitespace-nowrap">{t('coverage.country')}</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">{t('coverage.operator')}</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">{t('coverage.priority')}</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">{t('coverage.network')}</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">APN</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">APN Username</th>
                <th className="px-4 py-3 text-left whitespace-nowrap">APN Password</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {countries.map(c => {
                const ops = c.operatorInfo ?? []
                if (ops.length === 0) {
                  return (
                    <tr key={c.mcc} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{convert(c.name)}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">—</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">—</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">—</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-mono text-xs">{c.apn || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{c.apnUsername || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{c.apnPassword || '—'}</td>
                    </tr>
                  )
                }
                return ops.map((op, i) => (
                  <tr key={`${c.mcc}-${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    {i === 0 && (
                      <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200" rowSpan={ops.length}>{convert(c.name)}</td>
                    )}
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{convert(op.operator)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{op.priority}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{op.network}</td>
                    {i === 0 && (
                      <>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-mono text-xs" rowSpan={ops.length}>{c.apn || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs" rowSpan={ops.length}>{c.apnUsername || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs" rowSpan={ops.length}>{c.apnPassword || '—'}</td>
                      </>
                    )}
                  </tr>
                ))
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm">{t('btn.close')}</button>
        </div>
      </div>
    </div>
  )
}

// ── 詳情彈窗 ──────────────────────────────────────────
function DetailModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [showCoverage, setShowCoverage] = useState(false)
  const { t, getI18n } = useLanguage()

  const planTypeLabel = product.plan_type === '0' ? t('planType.bulk') : product.plan_type === '1' ? t('planType.daily') : '—'
  const accelLabel = product.acceleration_support ? ACCEL_LABELS[product.acceleration_support] ?? '—' : '—'
  const hotspotLabel = product.hotspot_support === '1' ? t('detail.supported') : t('detail.notSupported')
  const usageLabel = product.usage_count === '1' ? t('detail.single') : product.usage_count === '2' ? t('detail.multiple') : '—'
  const dayTypeLabel = product.point_contact_type === '0' ? t('detail.24h') : product.point_contact_type === '1' ? t('detail.daily') : '—'

  return (
    <>
      {showCoverage && <CoverageModal countries={product.countries} onClose={() => setShowCoverage(false)} />}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-gray-100 dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-xl max-h-[88vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">{t('detail.title')}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
            {/* 區塊一：基本規格 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl px-5 py-4 space-y-3 text-sm">
              <InfoRow label={t('detail.skuId')} value={product.sku_id} mono />
              <InfoRow label={t('detail.name')} value={getI18n(product.name_i18n, product.name)} />
              <InfoRow label={t('detail.highFlow')} value={
                formatCapacity(product.high_flow_size ?? product.capacity, product.plan_type === '1')
              } />
              <InfoRow label={t('detail.speedCap')} value={product.limit_flow_speed ? `${product.limit_flow_speed}kbps` : '—'} />
              <InfoRow label={t('detail.planType')} value={planTypeLabel} />
              <InfoRow label={t('detail.accelSupport')} value={accelLabel} />
              <InfoRow label={t('detail.hotspot')} value={hotspotLabel} />
              <InfoRow label={t('detail.usageCount')} value={usageLabel} />
              <InfoRow label={t('detail.dayType')} value={dayTypeLabel} />
              <InfoRow label={t('detail.timezone')} value={product.time_zone ?? '—'} />
            </div>

            {/* 區塊二：描述 & 覆蓋 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl px-5 py-4 space-y-3 text-sm">
              {product.desc_text ? (
                <div>
                  <span className="text-gray-400 dark:text-gray-500 text-xs block mb-1">{t('detail.desc')}</span>
                  <div className="text-gray-700 dark:text-gray-300 leading-relaxed space-y-0.5">
                    {getI18n(product.desc_i18n, product.desc_text)
                      .split(/<br\s*\/?>/i)
                      .map((line, i) => <p key={i}>{line}</p>)}
                  </div>
                </div>
              ) : (
                <InfoRow label={t('detail.desc')} value="—" />
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-400 dark:text-gray-500">{t('detail.coverage')}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700 dark:text-gray-200">{product.countries.length}</span>
                  {product.countries.length > 0 && (
                    <button
                      onClick={() => setShowCoverage(true)}
                      className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline text-xs"
                    >
                      {t('common.viewDetail')}
                      <ExternalLink size={11} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 區塊三：退款政策 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl px-5 py-4 text-sm">
              <InfoRow label={t('detail.refund')} value="—" />
            </div>
          </div>

          <div className="px-6 py-4 flex justify-end flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm">{t('btn.close')}</button>
          </div>
        </div>
      </div>
    </>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">{label}</span>
      <span className={clsx('text-gray-800 dark:text-gray-200 text-right', mono && 'font-mono text-xs text-gray-500 dark:text-gray-400')}>{value}</span>
    </div>
  )
}

// ── 展開的價格列 ──────────────────────────────────────
function PriceRows({ prices, dayLabel }: { prices: PriceTier[]; dayLabel: string }) {
  if (prices.length === 0) return null
  return (
    <>
      {prices.map(tier => (
        <tr key={tier.copies} className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
          <td className="pl-10 py-2" />
          <td /><td /><td /><td />
          <td className="px-4 py-2 text-gray-500 dark:text-gray-400 text-sm">└ {tier.copies} {dayLabel}</td>
          <td className="px-4 py-2 text-right font-medium text-gray-700 dark:text-gray-200 text-sm">¥{tier.settlementPrice}</td>
          <td /><td />
        </tr>
      ))}
    </>
  )
}

// ── 主表格 ────────────────────────────────────────────
interface Props {
  products: Product[]
  onSync: () => Promise<void>
  onToggleActive: (skuId: string, active: boolean) => Promise<void>
  /** 隱藏同步按鈕（代理商模組用） */
  hideSync?: boolean
  /** 隱藏上架 toggle（代理商模組用） */
  hideToggle?: boolean
}

export function ProductTable({ products, onSync, onToggleActive, hideSync, hideToggle }: Props) {
  const { t, getI18n, convert } = useLanguage()
  const [search, setSearch] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)

  // Params filters
  const [daysLabels, setDaysLabels] = useState<Record<string, string>>({})
  const [capacityLabels, setCapacityLabels] = useState<Record<string, string>>({})
  const [filterDays, setFilterDays] = useState('')
  const [filterCapacity, setFilterCapacity] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/params/days').then(r => r.json()),
      fetch('/api/admin/params/capacities').then(r => r.json()),
    ]).then(([daysData, capData]) => {
      const dl: Record<string, string> = {}
      for (const d of (daysData.days ?? [])) dl[d.days] = d.label ?? `${d.days} 天`
      setDaysLabels(dl)
      const cl: Record<string, string> = {}
      for (const h of (capData.highFlowSizes ?? [])) cl[h.high_flow_size] = h.label ?? h.high_flow_size
      setCapacityLabels(cl)
    })
  }, [])

  // Days options from products (copies × days), label from params
  const daysOptions = useMemo(() => {
    const set = new Set<number>()
    products.forEach(p => {
      const unitDays = parseInt(p.days ?? '1')
      if (p.prices?.length) p.prices.forEach(t => set.add(unitDays * parseInt(t.copies)))
      else set.add(unitDays)
    })
    return Array.from(set).sort((a, b) => a - b)
      .map(v => ({ value: String(v), label: daysLabels[String(v)] ?? `${v} 天` }))
  }, [products, daysLabels])

  // Capacity options from products, label respects plan_type
  const capacityOptions = useMemo(() => {
    const map = new Map<string, boolean>() // value → isDaily
    products.forEach(p => {
      const key = p.high_flow_size ?? p.capacity
      if (key) map.set(key, p.plan_type === '1')
    })
    return Array.from(map.entries())
      .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
      .map(([v, isDaily]) => {
        const base = capacityLabels[v] ?? formatCapacity(v)
        const label = isDaily && !base.includes('/天') ? `${base}/天` : base
        return { value: v, label }
      })
  }, [products, capacityLabels])

  const filtered = useMemo(() => {
    return products.filter(p => {
      const q = search.toLowerCase()
      if (q && !getI18n(p.name_i18n, p.name).toLowerCase().includes(q) && !p.sku_id.includes(search)) return false
      if (filterDays && p.days !== filterDays) return false
      if (filterCapacity && p.high_flow_size !== filterCapacity && p.capacity !== filterCapacity) return false
      return true
    })
  }, [products, search, filterDays, filterCapacity, getI18n])

  function toggleExpand(skuId: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(skuId) ? next.delete(skuId) : next.add(skuId)
      return next
    })
  }

  async function handleSync() {
    setSyncing(true)
    await onSync()
    setSyncing(false)
  }

  return (
    <>
      {detailProduct && <DetailModal product={detailProduct} onClose={() => setDetailProduct(null)} />}

      <div className="flex flex-col gap-4">
        {/* 工具列 */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* 天數篩選 */}
          <div className="relative">
            <select
              value={filterDays}
              onChange={e => setFilterDays(e.target.value)}
              className={clsx(
                'appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500',
                filterDays ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
              )}
            >
              <option value="">天數</option>
              {daysOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* 流量篩選 */}
          <div className="relative">
            <select
              value={filterCapacity}
              onChange={e => setFilterCapacity(e.target.value)}
              className={clsx(
                'appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500',
                filterCapacity ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
              )}
            >
              <option value="">流量</option>
              {capacityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* 文字搜尋 */}
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder={t('common.search')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {!hideSync && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-60 ml-auto"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? t('btn.syncing') : t('btn.syncBC')}
            </button>
          )}
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400">{t('table.total', { n: filtered.length })}</p>

        {/* 表格 */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">{t('table.planName')}</th>
                <th className="px-4 py-3 text-left">{t('table.type')}</th>
                <th className="px-4 py-3 text-left">{t('table.traffic')}</th>
                <th className="px-4 py-3 text-left">{t('table.speedLimit')}</th>
                <th className="px-4 py-3 text-left">{t('table.countries')}</th>
                <th className="px-4 py-3 text-left">{t('table.days')}</th>
                <th className="px-4 py-3 text-right">{t('table.settlement')}</th>
                {!hideToggle && <th className="px-4 py-3 text-center">{t('table.listing')}</th>}
                <th className="px-4 py-3 text-center">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={hideToggle ? 8 : 9} className="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                    {products.length === 0 ? t('table.noData') : t('table.noMatch')}
                  </td>
                </tr>
              ) : (
                filtered.map(p => {
                  const expanded = expandedIds.has(p.sku_id)
                  const hasPrices = p.prices.length > 0
                  const typeKey = TYPE_KEYS[p.type]
                  const typeLabel = typeKey ? t(typeKey) : p.type
                  const planTypeLabel = p.plan_type === '0' ? t('planType.bulk') : p.plan_type === '1' ? t('planType.daily') : null

                  return (
                    <>
                      <tr key={p.sku_id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        {/* 套餐名稱 */}
                        <td className="px-4 py-3 max-w-xs">
                          <div className="flex items-start gap-2">
                            <button
                              onClick={() => hasPrices && toggleExpand(p.sku_id)}
                              className={clsx(
                                'mt-0.5 flex-shrink-0 transition-transform duration-150',
                                expanded ? 'rotate-90' : '',
                                hasPrices ? 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300' : 'text-gray-200 dark:text-gray-700 cursor-default'
                              )}
                            >
                              <ChevronRight size={15} />
                            </button>
                            <div>
                              <div className="font-medium text-gray-800 dark:text-gray-100 truncate max-w-[220px]">
                                {getI18n(p.name_i18n, p.name)}
                              </div>
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{p.sku_id}</div>
                            </div>
                          </div>
                        </td>

                        {/* 類型 */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded text-xs w-fit">
                              {typeLabel}
                            </span>
                            {planTypeLabel && (
                              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs w-fit">
                                {planTypeLabel}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 流量 */}
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">
                          {formatCapacity(p.high_flow_size ?? p.capacity, p.plan_type === '1')}
                        </td>

                        {/* 限速 */}
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                          {p.limit_flow_speed ? `${p.limit_flow_speed}kbps` : '—'}
                        </td>

                        {/* 國家 */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 max-w-[160px]">
                            {p.countries.slice(0, 2).map(c => (
                              <span key={c.mcc} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">
                                {convert(c.name)}
                              </span>
                            ))}
                            {p.countries.length > 2 && (
                              <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded text-xs">
                                +{p.countries.length - 2}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 天數（規格數） */}
                        <td className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">
                          {p.prices.length > 0 ? t('table.specs', { n: p.prices.length }) : '—'}
                        </td>

                        {/* 結算價（閉合不顯示） */}
                        <td className="px-4 py-3" />

                        {/* 上架 */}
                        {!hideToggle && (
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => onToggleActive(p.sku_id, !p.is_active)}
                              className={clsx(
                                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                                p.is_active ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
                              )}
                            >
                              <span className={clsx(
                                'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                                p.is_active ? 'translate-x-[18px]' : 'translate-x-[3px]'
                              )} />
                            </button>
                          </td>
                        )}

                        {/* 操作 */}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setDetailProduct(p)}
                            className="p-1.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400"
                            title={t('detail.title')}
                          >
                            <FileText size={15} />
                          </button>
                        </td>
                      </tr>

                      {expanded && hasPrices && <PriceRows prices={p.prices} dayLabel={t('common.days')} />}
                    </>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
