'use client'

import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { ChevronDown, ChevronRight, Loader2, Search, X, Check, FileText } from 'lucide-react'
import { clsx } from 'clsx'

// ── Types ──────────────────────────────────────────────────────────────

interface Product {
  sku_id: string
  name: string
  type: string
  plan_type: string | null       // '0' 總量型, '1' 單日型
  days: string | null
  capacity: string | null
  high_flow_size: string | null
  limit_flow_speed: string | null
  hotspot_support: string | null
  desc_text: string | null
  cost_price: number | null
  retail_price: number | null
  countries: { mcc: string; name: string }[]
  prices: { copies: string; retailPrice: string; settlementPrice: string }[]
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatKB(kb: string | null, perDay = false): string {
  if (!kb) return '—'
  const val = parseFloat(kb)
  const suffix = perDay ? '/天' : ''
  if (isNaN(val) || val === -1) return perDay ? '無限/天' : '無限流量'
  if (val >= 1048576) return `${val / 1048576 % 1 === 0 ? val / 1048576 : (val / 1048576).toFixed(1)} GB${suffix}`
  if (val >= 1024) return `${val / 1024 % 1 === 0 ? val / 1024 : (val / 1024).toFixed(1)} MB${suffix}`
  return `${val} KB${suffix}`
}

const ESIM_TYPES = ['230', '3105', '3106']

function formatSpeed(kbps: string | null): string {
  if (!kbps) return '—'
  const v = parseFloat(kbps)
  if (isNaN(v) || v === -1) return '不限速'
  if (v === 0) return '斷網'
  if (v >= 1024) return `${v / 1024 % 1 === 0 ? v / 1024 : (v / 1024).toFixed(1)} Mbps`
  return `${v} kbps`
}

function getUnitPrice(product: Product, copies: number): number {
  if (product.prices?.length) {
    const match = product.prices.find(p => p.copies === String(copies))
    if (match) return parseFloat(match.settlementPrice)
    return parseFloat(product.prices[product.prices.length - 1].settlementPrice)
  }
  return product.cost_price ?? 0
}

// ── CountryMultiSelect ─────────────────────────────────────────────────

function CountryMultiSelect({
  options,
  selected,
  onChange,
}: {
  options: { value: string; label: string }[]
  selected: string[]   // MCCs
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q ? options.filter(o => o.label.toLowerCase().includes(q)) : options
  }, [options, search])

  function toggle(mcc: string) {
    onChange(selected.includes(mcc) ? selected.filter(s => s !== mcc) : [...selected, mcc])
  }

