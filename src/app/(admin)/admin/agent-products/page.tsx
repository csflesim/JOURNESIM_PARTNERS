'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { useLanguage } from '@/components/language-provider'
import { Plus, Trash2, Settings2, Search, Check, X, Save } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────

interface Agent {
  id: string
  nickname: string
  email: string
  account_status: string
}

interface PriceTier {
  copies: string
  retailPrice: string
}

interface DbProduct {
  sku_id: string
  name: string
  type: string
  plan_type: string | null
  days: string | null
  capacity: string | null
  high_flow_size: string | null
  cost_price: number | null
  retail_price: number | null
  prices: PriceTier[] | null
  is_active: boolean
}

interface SellPriceTier {
  copies: string
  price: number
}

interface AgentProduct {
  id: string
  agent_id: string
  sku_id: string
  sell_prices: SellPriceTier[]
  is_active: boolean
  note: string
  created_at: string
}

// ── Helpers ──────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  '110': 'eSIM 自選', '111': 'eSIM 自選', '210': 'eSIM 固定', '211': 'eSIM 固定',
  '212': 'eSIM 固定', '220': 'eSIM 固定', '221': 'eSIM 固定', '230': 'eSIM 固定',
  '250': 'eSIM 固定', '311': 'eSIM',
  '120': 'SIM 自選', '121': 'SIM 自選', '320': 'SIM 固定', '321': 'SIM 固定',
  '410': '加速包',
}

function getProductPriceTiers(p: DbProduct): PriceTier[] {
  return p.prices?.length ? p.prices : [{ copies: '1', retailPrice: String(p.retail_price ?? 0) }]
}

function formatCapacity(p: DbProduct): string {
  if (p.plan_type === '1' && p.high_flow_size) {
    const mb = Number(p.high_flow_size)
    return mb < 1024 ? `${mb}MB/日` : `${mb / 1024}GB/日`
  }
  if (p.capacity) {
    const gb = Number(p.capacity) / 1024
    return `${gb}GB`
  }
  return '—'
}

function copiesLabel(copies: string, t: (k: string) => string): string {
  return `${copies}${t('ap.days')}`
}

// ── Assign Modal ─────────────────────────────────────────────────────

