'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Loader2, Search, Check } from 'lucide-react'
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
  rechargeable_product: string   // '0' | '1'
  cost_price: number | null
  prices: { copies: string; retailPrice: string; settlementPrice: string }[]
}

type TabKey = 'recharge' | 'air'

// ── Helpers ────────────────────────────────────────────────────────────

const ESIM_TYPES = ['230', '3105', '3106']

function formatKB(kb: string | null, perDay = false): string {
  if (!kb) return '—'
  const val = parseFloat(kb)
  const suffix = perDay ? '/天' : ''
  if (isNaN(val) || val === -1) return perDay ? '無限/天' : '無限流量'
  if (val >= 1048576) return `${val / 1048576 % 1 === 0 ? val / 1048576 : (val / 1048576).toFixed(1)} GB${suffix}`
  if (val >= 1024) return `${val / 1024 % 1 === 0 ? val / 1024 : (val / 1024).toFixed(1)} MB${suffix}`
  return `${val} KB${suffix}`
}

function capacityLabel(p: Product): string {
  if (p.plan_type === '1') return formatKB(p.high_flow_size ?? p.capacity, true)
  return formatKB(p.capacity)
}

function getSettlementPrice(p: Product, copies: number): number {
  if (p.prices?.length) {
    const match = p.prices.find(x => x.copies === String(copies))
    if (match) return parseFloat(match.settlementPrice)
    return parseFloat(p.prices[p.prices.length - 1].settlementPrice)
  }
  return p.cost_price ?? 0
}

// ── Main Page ──────────────────────────────────────────────────────────