  const labelOf = (mcc: string) => options.find(o => o.value === mcc)?.label ?? mcc

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={clsx(
          'w-full text-left px-4 py-3 pr-10 rounded-xl border text-sm transition-colors focus:outline-none',
          'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
          selected.length > 0 ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
        )}
      >
        {selected.length > 0 ? (
          <span className="flex items-center gap-1.5 flex-wrap">
            {selected.slice(0, 3).map(mcc => (
              <span key={mcc} className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md text-xs font-medium">
                {labelOf(mcc)}
                <X size={12} className="cursor-pointer" onClick={e => { e.stopPropagation(); toggle(mcc) }} />
              </span>
            ))}
            {selected.length > 3 && <span className="text-xs text-gray-400">+{selected.length - 3}</span>}
          </span>
        ) : '搜索國家或地區（可多選）'}
      </button>
      <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜索國家..."
                autoFocus
                className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 rounded-lg focus:outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400"
              />
            </div>
          </div>
          {selected.length > 0 && (
            <div className="px-3 py-1.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
              <span className="text-xs text-gray-500">已選 {selected.length} 個</span>
              <button onClick={() => onChange([])} className="text-xs text-indigo-500 hover:text-indigo-700">清除全部</button>
            </div>
          )}
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400 text-center">無匹配結果</div>
            ) : filtered.map(opt => {
              const sel = selected.includes(opt.value)
              return (
                <button key={opt.value} type="button" onClick={() => toggle(opt.value)}
                  className={clsx(
                    'w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors',
                    sel ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
                  )}
                >
                  <div className={clsx('w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                    sel ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600')}>
                    {sel && <Check size={12} className="text-white" />}
                  </div>
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── DetailModal ────────────────────────────────────────────────────────

function DetailModal({ product, onClose }: { product: Product; onClose: () => void }) {
  function Row({ label, value }: { label: string; value: string }) {
    return (
      <div className="flex items-start justify-between gap-4 text-sm">
        <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">{label}</span>
        <span className="text-gray-800 dark:text-gray-200 text-right">{value}</span>
      </div>
    )
  }

  const planTypeLabel = product.plan_type === '0' ? '總量型' : product.plan_type === '1' ? '單日型' : '—'
  const hotspotLabel = product.hotspot_support === '1' ? '支援' : product.hotspot_support === '0' ? '不支援' : '—'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-gray-100 dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[88vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">套餐詳情</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
          {/* 基本規格 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl px-5 py-4 space-y-3">
            <Row label="SKU ID" value={product.sku_id} />
            <Row label="套餐名稱" value={product.name} />
            <Row label="計費類型" value={planTypeLabel} />
            <Row label="流量" value={formatKB(product.high_flow_size ?? product.capacity, product.plan_type === '1')} />
            <Row label="限速" value={formatSpeed(product.limit_flow_speed)} />
            <Row label="熱點分享" value={hotspotLabel} />
          </div>

          {/* 規格價格 */}
          {product.prices?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl px-5 py-4">
              <div className="text-xs text-gray-400 dark:text-gray-500 mb-3">規格 / 價格</div>
              <div className="space-y-2">
                {product.prices.map(tier => {
                  const totalDays = parseInt(product.days ?? '1') * parseInt(tier.copies)
                  return (
                    <div key={tier.copies} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">{totalDays} 天</span>
                      <span className="font-medium text-gray-800 dark:text-gray-100">¥{parseFloat(tier.settlementPrice).toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 適用國家 */}
          {(product.countries?.length ?? 0) > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl px-5 py-4">
              <div className="text-xs text-gray-400 dark:text-gray-500 mb-3">適用國家（{product.countries.length}）</div>
              <div className="flex flex-wrap gap-1.5">
                {product.countries.map(c => (
                  <span key={c.mcc} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-md">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 描述 */}
          {product.desc_text && (
            <div className="bg-white dark:bg-gray-800 rounded-xl px-5 py-4">
              <div className="text-xs text-gray-400 dark:text-gray-500 mb-2">套餐描述</div>
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed space-y-1">
                {product.desc_text.split(/<br\s*\/?>/i).map((line, i) => <p key={i}>{line}</p>)}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm">
            關閉
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ProductTable ───────────────────────────────────────────────────────

function ProductTable({
  products,
  filterDays,
  selectedProduct,
  selectedCopies,
  onSelect,
  emptyText,
}: {
  products: Product[]
  filterDays: string
  selectedProduct: Product | null
  selectedCopies: number
  onSelect: (p: Product, copies: number) => void
  emptyText: string
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)

  function toggleExpand(skuId: string, e: React.MouseEvent) {
    e.stopPropagation()
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(skuId) ? next.delete(skuId) : next.add(skuId)
      return next
    })
  }

  // When a days filter is active, find the matching tier for a product
  function getMatchingTier(p: Product) {
    if (!filterDays) return null
    const target = parseInt(filterDays)
    const unitDays = parseInt(p.days ?? '1')
    return p.prices?.find(t => unitDays * parseInt(t.copies) === target) ?? null
  }

  function CountryTags({ countries }: { countries: { mcc: string; name: string }[] }) {
    return (
      <div className="flex flex-wrap gap-1 max-w-[200px]">
        {countries.slice(0, 3).map(c => (
          <span key={c.mcc} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">{c.name}</span>
        ))}
        {countries.length > 3 && <span className="text-xs text-gray-400">+{countries.length - 3}</span>}
      </div>
    )
  }

  const COLS = 7

  return (
    <>
    {detailProduct && <DetailModal product={detailProduct} onClose={() => setDetailProduct(null)} />}
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs">
          <tr>
            <th className="text-left px-4 py-3 font-medium">套餐名稱</th>
            <th className="text-center px-4 py-3 font-medium">流量</th>
            <th className="text-center px-4 py-3 font-medium">限速</th>
            <th className="text-left px-4 py-3 font-medium">適用國家</th>
            <th className="text-center px-4 py-3 font-medium">天數</th>
            <th className="text-right px-4 py-3 font-medium">結算價</th>
            <th className="text-center px-4 py-3 font-medium">詳情</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td colSpan={COLS} className="text-center py-12 text-gray-400 text-sm">{emptyText}</td>
            </tr>
          ) : products.map(p => {
            const isSelected = selectedProduct?.sku_id === p.sku_id
            const expanded = expandedIds.has(p.sku_id)
            const matchingTier = getMatchingTier(p)
            const hasPrices = (p.prices?.length ?? 0) > 0

            const capacityCell = <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300 text-xs">{formatKB(p.high_flow_size ?? p.capacity, p.plan_type === '1')}</td>
            const speedCell = <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400 text-xs">{formatSpeed(p.limit_flow_speed)}</td>
            const countryCell = <td className="px-4 py-3"><CountryTags countries={p.countries ?? []} /></td>
            const detailCell = (
              <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setDetailProduct(p)}
                  className="p-1.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400"
                >
                  <FileText size={14} />
                </button>
              </td>
            )

            // Days filter active → show matching tier inline
            if (filterDays && matchingTier) {
              const totalDays = parseInt(p.days ?? '1') * parseInt(matchingTier.copies)
              const tierCopies = parseInt(matchingTier.copies)
              return (
                <tr
                  key={p.sku_id}
                  onClick={() => onSelect(p, tierCopies)}
                  className={clsx(
                    'border-t border-gray-100 dark:border-gray-800 cursor-pointer transition-colors',
                    isSelected && selectedCopies === tierCopies
                      ? 'bg-indigo-50 dark:bg-indigo-900/20'
                      : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  )}
                >
                  <td className="px-4 py-3">
                    <div className={clsx('font-medium', isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-100')}>{p.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{p.sku_id}</div>
                  </td>
                  {capacityCell}
                  {speedCell}
                  {countryCell}
                  <td className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-200">{totalDays} 天</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-gray-100">
                    ¥{parseFloat(matchingTier.settlementPrice).toFixed(2)}
                  </td>
                  {detailCell}
                </tr>
              )
            }

            // No days filter → collapsible
            return (
              <React.Fragment key={p.sku_id}>
                <tr className={clsx(
                  'border-t border-gray-100 dark:border-gray-800 transition-colors',
                  isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                )}>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <button
                        onClick={e => hasPrices && toggleExpand(p.sku_id, e)}
                        className={clsx(
                          'mt-0.5 flex-shrink-0 transition-transform duration-150',
                          expanded ? 'rotate-90' : '',
                          hasPrices ? 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300' : 'text-gray-200 dark:text-gray-700 cursor-default'
                        )}
                      >
                        <ChevronRight size={15} />
                      </button>
                      <div>
                        <div className={clsx('font-medium', isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-100')}>{p.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{p.sku_id}</div>
                      </div>
                    </div>
                  </td>
                  {capacityCell}
                  {speedCell}
                  {countryCell}
                  <td className="px-4 py-3 text-center text-gray-400 text-xs">
                    {hasPrices ? `${p.prices.length} 規格` : (p.days ? `${p.days} 天` : '—')}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 text-xs">
                    {hasPrices ? '展開查看' : '—'}
                  </td>
                  {detailCell}
                </tr>

                {expanded && hasPrices && p.prices.map(tier => {
                  const tierCopies = parseInt(tier.copies)
                  const totalDays = parseInt(p.days ?? '1') * tierCopies
                  const isTierSelected = isSelected && selectedCopies === tierCopies
                  return (
                    <tr
                      key={tier.copies}
                      onClick={() => onSelect(p, tierCopies)}
                      className={clsx(
                        'border-t border-gray-100 dark:border-gray-800 cursor-pointer transition-colors',
                        isTierSelected
                          ? 'bg-indigo-50 dark:bg-indigo-900/20'
                          : 'bg-gray-50/60 dark:bg-gray-800/30 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10'
                      )}
                    >
                      <td className="pl-10 pr-4 py-2" colSpan={3} />
                      <td className="px-4 py-2" />
                      <td className="px-4 py-2 text-center text-gray-600 dark:text-gray-300 text-xs font-medium">{totalDays} 天</td>
                      <td className={clsx('px-4 py-2 text-right text-sm font-medium', isTierSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-800 dark:text-gray-100')}>
                        ¥{parseFloat(tier.settlementPrice).toFixed(2)}
                      </td>
                      <td />
                    </tr>
                  )
                })}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
    </>
  )
}

// ── FilterSelect ───────────────────────────────────────────────────────

function FilterSelect({
  placeholder, options, value, onChange,
}: {
  placeholder: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={clsx(
          'w-full appearance-none px-4 py-3 pr-10 rounded-xl border text-sm transition-colors focus:outline-none',
          'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
          value ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
        )}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────

export default function CreateEsimOrderPage() {
  const router = useRouter()

  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [productsLoaded, setProductsLoaded] = useState(false)

  // Labels from params DB (for display only)
  const [daysLabels, setDaysLabels] = useState<Record<string, string>>({})
  const [capacityLabels, setCapacityLabels] = useState<Record<string, string>>({})
  const [countriesParams, setCountriesParams] = useState<{ mcc: string; name: string }[]>([])

  // Filters
  const [filterCountries, setFilterCountries] = useState<string[]>([])
  const [countryMode, setCountryMode] = useState<'any' | 'all'>('any')  // 模糊=any, 精準=all
  const [filterDays, setFilterDays] = useState('')
  const [filterCapacity, setFilterCapacity] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Selected product, copies (規格) & quantity (eSIM 數量)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [copies, setCopies] = useState(1)      // planSkuCopies — 買幾份（對應天數）
  const [quantity, setQuantity] = useState(1)  // number — 建立幾張 eSIM

  // More options
  const [showMore, setShowMore] = useState(false)
  const [email, setEmail] = useState('')
  const [agentId, setAgentId] = useState('')
  const [estimatedUseTime, setEstimatedUseTime] = useState('')
  const [comment, setComment] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  // Load params only on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/admin/params/days').then(r => r.json()),
      fetch('/api/admin/params/capacities').then(r => r.json()),
      fetch('/api/admin/params/countries').then(r => r.json()),
    ]).then(([daysData, capData, countryData]) => {
      const dl: Record<string, string> = {}
      for (const d of (daysData.days ?? [])) dl[d.days] = d.label ?? `${d.days} 天`
      setDaysLabels(dl)
      const cl: Record<string, string> = {}
      for (const h of (capData.highFlowSizes ?? [])) cl[h.high_flow_size] = h.label ?? formatKB(h.high_flow_size)
      setCapacityLabels(cl)
      setCountriesParams(countryData.countries ?? [])
    })
  }, [])

  // Load products only after first country is selected
  useEffect(() => {
    if (filterCountries.length === 0 || productsLoaded) return
    setLoadingProducts(true)
    fetch('/api/admin/products?types=230,3105,3106')
      .then(r => r.json())
      .then(prodData => {
        setProducts(prodData.products ?? [])
        setProductsLoaded(true)
      })
      .finally(() => setLoadingProducts(false))
  }, [filterCountries, productsLoaded])

  const tabProducts = useMemo(() => {
    return products.filter(p => ESIM_TYPES.includes(p.type))
  }, [products])

  // Country options: all bc_countries params (MCC as value, name as label)
  const countryOptions = useMemo(() => {
    return countriesParams.map(c => ({ value: c.mcc, label: c.name }))
  }, [countriesParams])

  // Days options: 從每個商品的 prices tiers 展開總天數 (copies × days)
  const daysOptions = useMemo(() => {
    const set = new Set<number>()
    tabProducts.forEach(p => {
      const unitDays = parseInt(p.days ?? '1')
      if (p.prices?.length) {
        p.prices.forEach(t => set.add(unitDays * parseInt(t.copies)))
      } else {
        set.add(unitDays)
      }
    })
    return Array.from(set)
      .sort((a, b) => a - b)
      .map(v => ({ value: String(v), label: daysLabels[String(v)] ?? `${v} 天` }))
  }, [tabProducts, daysLabels])

  // Capacity options: unique high_flow_size values from tab products, label from params map
  // Track whether each value comes from daily (plan_type=1) or total (plan_type=0) products
  const capacityOptions = useMemo(() => {
    const map = new Map<string, boolean>() // value → isDaily
    tabProducts.forEach(p => {
      if (p.high_flow_size) map.set(p.high_flow_size, p.plan_type === '1')
    })
    return Array.from(map.entries())
      .sort(([a], [b]) => parseFloat(a) - parseFloat(b))
      .map(([v, isDaily]) => {
        const base = capacityLabels[v] ?? formatKB(v)
        const label = isDaily && !base.includes('/天') ? `${base}/天` : base
        return { value: v, label }
      })
  }, [tabProducts, capacityLabels])

  // Filtered + searched results
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return tabProducts.filter(p => {
      if (filterCountries.length > 0) {
        const mccs = p.countries?.map(c => c.mcc) ?? []
        const match = countryMode === 'all'
          ? filterCountries.every(mcc => mccs.includes(mcc))
          : filterCountries.some(mcc => mccs.includes(mcc))
        if (!match) return false
      }
      if (filterDays) {
        const target = parseInt(filterDays)
        const unitDays = parseInt(p.days ?? '1')
        const hasTier = p.prices?.some(t => unitDays * parseInt(t.copies) === target)
        const isFixed = !p.prices?.length && unitDays === target
        if (!hasTier && !isFixed) return false
      }
      if (filterCapacity && p.high_flow_size !== filterCapacity) return false
      if (q && !p.name.toLowerCase().includes(q) && !p.sku_id.toLowerCase().includes(q)) return false
      return true
    })
  }, [tabProducts, filterCountries, countryMode, filterDays, filterCapacity, searchQuery])

const unitPrice = selectedProduct ? getUnitPrice(selectedProduct, copies) : 0
  const totalAmount = unitPrice * quantity

  async function handleSubmit() {
    if (!selectedProduct) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/admin/esim-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agentId || undefined,
          email: email || undefined,
          estimatedUseTime: estimatedUseTime || undefined,
          comment: comment || undefined,
          items: [{
            skuId: selectedProduct.sku_id,
            copies,
            number: quantity,
            unitPrice,
          }],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '建立失敗')
      router.push('/purchase-esim-orders')
    } catch (err) {
      setSubmitError(String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      <Header breadcrumb={['eSIM 訂單', '創建訂單']} />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loadingProducts ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" /> 載入商品中…
          </div>
        ) : !productsLoaded ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <CountryMultiSelect
                options={countryOptions}
                selected={filterCountries}
                onChange={setFilterCountries}
              />
              <FilterSelect placeholder="選擇天數" options={[]} value="" onChange={() => {}} />
              <FilterSelect placeholder="選擇流量" options={[]} value="" onChange={() => {}} />
            </div>
            <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
              請先選擇國家以搜尋套餐
            </div>
          </div>
        ) : (
          <div className="space-y-4">

            {/* Filters row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <CountryMultiSelect
                  options={countryOptions}
                  selected={filterCountries}
                  onChange={setFilterCountries}
                />
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="text-xs text-gray-400">搜索模式：</span>
                  <button
                    type="button"
                    onClick={() => setCountryMode('any')}
                    className={clsx(
                      'text-xs px-2 py-0.5 rounded-md transition-colors',
                      countryMode === 'any'
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    )}
                  >模糊</button>
                  <button
                    type="button"
                    onClick={() => setCountryMode('all')}
                    className={clsx(
                      'text-xs px-2 py-0.5 rounded-md transition-colors',
                      countryMode === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    )}
                  >精準</button>
                </div>
              </div>
              <FilterSelect
                placeholder="選擇天數"
                options={daysOptions}
                value={filterDays}
                onChange={setFilterDays}
              />
              <FilterSelect
                placeholder="選擇流量"
                options={capacityOptions}
                value={filterCapacity}
                onChange={setFilterCapacity}
              />
            </div>

            {/* Search + summary */}
            <div>
              <div className="relative">
                <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="搜索套餐名稱或ID"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5 pl-1">
                {filteredProducts.length > 0
                  ? `符合條件的套餐：${filteredProducts.length} 個`
                  : '無符合條件的套餐'}
              </p>
            </div>

            {/* Product table */}
            <ProductTable
              products={filteredProducts}
              filterDays={filterDays}
              selectedProduct={selectedProduct}
              selectedCopies={copies}
              onSelect={(p, c) => { setSelectedProduct(p); setCopies(c); setQuantity(1) }}
              emptyText={searchQuery || filterCountries.length || filterDays || filterCapacity ? '無符合條件的套餐' : '此分類無套餐資料'}
            />

            {/* Selected product actions */}
            {selectedProduct && (
              <div className="bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">{selectedProduct.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{selectedProduct.sku_id}</div>
                  </div>
                  <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X size={16} />
                  </button>
                </div>

                {/* 規格選擇（copies = planSkuCopies） */}
                {selectedProduct.prices?.length > 0 && (
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">選擇規格</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.prices.map(tier => {
                        const tierCopies = parseInt(tier.copies)
                        const totalDays = selectedProduct.days ? tierCopies * parseInt(selectedProduct.days) : tierCopies
                        const isActive = copies === tierCopies
                        return (
                          <button
                            key={tier.copies}
                            type="button"
                            onClick={() => setCopies(tierCopies)}
                            className={clsx(
                              'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                              isActive
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-indigo-400'
                            )}
                          >
                            <span className="font-medium">{totalDays} 天</span>
                            <span className={clsx('ml-1.5 text-xs', isActive ? 'text-indigo-200' : 'text-gray-400')}>
                              ¥{parseFloat(tier.settlementPrice).toFixed(2)}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}


                <div className="flex items-center gap-6 flex-wrap">
                  {/* Quantity */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">套餐數量：</span>
                    <div className="flex items-center">
                      <button
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="w-8 h-8 flex items-center justify-center rounded-l-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >−</button>
                      <input
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-14 h-8 text-center border-t border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none"
                      />
                      <button
                        onClick={() => setQuantity(q => q + 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-r-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >+</button>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">訂單金額：</span>
                    <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                      ¥{totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* More options */}
                <div>
                  <button
                    onClick={() => setShowMore(v => !v)}
                    className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
                  >
                    更多選項（選填）
                    {showMore ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>

                  {showMore && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">代理商 ID</label>
                        <input value={agentId} onChange={e => setAgentId(e.target.value)} placeholder="留空為後台直購"
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">客戶 Email</label>
                        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="用於發送 eSIM 資料"
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">預計使用日期</label>
                        <input type="date" value={estimatedUseTime} onChange={e => setEstimatedUseTime(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">備註</label>
                        <input value={comment} onChange={e => setComment(e.target.value)} placeholder="備註"
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400" />
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end">
        {submitError && (
          <p className="text-sm text-red-500 dark:text-red-400 mr-4">{submitError}</p>
        )}
        <button
          onClick={handleSubmit}
          disabled={!selectedProduct || submitting}
          className={clsx(
            'px-8 py-2.5 rounded-xl text-sm font-semibold transition-colors',
            !selectedProduct || submitting
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          )}
        >
          {submitting
            ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> 建立中…</span>
            : '確認創建'}
        </button>
      </div>
    </div>
  )
}