function AssignModal({
  allProducts,
  existingSkus,
  onClose,
  onAssign,
}: {
  allProducts: DbProduct[]
  existingSkus: Set<string>
  onClose: () => void
  onAssign: (items: { sku_id: string; sell_prices: SellPriceTier[] }[]) => void
}) {
  const { t } = useLanguage()
  const [search, setSearch] = useState('')
  // Map<sku_id, SellPriceTier[]>
  const [selected, setSelected] = useState<Map<string, SellPriceTier[]>>(new Map())

  const available = useMemo(() => {
    const q = search.toLowerCase()
    return allProducts.filter(p =>
      !existingSkus.has(p.sku_id) &&
      p.is_active &&
      (p.name.toLowerCase().includes(q) || p.sku_id.toLowerCase().includes(q))
    )
  }, [allProducts, existingSkus, search])

  function toggleProduct(p: DbProduct) {
    setSelected(prev => {
      const next = new Map(prev)
      if (next.has(p.sku_id)) {
        next.delete(p.sku_id)
      } else {
        // 預設用官方售價填入
        const tiers = getProductPriceTiers(p)
        next.set(p.sku_id, tiers.map(tier => ({
          copies: tier.copies,
          price: Math.round(Number(tier.retailPrice)),
        })))
      }
      return next
    })
  }

  function updateTierPrice(sku: string, copies: string, val: string) {
    setSelected(prev => {
      const next = new Map(prev)
      const tiers = next.get(sku)
      if (tiers) {
        next.set(sku, tiers.map(tier =>
          tier.copies === copies ? { ...tier, price: Number(val) || 0 } : tier
        ))
      }
      return next
    })
  }

  function handleAssign() {
    const items = Array.from(selected.entries()).map(([sku_id, sell_prices]) => ({ sku_id, sell_prices }))
    if (items.some(i => i.sell_prices.some(t => t.price <= 0))) {
      alert(t('ap.priceRequired'))
      return
    }
    onAssign(items)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{t('ap.selectProducts')}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('ap.searchProduct')}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Product list */}
        <div className="flex-1 overflow-y-auto">
          {available.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">{t('ap.noProducts')}</div>
          ) : available.map(p => {
            const checked = selected.has(p.sku_id)
            const tiers = getProductPriceTiers(p)
            const sellTiers = selected.get(p.sku_id)
            return (
              <div key={p.sku_id} className={`border-b border-gray-100 dark:border-gray-800 ${checked ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                {/* Product row */}
                <div
                  onClick={() => toggleProduct(p)}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${checked ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600'}`}>
                    {checked && <Check size={10} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{p.name}</div>
                    <div className="text-xs text-gray-400">{p.sku_id} · {TYPE_LABELS[p.type] ?? p.type} · {formatCapacity(p)}</div>
                  </div>
                </div>
                {/* Price tiers (when selected) */}
                {checked && sellTiers && (
                  <div className="px-4 pb-3 pl-11">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-gray-400">
                          <th className="text-left py-1 font-medium">{t('ap.copies')}</th>
                          <th className="text-left py-1 font-medium">{t('ap.retailPrice')}</th>
                          <th className="text-left py-1 font-medium">{t('ap.sellPrice')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tiers.map((tier, i) => (
                          <tr key={tier.copies}>
                            <td className="py-1 text-sm text-gray-600 dark:text-gray-300">
                              {copiesLabel(tier.copies, t)}
                            </td>
                            <td className="py-1 text-sm text-gray-500">¥{Math.round(Number(tier.retailPrice))}</td>
                            <td className="py-1" onClick={e => e.stopPropagation()}>
                              <input
                                type="number"
                                min="0"
                                value={sellTiers[i]?.price ?? 0}
                                onChange={e => updateTierPrice(p.sku_id, tier.copies, e.target.value)}
                                className="w-24 px-2 py-0.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 dark:border-gray-700">
          <span className="text-xs text-gray-400">{t('ap.total', { n: selected.size })}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              {t('btn.close')}
            </button>
            <button
              onClick={handleAssign}
              disabled={selected.size === 0}
              className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg"
            >
              {t('ap.add')} ({selected.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Inline Prices Editor ─────────────────────────────────────────────

function PricesEditor({
  productPrices,
  sellPrices,
  onSave,
}: {
  productPrices: PriceTier[]
  sellPrices: SellPriceTier[]
  onSave: (prices: SellPriceTier[]) => void
}) {
  const { t } = useLanguage()
  const sellMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const sp of sellPrices) m.set(sp.copies, sp.price)
    return m
  }, [sellPrices])

  const [drafts, setDrafts] = useState<Map<string, string>>(() => {
    const m = new Map<string, string>()
    for (const tier of productPrices) {
      m.set(tier.copies, String(sellMap.get(tier.copies) ?? Math.round(Number(tier.retailPrice))))
    }
    return m
  })
  const [dirty, setDirty] = useState(false)

  function updateDraft(copies: string, val: string) {
    setDrafts(prev => {
      const next = new Map(prev)
      next.set(copies, val)
      return next
    })
    setDirty(true)
  }

  function handleSave() {
    const prices: SellPriceTier[] = Array.from(drafts.entries()).map(([copies, val]) => ({
      copies,
      price: Number(val) || 0,
    }))
    onSave(prices)
    setDirty(false)
  }

  return (
    <div className="space-y-1">
      {productPrices.map(tier => (
        <div key={tier.copies} className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-10 shrink-0">{copiesLabel(tier.copies, t)}</span>
          <span className="text-xs text-gray-400 w-14 shrink-0">¥{Math.round(Number(tier.retailPrice))}</span>
          <input
            type="number"
            min="0"
            value={drafts.get(tier.copies) ?? ''}
            onChange={e => updateDraft(tier.copies, e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
            className="w-20 px-1.5 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      ))}
      {dirty && (
        <button
          onClick={handleSave}
          className="flex items-center gap-1 mt-1 px-2 py-0.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded"
        >
          <Save size={10} />
          {t('ap.save')}
        </button>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────

export default function AgentProductsPage() {
  const { t } = useLanguage()

  const [agents, setAgents] = useState<Agent[]>([])
  const [agentSearch, setAgentSearch] = useState('')
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

  const [allProducts, setAllProducts] = useState<DbProduct[]>([])
  const [agentProducts, setAgentProducts] = useState<AgentProduct[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [showAssign, setShowAssign] = useState(false)

  useEffect(() => {
    fetch('/api/admin/agents').then(r => r.json()).then(d => setAgents(d.agents ?? []))
    fetch('/api/admin/products?all=1').then(r => r.json()).then(d => setAllProducts(d.products ?? []))
  }, [])

  const fetchAgentProducts = useCallback((agentId: string) => {
    fetch(`/api/admin/agent-products?agent_id=${agentId}`)
      .then(r => r.json())
      .then(d => setAgentProducts(d.items ?? []))
  }, [])

  useEffect(() => {
    if (selectedAgentId) fetchAgentProducts(selectedAgentId)
    else setAgentProducts([])
  }, [selectedAgentId, fetchAgentProducts])

  const filteredAgents = useMemo(() => {
    const q = agentSearch.toLowerCase()
    return agents.filter(a =>
      a.nickname.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
    )
  }, [agents, agentSearch])

  const mergedProducts = useMemo(() => {
    const q = productSearch.toLowerCase()
    return agentProducts
      .map(ap => ({
        ...ap,
        product: allProducts.find(p => p.sku_id === ap.sku_id) ?? null,
      }))
      .filter(item => {
        if (!q) return true
        const name = item.product?.name ?? ''
        return name.toLowerCase().includes(q) || item.sku_id.toLowerCase().includes(q)
      })
  }, [agentProducts, allProducts, productSearch])

  const existingSkus = useMemo(() => new Set(agentProducts.map(ap => ap.sku_id)), [agentProducts])

  async function handleAssign(items: { sku_id: string; sell_prices: SellPriceTier[] }[]) {
    await fetch('/api/admin/agent-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: selectedAgentId, items }),
    })
    setShowAssign(false)
    if (selectedAgentId) fetchAgentProducts(selectedAgentId)
  }

  async function updatePrices(id: string, sell_prices: SellPriceTier[]) {
    await fetch(`/api/admin/agent-products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sell_prices }),
    })
    if (selectedAgentId) fetchAgentProducts(selectedAgentId)
  }

  async function toggleActive(ap: AgentProduct) {
    await fetch(`/api/admin/agent-products/${ap.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !ap.is_active }),
    })
    if (selectedAgentId) fetchAgentProducts(selectedAgentId)
  }

  async function removeProduct(id: string) {
    if (!confirm(t('ap.confirmRemove'))) return
    await fetch(`/api/admin/agent-products/${id}`, { method: 'DELETE' })
    if (selectedAgentId) fetchAgentProducts(selectedAgentId)
  }

  const selectedAgent = agents.find(a => a.id === selectedAgentId)
  const thCls = 'px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase'
  const tdCls = 'px-4 py-3 text-sm text-gray-700 dark:text-gray-300'

  return (
    <>
      <Header breadcrumb={[t('ap.title')]} />
      <div className="p-6 flex gap-4 h-[calc(100vh-56px)]">

        {/* ── Left: Agent List ── */}
        <div className="w-64 shrink-0 flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="px-3 py-3 border-b border-gray-200 dark:border-gray-700">
            <input
              value={agentSearch}
              onChange={e => setAgentSearch(e.target.value)}
              placeholder={t('ap.selectAgent')}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredAgents.map(a => (
              <button
                key={a.id}
                onClick={() => setSelectedAgentId(a.id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-800 transition-colors ${
                  selectedAgentId === a.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className={`text-sm font-medium ${selectedAgentId === a.id ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-800 dark:text-gray-200'}`}>
                  {a.nickname}
                </div>
                <div className="text-xs text-gray-400 truncate">{a.email}</div>
              </button>
            ))}
          </div>
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400">
            {t('ap.total', { n: filteredAgents.length })}
          </div>
        </div>

        {/* ── Right: Products Panel ── */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          {!selectedAgentId ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              {t('ap.selectAgent')}
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {selectedAgent?.nickname}
                </span>
                <span className="text-xs text-gray-400">{selectedAgent?.email}</span>
                <div className="flex-1" />
                <input
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder={t('ap.searchProduct')}
                  className="w-48 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => setShowAssign(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg whitespace-nowrap"
                >
                  <Plus size={14} />
                  {t('ap.add')}
                </button>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-y-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr>
                      <th className={thCls}>{t('ap.product')}</th>
                      <th className={thCls}>{t('ap.skuId')}</th>
                      <th className={thCls}>{t('ap.type')}</th>
                      <th className={thCls}>{t('ap.sellPrice')}</th>
                      <th className={thCls}>{t('ap.status')}</th>
                      <th className={thCls}>{t('ap.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {mergedProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                          {t('ap.noProducts')}
                        </td>
                      </tr>
                    ) : mergedProducts.map(item => {
                      const productPrices = item.product ? getProductPriceTiers(item.product) : []
                      return (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors align-top">
                          <td className={tdCls}>
                            <div className="max-w-[200px] truncate font-medium text-gray-800 dark:text-gray-200">
                              {item.product?.name ?? item.sku_id}
                            </div>
                            {item.product && (
                              <div className="text-xs text-gray-400">
                                {formatCapacity(item.product)} {item.product.days ? `/ ${item.product.days}${t('ap.days')}` : ''}
                              </div>
                            )}
                          </td>
                          <td className={tdCls + ' font-mono text-xs text-gray-500'}>{item.sku_id}</td>
                          <td className={tdCls + ' text-xs text-gray-500'}>
                            {item.product ? (TYPE_LABELS[item.product.type] ?? item.product.type) : '—'}
                          </td>
                          <td className={tdCls}>
                            {productPrices.length > 0 ? (
                              <PricesEditor
                                productPrices={productPrices}
                                sellPrices={item.sell_prices ?? []}
                                onSave={prices => updatePrices(item.id, prices)}
                              />
                            ) : '—'}
                          </td>
                          <td className={tdCls}>
                            <button
                              onClick={() => toggleActive(item)}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                                item.is_active ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${item.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                          </td>
                          <td className={tdCls}>
                            <button onClick={() => removeProduct(item.id)} className="p-1 text-gray-400 hover:text-red-500 rounded">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400">
                <span>{t('ap.total', { n: mergedProducts.length })}</span>
                <Settings2 size={14} className="text-gray-300 dark:text-gray-600" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Assign Modal ── */}
      {showAssign && selectedAgentId && (
        <AssignModal
          allProducts={allProducts}
          existingSkus={existingSkus}
          onClose={() => setShowAssign(false)}
          onAssign={handleAssign}
        />
      )}
    </>
  )
}
