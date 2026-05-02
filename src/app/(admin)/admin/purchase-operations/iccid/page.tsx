'use client'

import { useState, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { Search, Loader2, RotateCcw, Download, Eye } from 'lucide-react'
import { clsx } from 'clsx'
import { useLanguage } from '@/components/language-provider'

// ── Types ────────────────────────────────────────────────────────────

interface IccidRow {
  iccid: string
  type: string        // 單次卡, 多次卡 etc.
  status: string      // 有效, 無效, 未啟用 etc.
  expiration_date: string
  postponed_month: string
  max_delay_month: string
  usage_count: string
  channel_order_id?: string | null
  agent_nickname?: string | null
  error?: string
}

// ── Constants ────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  '1': '單次卡', '2': '多次卡', '3': '硬卡', '4': 'eSIM', '5': 'eSIM Air',
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  '0': { label: '未啟用', color: 'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-800' },
  '1': { label: '有效',   color: 'text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/20' },
  '2': { label: '已過期', color: 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/20' },
  '3': { label: '已停用', color: 'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-800' },
}

// ── Main Page ────────────────────────────────────────────────────────

export default function IccidPage() {
  const { t } = useLanguage()

  const [input, setInput] = useState('')
  const [items, setItems] = useState<IccidRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [queried, setQueried] = useState(false)

  // Filters
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterUsageCount, setFilterUsageCount] = useState('')
  const [filterPostponed, setFilterPostponed] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Selected for batch operations
  const [selected, setSelected] = useState<Set<string>>(new Set())

  async function handleQuery() {
    const iccids = input.split(/[,\n\s]+/).map(s => s.trim()).filter(Boolean)
    if (!iccids.length) { setError('請輸入 ICCID'); return }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/operations/iccid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iccids }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setItems(data.items ?? [])
      setQueried(true)
      setSelected(new Set())
    } catch (e: any) {
      setError(e.message ?? '查詢失敗')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setInput('')
    setItems([])
    setQueried(false)
    setError(null)
    setFilterType('')
    setFilterStatus('')
    setFilterUsageCount('')
    setFilterPostponed('')
    setDateFrom('')
    setDateTo('')
    setSelected(new Set())
  }

  function handleExport() {
    const header = 'ICCID,類型,狀態,充值次數,累計延期天數,有效期截止日期,訂單號,代理商'
    const rows = filtered.map(r =>
      [r.iccid, TYPE_LABELS[r.type] ?? r.type, STATUS_LABELS[r.status]?.label ?? r.status,
       r.usage_count, r.postponed_month, r.expiration_date, r.channel_order_id ?? '', r.agent_nickname ?? ''].join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `iccid_${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  // Unique usage counts for filter
  const usageCountOptions = useMemo(() => {
    const set = new Set(items.map(i => i.usage_count))
    return Array.from(set).sort((a, b) => Number(a) - Number(b))
  }, [items])

  const postponedOptions = useMemo(() => {
    const set = new Set(items.map(i => i.postponed_month))
    return Array.from(set).sort((a, b) => Number(a) - Number(b))
  }, [items])

  // Filtered results
  const filtered = useMemo(() => {
    return items.filter(r => {
      if (r.error) return true // show errors
      if (filterType && r.type !== filterType) return false
      if (filterStatus && r.status !== filterStatus) return false
      if (filterUsageCount && r.usage_count !== filterUsageCount) return false
      if (filterPostponed && r.postponed_month !== filterPostponed) return false
      if (dateFrom && r.expiration_date < dateFrom) return false
      if (dateTo && r.expiration_date > dateTo + 'T23:59:59') return false
      return true
    })
  }, [items, filterType, filterStatus, filterUsageCount, filterPostponed, dateFrom, dateTo])

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(r => r.iccid)))
    }
  }

  function toggleOne(iccid: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(iccid) ? next.delete(iccid) : next.add(iccid)
      return next
    })
  }

  const selectCls = 'px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500'
  const thCls = 'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400'
  const tdCls = 'px-4 py-3 text-sm text-gray-700 dark:text-gray-300'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header breadcrumb={['運維操作', 'ICCID 管理']} />

      <div className="p-6 space-y-4">

        {/* Filter Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* ICCID input */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">ICCID</label>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleQuery()}
                placeholder="輸入 ICCID（多筆用逗號或換行分隔）"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
              />
            </div>
            {/* Type */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">ICCID 類型</label>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className={selectCls + ' w-full'}>
                <option value="">全部</option>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            {/* Status */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">ICCID 狀態</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectCls + ' w-full'}>
                <option value="">全部</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
              </select>
            </div>
            {/* Usage count */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">ICCID 充值次數</label>
              <select value={filterUsageCount} onChange={e => setFilterUsageCount(e.target.value)} className={selectCls + ' w-full'}>
                <option value="">全部</option>
                {usageCountOptions.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Postponed */}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">累計延期天數</label>
              <select value={filterPostponed} onChange={e => setFilterPostponed(e.target.value)} className={selectCls + ' w-full'}>
                <option value="">全部</option>
                {postponedOptions.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            {/* Date range */}
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">有效期截止日期</label>
              <div className="flex items-center gap-2">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className={selectCls + ' flex-1'} />
                <span className="text-gray-400">→</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className={selectCls + ' flex-1'} />
              </div>
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex justify-end gap-2">
            <button onClick={handleReset}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-1.5">
              <RotateCcw size={14} /> 重置
            </button>
            <button onClick={handleQuery} disabled={loading}
              className="px-5 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-60 flex items-center gap-1.5">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} 查詢
            </button>
            <button onClick={handleExport} disabled={filtered.length === 0}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 flex items-center gap-1.5">
              <Download size={14} /> 導出
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Results Table */}
        {queried && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Batch actions */}
            {selected.size > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-indigo-50 dark:bg-indigo-900/10">
                <span className="text-xs text-indigo-600 dark:text-indigo-400">已選 {selected.size} 筆</span>
                <div className="flex-1" />
                <button className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">批量延期</button>
                <button className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">批量升級</button>
                <button className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">批量重置</button>
                <button className="px-3 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">批量綁定</button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleAll}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    </th>
                    <th className={thCls}>ICCID</th>
                    <th className={thCls}>ICCID 類型</th>
                    <th className={thCls}>ICCID 狀態</th>
                    <th className={thCls}>ICCID 充值次數</th>
                    <th className={thCls}>累計延期天數</th>
                    <th className={thCls}>有效期截止日期</th>
                    <th className={thCls}>訂單號</th>
                    <th className={thCls}>代理商</th>
                    <th className={thCls}>操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400">無資料</td></tr>
                  ) : filtered.map(row => {
                    if (row.error) {
                      return (
                        <tr key={row.iccid} className="bg-red-50/50 dark:bg-red-900/10">
                          <td className="px-4 py-3" />
                          <td className={tdCls + ' font-mono'}>{row.iccid}</td>
                          <td colSpan={8} className={tdCls + ' text-red-500'}>{row.error}</td>
                        </tr>
                      )
                    }
                    const typeLabel = TYPE_LABELS[row.type] ?? row.type
                    const statusInfo = STATUS_LABELS[row.status] ?? { label: row.status, color: 'text-gray-500 bg-gray-100' }
                    return (
                      <tr key={row.iccid} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selected.has(row.iccid)} onChange={() => toggleOne(row.iccid)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        </td>
                        <td className={tdCls + ' font-mono text-xs'}>{row.iccid}</td>
                        <td className={tdCls}>{typeLabel}</td>
                        <td className={tdCls}>
                          <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', statusInfo.color)}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className={tdCls}>{row.usage_count}</td>
                        <td className={tdCls}>{row.postponed_month}</td>
                        <td className={tdCls + ' text-xs'}>{row.expiration_date}</td>
                        <td className={tdCls + ' text-xs text-gray-500'}>{row.channel_order_id ?? '—'}</td>
                        <td className={tdCls + ' text-xs text-gray-500'}>{row.agent_nickname ?? '—'}</td>
                        <td className={tdCls}>
                          <button className="p-1 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded" title="查看詳情">
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400">
              共 {filtered.length} 筆
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
