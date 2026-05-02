'use client'

import React, { Suspense, useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { ChevronDown, ChevronRight, Loader2, Search, X, FileText } from 'lucide-react'
import { clsx } from 'clsx'
import { useLanguage } from '@/components/language-provider'

interface SellPriceTier { copies: string; price: number }
interface PriceTier { copies: string; retailPrice: string; settlementPrice: string }

interface Product {
  sku_id: string
  name: string
  type: string
  plan_type: string | null
  days: string | null
  capacity: string | null
  high_flow_size: string | null
  limit_flow_speed: string | null
  countries: { mcc: string; name: string }[]
  prices: PriceTier[]
  sell_prices: SellPriceTier[]
}

interface Agent { id: string; nickname: string; email: string }

const ESIM_TYPES = ['230', '3105', '3106']

function formatKB(kb: string | null, perDay = false): string {
  if (!kb) return '—'
  const val = parseFloat(kb)
  const suffix = perDay ? '/天' : ''
  if (isNaN(val) || val === -1) return perDay ? '無限/天' : '無限流量'
  if (val >= 1048576) return `${(val / 1048576).toFixed(val % 1048576 === 0 ? 0 : 1)}GB${suffix}`
  if (val >= 1024) return `${(val / 1024).toFixed(val % 1024 === 0 ? 0 : 0)}MB${suffix}`
  return `${val}KB${suffix}`
}

function getAgentPrice(p: Product, copies: number): number {
  const tier = p.sell_prices?.find(t => t.copies === String(copies))
  return tier?.price ?? 0
}

function getBcPrice(p: Product, copies: number): number {
  const tier = p.prices?.find(t => t.copies === String(copies))
  return tier ? parseFloat(tier.settlementPrice) : 0
}

export default function CreatePartnerEsimOrderPage() {
  return <Suspense><CreatePartnerEsimOrderInner /></Suspense>
}

function CreatePartnerEsimOrderInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()

  const [agents, setAgents] = useState<Agent[]>([])
  const [agentId, setAgentId] = useState(searchParams.get('agent_id') ?? '')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [copies, setCopies] = useState(1)
  const [quantity, setQuantity] = useState(1)
  const [email, setEmail] = useState('')
  const [estimatedUseTime, setEstimatedUseTime] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    fetch('/api/admin/agents').then(r => r.json()).then(d => setAgents(d.agents ?? []))
  }, [])

  // 載入代理商授權的 eSIM 商品
  useEffect(() => {
    if (!agentId) { setProducts([]); return }
    setLoading(true)
    fetch(`/api/agent/plans?agent_id=${agentId}&types=${ESIM_TYPES.join(',')}`)
      .then(r => r.json())
      .then(d => setProducts(d.products ?? []))
      .finally(() => setLoading(false))
  }, [agentId])

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return products.filter(p =>
      !q || p.name.toLowerCase().includes(q) || p.sku_id.toLowerCase().includes(q)
    )
  }, [products, searchQuery])

  const agentPrice = selectedProduct ? getAgentPrice(selectedProduct, copies) : 0
  const bcPrice = selectedProduct ? getBcPrice(selectedProduct, copies) : 0
  const totalAgent = agentPrice * quantity
  const totalBc = bcPrice * quantity

  async function handleSubmit() {
    if (!selectedProduct || !agentId) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/agent/esim-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          email: email || undefined,
          estimatedUseTime: estimatedUseTime || undefined,
          comment: comment || undefined,
          items: [{
            skuId: selectedProduct.sku_id,
            copies,
            number: quantity,
            agentSellPrice: agentPrice,
            bcSettlementPrice: bcPrice,
          }],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '建立失敗')
      router.push('/partner-esim-orders')
    } catch (err) {
      setSubmitError(String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      <Header breadcrumb={['eSIM 訂單', '創建訂單']} />
      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* 代理商選擇 */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">選擇代理商</label>
          <select
            value={agentId}
            onChange={e => { setAgentId(e.target.value); setSelectedProduct(null) }}
            className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full max-w-sm"
          >
            <option value="">{t('pp.selectAgent')}</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.nickname}（{a.email}）</option>)}
          </select>
        </div>

        {!agentId ? (
          <div className="text-center py-24 text-gray-400 text-sm">{t('pp.selectAgent')}</div>
        ) : loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" /> 載入商品中…
          </div>
        ) : (
          <>
            {/* 搜尋 */}
            <div className="relative">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索套餐名稱或 SKU"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
              />
            </div>
            <p className="text-xs text-gray-400 pl-1">授權商品：{filtered.length} 個</p>

            {/* 商品表格 */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">套餐名稱</th>
                    <th className="text-center px-4 py-3 font-medium">流量</th>
                    <th className="text-left px-4 py-3 font-medium">適用國家</th>
                    <th className="text-center px-4 py-3 font-medium">天數</th>
                    <th className="text-right px-4 py-3 font-medium">代理商售價</th>
                    <th className="text-right px-4 py-3 font-medium">BC 結算價</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">{t('pp.noPlans')}</td></tr>
                  ) : filtered.map(p => {
                    const isSelected = selectedProduct?.sku_id === p.sku_id
                    const tiers = p.prices ?? []
                    const hasTiers = tiers.length > 0
                    return (
                      <React.Fragment key={p.sku_id}>
                        {hasTiers ? tiers.map((tier, i) => {
                          const tierCopies = parseInt(tier.copies)
                          const totalDays = parseInt(p.days ?? '1') * tierCopies
                          const ap = getAgentPrice(p, tierCopies)
                          const isTierSelected = isSelected && copies === tierCopies
                          return (
                            <tr
                              key={`${p.sku_id}-${tier.copies}`}
                              onClick={() => { setSelectedProduct(p); setCopies(tierCopies); setQuantity(1) }}
                              className={clsx(
                                'border-t border-gray-100 dark:border-gray-800 cursor-pointer transition-colors',
                                isTierSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                              )}
                            >
                              {i === 0 && (
                                <>
                                  <td className="px-4 py-3" rowSpan={tiers.length}>
                                    <div className="font-medium text-gray-800 dark:text-gray-100 truncate max-w-[200px]">{p.name}</div>
                                    <div className="text-xs text-gray-400 mt-0.5">{p.sku_id}</div>
                                  </td>
                                  <td className="px-4 py-3 text-center text-xs text-gray-600" rowSpan={tiers.length}>
                                    {formatKB(p.high_flow_size ?? p.capacity, p.plan_type === '1')}
                                  </td>
                                  <td className="px-4 py-3" rowSpan={tiers.length}>
                                    <div className="flex flex-wrap gap-1 max-w-[160px]">
                                      {(p.countries ?? []).slice(0, 2).map(c => (
                                        <span key={c.mcc} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">{c.name}</span>
                                      ))}
                                      {(p.countries?.length ?? 0) > 2 && <span className="text-xs text-gray-400">+{p.countries.length - 2}</span>}
                                    </div>
                                  </td>
                                </>
                              )}
                              <td className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-200">{totalDays} 天</td>
                              <td className="px-4 py-3 text-right font-medium text-indigo-600 dark:text-indigo-400">
                                {ap > 0 ? `NT$${ap}` : '—'}
                              </td>
                              <td className="px-4 py-3 text-right text-gray-500 text-xs">
                                ¥{parseFloat(tier.settlementPrice).toFixed(2)}
                              </td>
                            </tr>
                          )
                        }) : (
                          <tr
                            onClick={() => { setSelectedProduct(p); setCopies(1); setQuantity(1) }}
                            className={clsx(
                              'border-t border-gray-100 dark:border-gray-800 cursor-pointer transition-colors',
                              isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                            )}
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-800 dark:text-gray-100">{p.name}</div>
                              <div className="text-xs text-gray-400 mt-0.5">{p.sku_id}</div>
                            </td>
                            <td className="px-4 py-3 text-center text-xs text-gray-600">
                              {formatKB(p.high_flow_size ?? p.capacity, p.plan_type === '1')}
                            </td>
                            <td className="px-4 py-3">—</td>
                            <td className="px-4 py-3 text-center text-gray-500">{p.days ?? '—'} 天</td>
                            <td className="px-4 py-3 text-right text-gray-500">—</td>
                            <td className="px-4 py-3 text-right text-gray-500">—</td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* 已選商品 */}
            {selectedProduct && (
              <div className="bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">{selectedProduct.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{selectedProduct.sku_id}</div>
                  </div>
                  <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                </div>

                {/* 規格選擇 */}
                {selectedProduct.prices?.length > 0 && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">選擇規格</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.prices.map(tier => {
                        const tc = parseInt(tier.copies)
                        const totalDays = selectedProduct.days ? tc * parseInt(selectedProduct.days) : tc
                        const ap = getAgentPrice(selectedProduct, tc)
                        return (
                          <button
                            key={tier.copies}
                            type="button"
                            onClick={() => setCopies(tc)}
                            className={clsx(
                              'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                              copies === tc
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-indigo-400'
                            )}
                          >
                            <span className="font-medium">{totalDays} 天</span>
                            <span className={clsx('ml-1.5 text-xs', copies === tc ? 'text-indigo-200' : 'text-gray-400')}>
                              NT${ap}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">套餐數量：</span>
                    <div className="flex items-center">
                      <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center rounded-l-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600">−</button>
                      <input type="number" min={1} value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="w-14 h-8 text-center border-t border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none" />
                      <button onClick={() => setQuantity(q => q + 1)} className="w-8 h-8 flex items-center justify-center rounded-r-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600">+</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">代理商金額：<strong className="text-indigo-600">NT${totalAgent}</strong></span>
                    <span className="text-sm text-gray-400">BC 結算：<strong>¥{totalBc.toFixed(2)}</strong></span>
                  </div>
                </div>

                {/* 其他選填 */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">客戶 Email</label>
                    <input value={email} onChange={e => setEmail(e.target.value)} placeholder="用於發送 eSIM"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">預計使用日期</label>
                    <input type="date" value={estimatedUseTime} onChange={e => setEstimatedUseTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">備註</label>
                    <input value={comment} onChange={e => setComment(e.target.value)} placeholder="備註"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
        {submitError && <p className="text-sm text-red-500 mr-4">{submitError}</p>}
        <button
          onClick={handleSubmit}
          disabled={!selectedProduct || !agentId || submitting}
          className={clsx(
            'px-8 py-2.5 rounded-xl text-sm font-semibold transition-colors',
            !selectedProduct || !agentId || submitting
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          )}
        >
          {submitting ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> 建立中…</span> : '確認創建'}
        </button>
      </div>
    </div>
  )
}
