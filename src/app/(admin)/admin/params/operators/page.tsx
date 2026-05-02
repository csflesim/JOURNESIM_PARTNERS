'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { RefreshCw, Search, Loader2 } from 'lucide-react'

interface Operator {
  id: string
  mcc: string
  country_name: string
  operator: string
  network: string
  priority: string
  synced_at: string
}

export default function OperatorsPage() {
  const [operators, setOperators] = useState<Operator[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [search, setSearch] = useState('')

  function load() {
    setLoading(true)
    fetch('/api/admin/params/operators')
      .then(r => r.json())
      .then(d => setOperators(d.operators ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleSync() {
    setSyncing(true)
    setSyncMsg('')
    try {
      const res = await fetch('/api/admin/params/operators/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSyncMsg(`同步完成，共 ${data.synced} 筆`)
      load()
    } catch (err) {
      setSyncMsg(String(err))
    } finally {
      setSyncing(false)
    }
  }

  const filtered = operators.filter(o =>
    !search ||
    o.operator.toLowerCase().includes(search.toLowerCase()) ||
    o.country_name.toLowerCase().includes(search.toLowerCase()) ||
    o.mcc.includes(search) ||
    o.network.toLowerCase().includes(search.toLowerCase())
  )

  // Group by country
  const countries = Array.from(new Set(filtered.map(o => o.country_name || o.mcc))).sort()

  const lastSynced = operators[0]?.synced_at
    ? new Date(operators[0].synced_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
    : null

  const NETWORK_COLOR: Record<string, string> = {
    '2G': 'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-800',
    '3G': 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20',
    '4G': 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20',
    '5G': 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/20',
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      <Header breadcrumb={['參數管理', '運營商管理']} />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              運營商管理
              <span className="text-sm font-normal text-gray-400 ml-2">共 {operators.length} 筆</span>
            </h1>
            {lastSynced && (
              <span className="text-xs text-gray-400">上次同步：{lastSynced}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜尋運營商、國家或MCC"
                className="pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-52 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              從商品提取
            </button>
          </div>
        </div>

        {syncMsg && (
          <div className={`mb-4 text-sm px-4 py-2.5 rounded-lg ${syncMsg.includes('失敗') || syncMsg.includes('Error') ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'}`}>
            {syncMsg}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <Loader2 size={24} className="animate-spin mr-2" /> 載入中…
          </div>
        ) : operators.length === 0 ? (
          <div className="text-center py-24 text-gray-400 text-sm">
            尚無資料，請點擊「從商品提取」整理運營商列表
          </div>
        ) : (
          <div className="space-y-6">
            {countries.map(countryName => {
              const group = filtered.filter(o => (o.country_name || o.mcc) === countryName)
              if (group.length === 0) return null
              const mcc = group[0].mcc
              return (
                <div key={countryName}>
                  <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1 flex items-center gap-2">
                    {countryName}
                    <span className="font-mono font-normal text-gray-400">MCC {mcc}</span>
                    <span>· {group.length}</span>
                  </h2>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs">
                        <tr>
                          <th className="text-left px-4 py-2.5 font-medium">運營商</th>
                          <th className="text-left px-4 py-2.5 font-medium">網絡類型</th>
                          <th className="text-left px-4 py-2.5 font-medium">優先級</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {group.map(o => (
                          <tr key={o.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-100">{o.operator}</td>
                            <td className="px-4 py-2.5">
                              {o.network
                                ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${NETWORK_COLOR[o.network] ?? 'text-gray-500 bg-gray-100'}`}>{o.network}</span>
                                : <span className="text-gray-400">—</span>
                              }
                            </td>
                            <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">{o.priority || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
