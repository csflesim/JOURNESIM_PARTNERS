'use client'

import { useEffect, useState, useCallback } from 'react'
import { ProductTable, type Product } from '@/components/plans/product-table'
import { useLanguage } from '@/components/language-provider'

interface Agent {
  id: string
  nickname: string
  email: string
}

interface Props {
  /** e.g. 'types=110,111,3105,3106' or 'acceleration=true' */
  queryParam: string
}

/**
 * 代理商套餐表格：上方選代理商，下方用 ProductTable 顯示授權商品。
 * 結構與採購模組一致，但資料來源為 /api/agent/plans（只回傳授權商品）。
 */
export function AgentProductTable({ queryParam }: Props) {
  const { t } = useLanguage()
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch agents on mount
  useEffect(() => {
    fetch('/api/admin/agents')
      .then(r => r.json())
      .then(d => setAgents(d.agents ?? []))
  }, [])

  // Fetch products when agent selected
  const fetchProducts = useCallback(async () => {
    if (!selectedAgentId) { setProducts([]); return }
    setLoading(true)
    const res = await fetch(`/api/agent/plans?agent_id=${selectedAgentId}&${queryParam}`)
    const data = await res.json()
    setProducts(data.products ?? [])
    setLoading(false)
  }, [selectedAgentId, queryParam])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  // 代理商模組不需要同步和上下架
  async function handleSync() {
    // no-op: 代理商不能同步 BC
  }
  async function handleToggleActive() {
    // no-op: 代理商不能上下架商品
  }

  return (
    <div className="space-y-4">
      {/* Agent selector */}
      <div className="flex items-center gap-3">
        <select
          value={selectedAgentId ?? ''}
          onChange={e => setSelectedAgentId(e.target.value || null)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">{t('pp.selectAgent')}</option>
          {agents.map(a => (
            <option key={a.id} value={a.id}>{a.nickname}（{a.email}）</option>
          ))}
        </select>
        {selectedAgentId && (
          <span className="text-xs text-gray-400">
            {t('pp.total', { n: products.length })}
          </span>
        )}
      </div>

      {/* Content */}
      {!selectedAgentId ? (
        <div className="flex items-center justify-center py-20 text-sm text-gray-400">
          {t('pp.selectAgent')}
        </div>
      ) : loading ? (
        <div className="text-sm text-gray-400">{t('common.loading')}</div>
      ) : (
        <ProductTable
          products={products}
          onSync={handleSync}
          onToggleActive={handleToggleActive}
          hideSync
          hideToggle
        />
      )}
    </div>
  )
}
