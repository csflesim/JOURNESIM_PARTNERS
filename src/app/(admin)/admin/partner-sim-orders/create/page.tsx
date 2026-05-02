'use client'

import React, { Suspense, useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Loader2, Search, X } from 'lucide-react'
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
  high_flow_size: string | null
  capacity: string | null
  prices: PriceTier[]
  sell_prices: SellPriceTier[]
}

interface Agent { id: string; nickname: string; email: string }

const SIM_TYPES = ['110', '111', '210', '211', '212', '220', '221', '311', '3101', '3102', '3103', '3104', '3201', '3202', '3211', '3212']

function getAgentPrice(p: Product, copies: number): number {
  return p.sell_prices?.find(t => t.copies === String(copies))?.price ?? 0
}
function getBcPrice(p: Product, copies: number): number {
  const tier = p.prices?.find(t => t.copies === String(copies))
  return tier ? parseFloat(tier.settlementPrice) : 0
}

export default function CreatePartnerSimOrderPage() {
  return <Suspense><CreatePartnerSimOrderInner /></Suspense>
}

function CreatePartnerSimOrderInner() {
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

  // ICCID input
  const [iccidMode, setIccidMode] = useState<'text' | 'range'>('text')
  const [iccidText, setIccidText] = useState('')
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    fetch('/api/admin/agents').then(r => r.json()).then(d => setAgents(d.agents ?? []))
  }, [])

  useEffect(() => {
    if (!agentId) { setProducts([]); return }
    setLoading(true)
    fetch(`/api/agent/plans?agent_id=${agentId}&types=${SIM_TYPES.join(',')}`)
      .then(r => r.json())
      .then(d => setProducts(d.products ?? []))
      .finally(() => setLoading(false))
  }, [agentId])

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return products.filter(p => !q || p.name.toLowerCase().includes(q) || p.sku_id.toLowerCase().includes(q))
  }, [products, searchQuery])

  // Parse ICCIDs
  const iccids = useMemo(() => {
    if (iccidMode === 'text') {
      return [...new Set(iccidText.split(/[,\n\s]+/).map(s => s.trim()).filter(Boolean))]
    }
    if (!rangeStart || !rangeEnd) return []
    try {
      const start = BigInt(rangeStart)
      const end = BigInt(rangeEnd)
      if (end < start || end - start > BigInt(10000)) return []
      const arr: string[] = []
      for (let i = start; i <= end; i++) arr.push(String(i))
      return arr
    } catch { return [] }
  }, [iccidMode, iccidText, rangeStart, rangeEnd])

  const agentPrice = selectedProduct ? getAgentPrice(selectedProduct, copies) : 0
  const bcPrice = selectedProduct ? getBcPrice(selectedProduct, copies) : 0
  const totalAgent = agentPrice * iccids.length
  const totalBc = bcPrice * copies * iccids.length

  async function handleSubmit() {
    if (!selectedProduct || !agentId || iccids.length === 0) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/agent/sim-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          skuId: selectedProduct.sku_id,
          iccids,
          copies,
          agentSellPrice: agentPrice,
          bcSettlementPrice: bcPrice,
          comment: comment || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '建立失敗')
      router.push('/partner-sim-orders')
    } catch (err) {
      setSubmitError(String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400'

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      <Header breadcrumb={['SIM 卡訂單', '創建訂單']} />
      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* 代理商選擇 */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">選擇代理商</label>
          <select
            value={agentId}
            onChange={e => { setAgentId(e.target.value); setSelectedProduct(null) }}
            className={`${inputCls} max-w-sm`}
          >
            <option value="">{t('pp.selectAgent')}</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.nickname}（{a.email}）</option>)}
          </select>
        </div>

        {!agentId ? (
          <div className="text-center py-24 text-gray-400 text-sm">{t('pp.selectAgent')}</div>
        ) : loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400"><Loader2 size={20} className="animate-spin mr-2" /> 載入商品中…</div>
        ) : (
          <>
            <div className="relative">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="搜索套餐名稱或 SKU"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400" />
            </div>
            <p className="text-xs text-gray-400 pl-1">授權商品：{filtered.length} 個</p>

            {/* 商品表格 */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 text-xs">
                  <tr>
                    <th className="text-left px-4 py-3">套餐名稱</th>
                    <th className="text-center px-4 py-3">天數</th>
                    <th className="text-right px-4 py-3">代理商售價</th>
                    <th className="text-right px-4 py-3">BC 結算價</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-12 text-gray-400">{t('pp.noPlans')}</td></tr>
                  ) : filtered.map(p => {
                    const isSelected = selectedProduct?.sku_id === p.sku_id
                    const tiers = p.prices ?? []
                    return tiers.length > 0 ? tiers.map((tier, i) => {
                      const tc = parseInt(tier.copies)
                      const totalDays = parseInt(p.days ?? '1') * tc
                      const ap = getAgentPrice(p, tc)
                      const isTierSelected = isSelected && copies === tc
                      return (
                        <tr
                          key={`${p.sku_id}-${tier.copies}`}
                          onClick={() => { setSelectedProduct(p); setCopies(tc) }}
                          className={clsx('border-t border-gray-100 cursor-pointer transition-colors', isTierSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-white dark:bg-gray-900 hover:bg-gray-50')}
                        >
                          {i === 0 && (
                            <td className="px-4 py-3" rowSpan={tiers.length}>
                              <div className="font-medium text-gray-800 dark:text-gray-100">{p.name}</div>
                              <div className="text-xs text-gray-400 mt-0.5">{p.sku_id}</div>
                            </td>
                          )}
                          <td className="px-4 py-3 text-center">{totalDays} 天</td>
                          <td className="px-4 py-3 text-right font-medium text-indigo-600">{ap > 0 ? `NT$${ap}` : '—'}</td>
                          <td className="px-4 py-3 text-right text-gray-500 text-xs">¥{parseFloat(tier.settlementPrice).toFixed(2)}</td>
                        </tr>
                      )
                    }) : (
                      <tr key={p.sku_id} onClick={() => { setSelectedProduct(p); setCopies(1) }}
                        className={clsx('border-t border-gray-100 cursor-pointer', isSelected ? 'bg-indigo-50' : 'bg-white hover:bg-gray-50')}>
                        <td className="px-4 py-3"><div className="font-medium text-gray-800">{p.name}</div><div className="text-xs text-gray-400">{p.sku_id}</div></td>
                        <td className="px-4 py-3 text-center">{p.days ?? '—'}</td>
                        <td className="px-4 py-3 text-right">—</td>
                        <td className="px-4 py-3 text-right">—</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* 已選商品 + ICCID 輸入 */}
            {selectedProduct && (
              <div className="bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">{selectedProduct.name}</div>
                    <div className="text-xs text-gray-400">{selectedProduct.sku_id}</div>
                  </div>
                  <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                </div>

                {/* ICCID 輸入 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-xs text-gray-500">ICCID 輸入方式：</label>
                    <button onClick={() => setIccidMode('text')} className={clsx('text-xs px-2 py-0.5 rounded', iccidMode === 'text' ? 'bg-indigo-600 text-white' : 'text-gray-400')}>文字</button>
                    <button onClick={() => setIccidMode('range')} className={clsx('text-xs px-2 py-0.5 rounded', iccidMode === 'range' ? 'bg-indigo-600 text-white' : 'text-gray-400')}>範圍</button>
                  </div>
                  {iccidMode === 'text' ? (
                    <textarea value={iccidText} onChange={e => setIccidText(e.target.value)} rows={4} placeholder="輸入 ICCID，每行一個或用逗號分隔" className={inputCls + ' resize-none'} />
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <input value={rangeStart} onChange={e => setRangeStart(e.target.value)} placeholder="起始 ICCID" className={inputCls} />
                      <input value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} placeholder="結束 ICCID" className={inputCls} />
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">已輸入 {iccids.length} 張 ICCID</p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">代理商金額：<strong className="text-indigo-600">NT${totalAgent}</strong></span>
                  <span className="text-sm text-gray-400">BC 結算：<strong>¥{totalBc.toFixed(2)}</strong></span>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">備註</label>
                  <input value={comment} onChange={e => setComment(e.target.value)} placeholder="備註" className={inputCls + ' max-w-sm'} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
        {submitError && <p className="text-sm text-red-500 mr-4">{submitError}</p>}
        <button
          onClick={handleSubmit}
          disabled={!selectedProduct || !agentId || iccids.length === 0 || submitting}
          className={clsx(
            'px-8 py-2.5 rounded-xl text-sm font-semibold transition-colors',
            !selectedProduct || !agentId || iccids.length === 0 || submitting
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
