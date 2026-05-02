'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Search,
  ChevronDown, ChevronRight, X, Zap,
} from 'lucide-react'
import { PRODUCTS, type Product, type DailyPlan, type FixedPlan } from '@/lib/products'
import { COUNTRIES } from '@/lib/countries'
import { getMCC } from '@/lib/mcc'
import { clsx } from 'clsx'

type ProductRow = Product & { enabled: boolean }

const ESIM_TYPES = ['110', '111', '210', '211', '212', '220', '221', '230', '250', '311']

// ── Supabase 商品結構 ──────────────────────────────────────────────────

interface DbProduct {
  sku_id: string
  name: string
  name_i18n: { en?: string } | null
  plan_type: string | null
  days: string | null
  capacity: string | null
  high_flow_size: string | null
  prices: { copies: string; retailPrice: string }[] | null
  retail_price: number | null
  countries: { mcc: string; name: string }[] | null
  type: string
}

function resolvePrice(p: DbProduct): number {
  if (p.retail_price != null) return Math.round(Number(p.retail_price))
  const tier = (p.prices ?? []).find(x => x.copies === '1') ?? (p.prices ?? [])[0]
  return tier ? Math.round(Number(tier.retailPrice)) : 0
}

function dbToPlans(selected: DbProduct[]): { daily: DailyPlan[]; fixed: FixedPlan[] } {
  const daily: DailyPlan[] = []
  const fixed: FixedPlan[] = []
  for (const p of selected) {
    if (p.plan_type === '1' && p.high_flow_size) {
      const mb = Number(p.high_flow_size)
      const speedLabel = mb < 1024 ? `${mb} MB/日` : `${mb / 1024} GB/日`
      const speedKey = mb < 1024 ? `${mb}mb` : `${mb / 1024}gb`
      daily.push({ type: 'daily', speedKey, speedLabel, pricePerDay: resolvePrice(p) })
    } else if (p.plan_type === '0' && p.capacity && p.days) {
      const gb = Number(p.capacity) / 1024
      const days = Number(p.days)
      fixed.push({ type: 'fixed', id: p.sku_id, gb, days, price: resolvePrice(p) })
    }
  }
  return { daily, fixed }
}

// 國家選項（全部，BC 用 2碼 ISO 作為國碼）
const COUNTRY_OPTIONS = COUNTRIES
  .map(c => ({ iso: c.iso, zh: c.zh, en: c.en }))

// ── Edit Drawer ────────────────────────────────────────────────────────

