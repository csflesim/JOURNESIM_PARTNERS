'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Plus, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { useLanguage } from '@/components/language-provider'

interface Order {
  id: string
  channel_order_id: string
  bc_order_id: string | null
  order_type: string
  order_status: string
  total_amount: number | null
  partner_order_id: string | null
  created_at: string
  order_items: { id: string; sku_id: string; copies: number; number: number; iccid: string[] | null }[]
}

interface Agent { id: string; nickname: string; email: string }

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:    { label: '待處理', color: 'text-yellow-700 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20' },
  processing: { label: '處理中', color: 'text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20' },
  completed:  { label: '已完成', color: 'text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/20' },
  cancelled:  { label: '已取消', color: 'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-800' },
  failed:     { label: '失敗',   color: 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/20' },
}

export default function PartnerSimOrdersPage() {
  const { t } = useLanguage()
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    fetch('/api/admin/agents').then(r => r.json()).then(d => setAgents(d.agents ?? []))
  }, [])

  useEffect(() => {
    if (!selectedAgentId) { setOrders([]); setTotal(0); return }
    setLoading(true)
    fetch(`/api/agent/sim-orders?agent_id=${selectedAgentId}`)
      .then(r => r.json())
      .then(d => { setOrders(d.orders ?? []); setTotal(d.total ?? 0) })
      .finally(() => setLoading(false))
  }, [selectedAgentId])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Header breadcrumb={['SIM 卡訂單', '訂單列表']} />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <select
              value={selectedAgentId ?? ''}
              onChange={e => setSelectedAgentId(e.target.value || null)}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t('pp.selectAgent')}</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.nickname}（{a.email}）</option>)}
            </select>
            <span className="text-sm text-gray-400">共 {total} 筆</span>
          </div>
          {selectedAgentId && (
            <Link
              href={`/admin/partner-sim-orders/create?agent_id=${selectedAgentId}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus size={16} /> 創建訂單
            </Link>
          )}
        </div>

        {!selectedAgentId ? (
          <div className="text-center py-24 text-gray-400 text-sm">{t('pp.selectAgent')}</div>
        ) : loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <Loader2 size={24} className="animate-spin mr-2" /> 載入中…
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-24 text-gray-400 text-sm">尚無 SIM 卡訂單</div>
        ) : (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">代理商訂單號</th>
                  <th className="text-left px-4 py-3 font-medium">BC 訂單號</th>
                  <th className="text-center px-4 py-3 font-medium">ICCID 數</th>
                  <th className="text-right px-4 py-3 font-medium">代理商金額</th>
                  <th className="text-center px-4 py-3 font-medium">狀態</th>
                  <th className="text-right px-4 py-3 font-medium">建立時間</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {orders.map(order => {
                  const statusInfo = STATUS_LABELS[order.order_status] ?? { label: order.order_status, color: 'text-gray-500 bg-gray-100' }
                  const iccidCount = order.order_items?.reduce((sum, it) => sum + (it.iccid?.length ?? it.number), 0) ?? 0
                  return (
                    <tr key={order.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800 dark:text-gray-100">{order.channel_order_id}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">{order.bc_order_id ?? '—'}</td>
                      <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{iccidCount}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800 dark:text-gray-100">
                        {order.total_amount != null ? `NT$${Number(order.total_amount).toFixed(0)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', statusInfo.color)}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 text-xs">
                        {new Date(order.created_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