export default function EsimRechargePage() {
  const router = useRouter()

  const [tab, setTab] = useState<TabKey>('recharge')
  const [iccid, setIccid] = useState('')
  const [iccidValidity, setIccidValidity] = useState<string | null>(null)
  const [querying, setQuerying] = useState(false)
  const [queryError, setQueryError] = useState<string | null>(null)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [hasQueried, setHasQueried] = useState(false)

  const [rowCopies, setRowCopies] = useState<Record<string, number>>({})
  const [selectedSku, setSelectedSku] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // ── Filtered by tab ────────────────────────────────────────────────
  // 復充eSIM: type 230/3105/3106 + rechargeable_product='1'
  // eSIM Air: type 250

  const products = useMemo(() => {
    if (tab === 'air') return allProducts.filter(p => p.type === '250')
    return allProducts.filter(p => ESIM_TYPES.includes(p.type) && p.rechargeable_product === '1')
  }, [allProducts, tab])

  // ── Query (F052) ───────────────────────────────────────────────────

  async function handleQuery() {
    if (!iccid.trim()) return
    setQuerying(true)
    setQueryError(null)
    setAllProducts([])
    setSelectedSku(null)
    setHasQueried(false)
    setIccidValidity(null)

    try {
      const res = await fetch('/api/admin/esim-recharge/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iccid: iccid.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '查詢失敗')
      setAllProducts(data.products ?? [])
      setIccidValidity(data.iccidValidity ?? null)
      setHasQueried(true)
    } catch (err: any) {
      setQueryError(err.message)
    } finally {
      setQuerying(false)
    }
  }

  // ── Submit (F007) ──────────────────────────────────────────────────

  async function handleSubmit() {
    if (!selectedSku || !iccid.trim()) return
    const product = products.find(p => p.sku_id === selectedSku)
    if (!product) return

    const copies = rowCopies[selectedSku] ?? 1
    const unitPrice = getSettlementPrice(product, copies)

    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch('/api/admin/esim-recharge/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iccid: iccid.trim(), skuId: selectedSku, copies, unitPrice }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '創建失敗')
      router.push(`/admin/esim-orders?created=${data.channelOrderId}`)
    } catch (err: any) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Derived order amount ───────────────────────────────────────────

  const orderAmount = useMemo(() => {
    if (!selectedSku) return null
    const product = products.find(p => p.sku_id === selectedSku)
    if (!product) return null
    return getSettlementPrice(product, rowCopies[selectedSku] ?? 1)
  }, [selectedSku, products, rowCopies])

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header breadcrumb={['eSIM 訂單', '創建充值訂單']} />

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-1 w-fit">
          {([['recharge', '復充 eSIM'], ['air', 'eSIM Air']] as [TabKey, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setTab(key); setSelectedSku(null) }}
              className={clsx(
                'px-5 py-2 rounded-lg text-sm font-medium transition-colors',
                tab === key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ICCID Query */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">查詢匹配套餐</h2>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={iccid}
                onChange={e => setIccid(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleQuery()}
                placeholder="輸入 ICCID"
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={handleQuery}
              disabled={querying || !iccid.trim()}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {querying && <Loader2 size={15} className="animate-spin" />}
              查詢匹配套餐
            </button>
          </div>

          {iccidValidity && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ICCID 有效期：<span className="font-medium text-gray-700 dark:text-gray-200">{iccidValidity}</span>
            </p>
          )}

          {queryError && <p className="text-xs text-red-500">{queryError}</p>}
        </div>

        {/* Product Table */}
        {hasQueried && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {products.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-400">
                此 ICCID 無可用的{tab === 'air' ? ' eSIM Air ' : '復充 eSIM '}套餐
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-xs text-gray-400 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left w-10">選擇</th>
                    <th className="px-4 py-3 text-left">套餐名稱</th>
                    <th className="px-4 py-3 text-center">流量</th>
                    <th className="px-4 py-3 text-center">天數</th>
                    <th className="px-4 py-3 text-center">份數</th>
                    <th className="px-4 py-3 text-right">應結算價</th>
                    <th className="px-4 py-3 text-center">套餐類型</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {products.map(p => {
                    const copies = rowCopies[p.sku_id] ?? 1
                    const price = getSettlementPrice(p, copies)
                    const isSelected = selectedSku === p.sku_id
                    const copiesOptions = p.prices?.length ? p.prices.map(x => x.copies) : ['1']

                    return (
                      <tr
                        key={p.sku_id}
                        onClick={() => setSelectedSku(p.sku_id)}
                        className={clsx(
                          'cursor-pointer transition-colors',
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        )}
                      >
                        {/* Select */}
                        <td className="px-4 py-3">
                          <div className={clsx(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                            isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 dark:border-gray-600'
                          )}>
                            {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
                          </div>
                        </td>

                        {/* Name */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800 dark:text-gray-100">{p.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{p.sku_id}</div>
                        </td>

                        {/* Capacity */}
                        <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">
                          {capacityLabel(p)}
                        </td>

                        {/* Days */}
                        <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">
                          {p.days ? `${p.days} 天` : '—'}
                        </td>

                        {/* Copies */}
                        <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                          <select
                            value={copies}
                            onChange={e => setRowCopies(prev => ({ ...prev, [p.sku_id]: Number(e.target.value) }))}
                            className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {copiesOptions.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </td>

                        {/* Price */}
                        <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-gray-100">
                          {price > 0 ? `$${price.toFixed(2)}` : '—'}
                        </td>

                        {/* Plan type */}
                        <td className="px-4 py-3 text-center">
                          <span className={clsx(
                            'inline-block px-2 py-0.5 rounded-md text-xs font-medium',
                            p.plan_type === '1'
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                              : 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          )}>
                            {p.plan_type === '1' ? '單日型' : '總量型'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Footer */}
        {selectedSku && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              訂單金額：
              <span className="ml-2 text-xl font-bold text-gray-900 dark:text-gray-100">
                {orderAmount != null && orderAmount > 0 ? `$${orderAmount.toFixed(2)}` : '—'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {submitError && <p className="text-xs text-red-500">{submitError}</p>}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
              >
                {submitting && <Loader2 size={15} className="animate-spin" />}
                確認創建
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
