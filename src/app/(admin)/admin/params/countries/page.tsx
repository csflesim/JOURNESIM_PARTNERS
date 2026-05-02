'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { RefreshCw, Search, Loader2 } from 'lucide-react'

interface Country {
  mcc: string
  name: string
  continent: string
  flag_url: string | null
  synced_at: string
}

export default function CountriesPage() {
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [search, setSearch] = useState('')

  function load() {
    setLoading(true)
    fetch('/api/admin/params/countries')
      .then(r => r.json())
      .then(d => setCountries(d.countries ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleSync() {
    setSyncing(true)
    setSyncMsg('')
    try {
      const res = await fetch('/api/admin/params/countries/sync', { method: 'POST' })
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

  // Group by continent
  const filtered = countries.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.mcc.includes(search)
  )

  const continents = Array.from(new Set(filtered.map(c => c.continent || '其他'))).sort()

  const lastSynced = countries[0]?.synced_at
    ? new Date(countries[0].synced_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
    : null

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      <Header breadcrumb={['參數管理', '國家管理']} />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              國家管理
              <span className="text-sm font-normal text-gray-400 ml-2">共 {countries.length} 筆</span>
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
                placeholder="搜尋國家或MCC"
                className="pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-44 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
        ) : countries.length === 0 ? (
          <div className="text-center py-24 text-gray-400 text-sm">
            尚無資料，請點擊「從商品提取」整理國家列表
          </div>
        ) : (
          <div className="space-y-6">
            {continents.map(continent => {
              const group = filtered.filter(c => (c.continent || '其他') === continent)
              if (group.length === 0) return null
              return (
                <div key={continent}>
                  <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
                    {continent} · {group.length}
                  </h2>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs">
                        <tr>
                          <th className="text-left px-4 py-2.5 font-medium">MCC</th>
                          <th className="text-left px-4 py-2.5 font-medium">國家 / 地區</th>
                          <th className="text-left px-4 py-2.5 font-medium">旗幟圖示</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {group.map(c => (
                          <tr key={c.mcc} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400">{c.mcc}</td>
                            <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-100">{c.name}</td>
                            <td className="px-4 py-2.5">
                              {c.flag_url
                                ? <img src={c.flag_url} alt={c.name} className="h-5 rounded-sm" />
                                : <span className="text-xs text-gray-400">—</span>
                              }
                            </td>
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