function EditDrawer({
  product,
  onClose,
  onSave,
}: {
  product: ProductRow
  onClose: () => void
  onSave: (p: ProductRow) => void
}) {
  const [nameZh, setNameZh] = useState(product.nameZh)
  const [nameEn, setNameEn] = useState(product.nameEn)
  const [selectedIso, setSelectedIso] = useState(product.iso)

  const countryCode = selectedIso.toUpperCase() // BC 用 2碼大寫 ISO

  const [searchResults, setSearchResults] = useState<DbProduct[]>([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set())
  const [parsedDaily, setParsedDaily] = useState<DailyPlan[]>(product.dailyPlans)
  const [parsedFixed, setParsedFixed] = useState<FixedPlan[]>(product.fixedPlans)
  const [parsed, setParsed] = useState(false)

  const dailyResults = searchResults.filter(p => p.plan_type === '1')
  const fixedResults = searchResults.filter(p => p.plan_type === '0')

  async function handleSearch() {
    setSearching(true)
    setHasSearched(false)
    setSelectedSkus(new Set())
    setSearchResults([])
    try {
      const res = await fetch(`/api/admin/products?types=${ESIM_TYPES.join(',')}`)
      const data = await res.json()
      const filtered = (data.products as DbProduct[]).filter(p =>
        p.countries?.some(c => c.mcc.toUpperCase() === countryCode)
      )
      setSearchResults(filtered)
    } finally {
      setSearching(false)
      setHasSearched(true)
    }
  }

  function toggleSku(skuId: string) {
    setSelectedSkus(prev => {
      const next = new Set(prev)
      next.has(skuId) ? next.delete(skuId) : next.add(skuId)
      return next
    })
  }

  function selectAll(list: DbProduct[]) {
    setSelectedSkus(prev => {
      const next = new Set(prev)
      list.forEach(p => next.add(p.sku_id))
      return next
    })
  }

  function clearAll(list: DbProduct[]) {
    setSelectedSkus(prev => {
      const next = new Set(prev)
      list.forEach(p => next.delete(p.sku_id))
      return next
    })
  }

  function handleParse() {
    const selected = searchResults.filter(p => selectedSkus.has(p.sku_id))
    const { daily, fixed } = dbToPlans(selected)
    setParsedDaily(daily)
    setParsedFixed(fixed)
    setParsed(true)
  }

  function handleSave() {
    onSave({ ...product, nameZh, nameEn, iso: selectedIso, dailyPlans: parsedDaily, fixedPlans: parsedFixed })
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[540px] bg-white dark:bg-gray-900 h-full flex flex-col border-l border-gray-200 dark:border-gray-700 shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">編輯 eSIM 商品</div>
            <div className="text-xs text-gray-400 mt-0.5">{product.id}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── 基本資訊 ── */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">基本資訊</div>

            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">商品名稱（中文）</label>
              <input
                value={nameZh}
                onChange={e => setNameZh(e.target.value)}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">商品名稱（英文）</label>
              <input
                value={nameEn}
                onChange={e => setNameEn(e.target.value)}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">選擇國家</label>
                <select
                  value={selectedIso}
                  onChange={e => {
                    setSelectedIso(e.target.value)
                    setHasSearched(false)
                    setSearchResults([])
                    setSelectedSkus(new Set())
                  }}
                  className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                >
                  {COUNTRY_OPTIONS.map(c => (
                    <option key={c.iso} value={c.iso}>
                      {c.zh}（{c.iso.toUpperCase()}）
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">選擇類型</label>
                <div className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 select-none">
                  eSIM
                </div>
              </div>
            </div>
          </div>

          {/* ── 搜尋按鈕 ── */}
          <button
            onClick={handleSearch}
            disabled={searching}
            className={clsx(
              'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
              !searching
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
            )}
          >
            <Search size={14} />
            {searching ? '搜尋中…' : '搜尋'}
          </button>

          {/* ── 搜尋列表 ── */}
          {hasSearched && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  搜尋列表
                  <span className="ml-2 font-normal normal-case text-gray-400">共 {searchResults.length} 筆</span>
                </div>
                {searchResults.length > 0 && (
                  <div className="flex items-center gap-3 text-[11px]">
                    <button onClick={() => selectAll(searchResults)} className="text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300">全選</button>
                    <button onClick={() => clearAll(searchResults)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">清除</button>
                  </div>
                )}
              </div>

              {searchResults.length === 0 && (
                <div className="text-xs text-gray-400 text-center py-6 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                  查無符合的套餐
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">

                  {/* 日費方案 */}
                  {dailyResults.length > 0 && (
                    <>
                      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">日費方案</span>
                        <div className="flex gap-3 text-[11px]">
                          <button onClick={() => selectAll(dailyResults)} className="text-indigo-500 hover:text-indigo-700">全選</button>
                          <button onClick={() => clearAll(dailyResults)} className="text-gray-400 hover:text-gray-600">清除</button>
                        </div>
                      </div>
                      {dailyResults.map((p, i) => {
                        const mb = Number(p.high_flow_size ?? 0)
                        const spec = mb >= 1024 ? `${mb / 1024} GB/日` : `${mb} MB/日`
                        const coverage = (p.countries ?? []).map(c => c.name).join('・') || '—'
                        const checked = selectedSkus.has(p.sku_id)
                        return (
                          <label
                            key={p.sku_id}
                            className={clsx(
                              'flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors',
                              i < dailyResults.length - 1 && 'border-b border-gray-50 dark:border-gray-800',
                              checked ? 'bg-indigo-50/60 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'
                            )}
                          >
                            <input type="checkbox" checked={checked} onChange={() => toggleSku(p.sku_id)}
                              className="w-3.5 h-3.5 rounded accent-indigo-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</div>
                              <div className="text-xs text-gray-400 mt-0.5 truncate">{coverage}</div>
                            </div>
                            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex-shrink-0">{spec}</span>
                            <span className="font-mono text-[10px] text-gray-300 dark:text-gray-600 flex-shrink-0">{p.sku_id}</span>
                          </label>
                        )
                      })}
                    </>
                  )}

                  {/* 固定方案 */}
                  {fixedResults.length > 0 && (
                    <>
                      <div className={clsx(
                        'flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/60',
                        dailyResults.length > 0 && 'border-t border-gray-200 dark:border-gray-700',
                        'border-b border-gray-100 dark:border-gray-800'
                      )}>
                        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">固定方案</span>
                        <div className="flex gap-3 text-[11px]">
                          <button onClick={() => selectAll(fixedResults)} className="text-indigo-500 hover:text-indigo-700">全選</button>
                          <button onClick={() => clearAll(fixedResults)} className="text-gray-400 hover:text-gray-600">清除</button>
                        </div>
                      </div>
                      {fixedResults.map((p, i) => {
                        const gb = Number(p.capacity ?? 0) / 1024
                        const days = p.days ?? '?'
                        const coverage = (p.countries ?? []).map(c => c.name).join('・') || '—'
                        const checked = selectedSkus.has(p.sku_id)
                        return (
                          <label
                            key={p.sku_id}
                            className={clsx(
                              'flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors',
                              i < fixedResults.length - 1 && 'border-b border-gray-50 dark:border-gray-800',
                              checked ? 'bg-indigo-50/60 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'
                            )}
                          >
                            <input type="checkbox" checked={checked} onChange={() => toggleSku(p.sku_id)}
                              className="w-3.5 h-3.5 rounded accent-indigo-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</div>
                              <div className="text-xs text-gray-400 mt-0.5 truncate">{coverage}</div>
                            </div>
                            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex-shrink-0">{gb}GB/{days}天</span>
                            <span className="font-mono text-[10px] text-gray-300 dark:text-gray-600 flex-shrink-0">{p.sku_id}</span>
                          </label>
                        )
                      })}
                    </>
                  )}
                </div>
              )}

              {/* 解析按鈕 */}
              {selectedSkus.size > 0 && (
                <button
                  onClick={handleParse}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  <Zap size={13} />
                  解析所選商品（{selectedSkus.size} 筆）
                </button>
              )}
            </div>
          )}

          {/* ── 解析結果 ── */}
          {parsed && (
            <div className="rounded-xl border border-green-200 dark:border-green-900 bg-green-50/60 dark:bg-green-900/10 p-4 space-y-3">
              <div className="text-xs font-semibold text-green-700 dark:text-green-400">解析結果</div>
              {parsedDaily.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">日費方案（{parsedDaily.length} 種）</div>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedDaily.map(p => (
                      <span key={p.speedKey} className="inline-flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 text-xs">
                        <span className="font-medium text-gray-900 dark:text-white">{p.speedLabel}</span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-500 dark:text-gray-400">NT${p.pricePerDay}/日</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {parsedFixed.length > 0 && (
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">固定方案（{parsedFixed.length} 種）</div>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedFixed.map(p => (
                      <span key={p.id} className="inline-flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 text-xs">
                        <span className="font-medium text-gray-900 dark:text-white">{p.gb}GB/{p.days}天</span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-500 dark:text-gray-400">NT${p.price}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {parsedDaily.length === 0 && parsedFixed.length === 0 && (
                <div className="text-xs text-gray-400">未解析到任何方案</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            取消
          </button>
          <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
            儲存
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────

export default function SaleProductsEsimPage() {
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<ProductRow[]>(
    PRODUCTS.filter(p => p.kind === 'esim').map(p => ({ ...p, enabled: true }))
  )
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<ProductRow | null>(null)

  const country = (iso: string) => COUNTRIES.find(c => c.iso === iso)
  const filtered = search.trim()
    ? products.filter(p =>
        p.nameZh.includes(search) ||
        p.nameEn.toLowerCase().includes(search.toLowerCase()) ||
        p.iso.includes(search.toLowerCase())
      )
    : products

  function toggleEnabled(id: string) {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p))
  }

  function toggleExpanded(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function minPrice(p: ProductRow) {
    const daily = p.dailyPlans.length > 0 ? Math.min(...p.dailyPlans.map(d => d.pricePerDay)) : Infinity
    const fixed = p.fixedPlans.length > 0 ? Math.min(...p.fixedPlans.map(f => f.price)) : Infinity
    const min = Math.min(daily, fixed)
    return min === Infinity ? '—' : `NT$${min}`
  }

  function handleSave(updated: ProductRow) {
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p))
    setEditing(null)
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      <Header breadcrumb={['銷售模組', '商品管理', 'eSIM 商品']} />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 w-72">
            <Search size={15} className="text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜尋商品…"
              className="flex-1 text-sm bg-transparent outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
            <Plus size={15} />
            新增商品
          </button>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 w-8" />
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">國家／地區</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">商品名稱</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">日費方案</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">固定方案</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">起售價</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">狀態</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product, i) => {
                const c = country(product.iso)
                const isExpanded = expanded.has(product.id)
                const isLast = i === filtered.length - 1

                return (
                  <>
                    <tr
                      key={product.id}
                      className={clsx(
                        'border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer',
                        isLast && !isExpanded && 'border-b-0'
                      )}
                      onClick={() => toggleExpanded(product.id)}
                    >
                      <td className="px-4 py-3.5 text-gray-400">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={`https://flagcdn.com/w40/${product.iso}.png`}
                            alt={product.iso}
                            className="w-6 h-4 object-cover rounded-sm flex-shrink-0"
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                          />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white leading-tight">
                              {c ? c.zh : product.iso.toUpperCase()}
                            </div>
                            <div className="text-xs text-gray-400 leading-tight">
                              {product.iso.toUpperCase()} · MCC {getMCC(product.iso)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-gray-900 dark:text-white">{product.nameZh}</div>
                        <div className="text-xs text-gray-400">{product.nameEn}</div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300">{product.dailyPlans.length} 種</td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300">{product.fixedPlans.length} 種</td>
                      <td className="px-4 py-3.5 text-gray-700 dark:text-gray-300 font-medium">{minPrice(product)}</td>
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <span className={clsx(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                          product.enabled
                            ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        )}>
                          <span className={clsx('w-1.5 h-1.5 rounded-full', product.enabled ? 'bg-green-500' : 'bg-gray-400')} />
                          {product.enabled ? '上架中' : '已下架'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggleEnabled(product.id)} title={product.enabled ? '下架' : '上架'}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                            {product.enabled ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                          <button onClick={() => setEditing(product)} title="編輯"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                            <Pencil size={15} />
                          </button>
                          <button title="刪除"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${product.id}-plans`} className={clsx(
                        'border-b border-gray-50 dark:border-gray-800 bg-indigo-50/40 dark:bg-indigo-900/10',
                        isLast && 'border-b-0'
                      )}>
                        <td colSpan={8} className="px-8 py-4">
                          <div className="flex gap-8 flex-wrap">
                            {product.dailyPlans.length > 0 && (
                              <div>
                                <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2">日費方案</div>
                                <div className="flex flex-wrap gap-2">
                                  {product.dailyPlans.map(plan => (
                                    <div key={plan.speedKey} className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs">
                                      <span className="font-medium text-gray-900 dark:text-white">{plan.speedLabel}</span>
                                      <span className="text-gray-400">·</span>
                                      <span className="text-gray-500 dark:text-gray-400">NT${plan.pricePerDay}/日</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {product.fixedPlans.length > 0 && (
                              <div>
                                <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2">固定方案</div>
                                <div className="flex flex-wrap gap-2">
                                  {product.fixedPlans.map(plan => (
                                    <div key={plan.id} className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs">
                                      <span className="font-medium text-gray-900 dark:text-white">{plan.gb}GB/{plan.days}天</span>
                                      <span className="text-gray-400">·</span>
                                      <span className="text-gray-500 dark:text-gray-400">NT${plan.price}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-gray-400">找不到符合的商品</div>
          )}
        </div>
      </div>

      {editing && (
        <EditDrawer product={editing} onClose={() => setEditing(null)} onSave={handleSave} />
      )}
    </div>
  )
}
