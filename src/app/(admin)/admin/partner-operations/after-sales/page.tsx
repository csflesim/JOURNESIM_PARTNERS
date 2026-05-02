'use client'

import { useState, useCallback, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Search, X, Loader2, Copy, Check } from 'lucide-react'
import { clsx } from 'clsx'

// ── Types ─────────────────────────────────────────────────────────────────

interface AfterSaleRow {
  id: string
  channel_order_id: string
  channel_sub_order_id: string | null
  bc_after_sale_id: string | null
  bc_order_id: string | null
  iccid: string[] | null
  reason: string | null
  refund_type: string | null
  refund_amount: number | null
  unsubscribe_flow: string | null
  status: string
  comment: string | null
  created_at: string
  sku_name: string | null
}

// ── Constants ──────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: '', label: '全部狀態' },
  { value: 'pending',  label: '待審核' },
  { value: 'approved', label: '審核通過' },
  { value: 'refunded', label: '已退款' },
  { value: 'rejected', label: '已駁回' },
]

const STATUS_BADGE: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  refunded: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
}

const STATUS_LABEL: Record<string, string> = {
  pending: '待審核', approved: '審核通過', refunded: '已退款', rejected: '已駁回',
}

const REASON_LABEL: Record<string, string> = {
  '1': '信號問題', '2': '速度問題', '3': '未收到貨',
  '4': '重複下單', '14': '商品問題', '20': '無理由退訂', '99': '其他',
}

const REFUND_TYPE_LABEL: Record<string, string> = { '0': '自動退款', '1': '協定退款' }

// Audit & refund status from BC F020
const AUDIT_STATUS_LABEL: Record<string, string> = {
  '0': '未審核', '1': '已撤回', '2': '審核通過', '3': '已駁回', '4': '待修改',
}
const REFUND_STATUS_LABEL: Record<string, string> = {
  '0': '待退款', '1': '已退款', '2': '已駁回',
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(s: string | null | undefined): string {
  if (!s) return '- - - -'
  return new Date(s).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).replace(/\//g, '-')
}

// ── CopyButton ─────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="ml-1 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors">
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
    </button>
  )
}

// ── Timeline ───────────────────────────────────────────────────────────────

const TIMELINE_STEPS = ['未售後', '待審核', '審核通過', '已退款']

function Timeline({ steps, activeIdx, dates }: { steps: string[]; activeIdx: number; dates?: (string | null)[] }) {
  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-mono w-36 text-right shrink-0">
            {dates?.[i] ? formatDate(dates[i]) : '- - - -'}
          </span>
          <div className={clsx(
            'w-3 h-3 rounded-full flex-shrink-0 border-2',
            i === activeIdx
              ? 'bg-indigo-600 border-indigo-600'
              : i < activeIdx
              ? 'bg-indigo-200 border-indigo-200 dark:bg-indigo-800 dark:border-indigo-800'
              : 'bg-transparent border-gray-300 dark:border-gray-600'
          )} />
          <span className={clsx('text-sm', i === activeIdx ? 'font-medium text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400')}>
            {step}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── DetailModal ────────────────────────────────────────────────────────────

function DetailModal({ row, onClose }: { row: AfterSaleRow; onClose: () => void }) {
  const [bcData, setBcData] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!row.bc_after_sale_id) return
    setLoading(true)
    fetch('/api/agent/operations/after-sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bcAfterSaleId: row.bc_after_sale_id }),
    }).then(r => r.json()).then(d => { if (!d.error) setBcData(d) })
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Timeline index based on BC auditStatus or local status
  const auditStatus = bcData?.auditStatus
  const refundStatus = bcData?.refundStatus
  let timelineIdx = 0
  if (row.status === 'pending' || auditStatus === '0' || auditStatus === '4') timelineIdx = 1
  else if (row.status === 'approved' || auditStatus === '2') {
    timelineIdx = refundStatus === '1' ? 3 : 2
  } else if (row.status === 'refunded' || refundStatus === '1') timelineIdx = 3

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            售後單號：{row.bc_after_sale_id ?? row.id}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Info */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl divide-y divide-gray-100 dark:divide-gray-800 text-sm">
            {[
              ['亿点訂單號', row.bc_order_id],
              ['店鋪訂單號', row.channel_order_id],
              ['套餐名稱', row.sku_name],
            ].map(([label, val]) => (
              <div key={label as string} className="flex gap-3 px-4 py-2">
                <span className="text-gray-500 w-24 shrink-0">{label}</span>
                <span className="text-gray-800 dark:text-gray-200 break-all font-mono text-xs">{val ?? '--'}</span>
              </div>
            ))}
            <div className="flex gap-3 px-4 py-2">
              <span className="text-gray-500 w-24 shrink-0 text-sm">售後 ICCID</span>
              <span className="font-mono text-xs text-gray-800 dark:text-gray-200">
                {row.iccid?.map(id => (
                  <span key={id} className="flex items-center">{id}<CopyButton text={id} /></span>
                )) ?? '--'}
              </span>
            </div>
            {[
              ['售後類型', REASON_LABEL[row.reason ?? ''] ?? row.reason],
              ['退款方式', REFUND_TYPE_LABEL[row.refund_type ?? ''] ?? row.refund_type],
              ['退款金額', row.refund_amount != null ? `CNY ${row.refund_amount}` : '--'],
              ['退訂流量', row.unsubscribe_flow === '1' ? '需退訂流量' : row.unsubscribe_flow === '0' ? '不退訂流量' : '--'],
              ['備註', row.comment],
            ].map(([label, val]) => (
              <div key={label as string} className="flex gap-3 px-4 py-2">
                <span className="text-gray-500 w-24 shrink-0 text-sm">{label}</span>
                <span className="text-sm text-gray-800 dark:text-gray-200">{val ?? '--'}</span>
              </div>
            ))}
            {bcData && (
              <>
                <div className="flex gap-3 px-4 py-2">
                  <span className="text-gray-500 w-24 shrink-0 text-sm">審核狀態</span>
                  <span className="text-sm text-gray-800 dark:text-gray-200">{AUDIT_STATUS_LABEL[bcData.auditStatus] ?? bcData.auditStatus}</span>
                </div>
                {bcData.auditOpinion && (
                  <div className="flex gap-3 px-4 py-2">
                    <span className="text-gray-500 w-24 shrink-0 text-sm">審核意見</span>
                    <span className="text-sm text-gray-800 dark:text-gray-200">{bcData.auditOpinion}</span>
                  </div>
                )}
                <div className="flex gap-3 px-4 py-2">
                  <span className="text-gray-500 w-24 shrink-0 text-sm">退款狀態</span>
                  <span className="text-sm text-gray-800 dark:text-gray-200">{REFUND_STATUS_LABEL[bcData.refundStatus ?? ''] ?? '--'}</span>
                </div>
              </>
            )}
            {loading && (
              <div className="flex items-center gap-2 px-4 py-2 text-xs text-gray-400">
                <Loader2 size={12} className="animate-spin" />查詢亿点狀態中...
              </div>
            )}
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">售後歷史狀態</h3>
            <Timeline
              steps={TIMELINE_STEPS}
              activeIdx={timelineIdx}
              dates={[null, row.created_at, null, null]}
            />
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

interface Agent { id: string; nickname: string; email: string }

export default function AfterSalesPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentId, setAgentId] = useState('')
  useEffect(() => { fetch('/api/admin/agents').then(r => r.json()).then(d => setAgents(d.agents ?? [])) }, [])

  const [channelOrderId, setChannelOrderId] = useState('')
  const [bcAfterSaleId, setBcAfterSaleId] = useState('')
  const [iccid, setIccid] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [items, setItems] = useState<AfterSaleRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [detailRow, setDetailRow] = useState<AfterSaleRow | null>(null)

  const limit = 20

  const doSearch = useCallback(async (p = 1) => {
    setLoading(true); setError(null)
    if (!agentId) { setError('請先選擇代理商'); setLoading(false); return }
    const params = new URLSearchParams({ page: String(p), limit: String(limit), agent_id: agentId })
    if (channelOrderId.trim()) params.set('channel_order_id', channelOrderId.trim())
    if (bcAfterSaleId.trim()) params.set('bc_after_sale_id', bcAfterSaleId.trim())
    if (iccid.trim()) params.set('iccid', iccid.trim())
    if (status) params.set('status', status)
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    try {
      const res = await fetch(`/api/agent/operations/after-sales?${params}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setItems(data.items ?? [])
      setTotal(data.total ?? 0)
      setPage(p)
      setSearched(true)
    } catch (e: any) { setError(e.message ?? '查詢失敗') }
    finally { setLoading(false) }
  }, [agentId, channelOrderId, bcAfterSaleId, iccid, status, dateFrom, dateTo])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header breadcrumb={['運維操作', '售後列表']} />

      <div className="p-6 space-y-4">

        {/* Agent Selector */}
        <select value={agentId} onChange={e => setAgentId(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">選擇代理商</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.nickname}（{a.email}）</option>)}
        </select>

        {/* Filter */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: '亿点/店鋪訂單號', val: channelOrderId, set: setChannelOrderId, ph: '請輸入' },
              { label: '售後單號', val: bcAfterSaleId, set: setBcAfterSaleId, ph: '請輸入' },
              { label: '售後 ICCID', val: iccid, set: setIccid, ph: '請輸入', mono: true },
            ].map(f => (
              <div key={f.label}>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{f.label}</label>
                <input value={f.val} onChange={e => f.set(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doSearch(1)}
                  placeholder={f.ph}
                  className={clsx('w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500', f.mono && 'font-mono')} />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">售後狀態</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">申請時間</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <span className="text-gray-400">→</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <button onClick={() => doSearch(1)} disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 ml-auto">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              查詢
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-indigo-500" /></div>
          ) : items.length === 0 && searched ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">無符合記錄</div>
          ) : items.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">亿点訂單號</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">套餐名稱</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">退款金額</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">售後狀態</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">申請時間</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {items.map(row => (
                      <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                          {row.bc_order_id ?? row.channel_order_id}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-xs truncate" title={row.sku_name ?? ''}>
                          {row.sku_name ?? '--'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {row.refund_amount != null ? row.refund_amount : '--'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx('inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                            STATUS_BADGE[row.status] ?? 'bg-gray-100 text-gray-600')}>
                            {STATUS_LABEL[row.status] ?? row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {formatDate(row.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setDetailRow(row)}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-medium">
                            查看詳情
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-xs text-gray-500">第 {page} / {totalPages} 頁，共 {total} 筆</span>
                  <div className="flex gap-2">
                    <button onClick={() => doSearch(page - 1)} disabled={page <= 1 || loading}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50">上一頁</button>
                    <button onClick={() => doSearch(page + 1)} disabled={page >= totalPages || loading}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 disabled:opacity-40 hover:bg-gray-50">下一頁</button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {detailRow && <DetailModal row={detailRow} onClose={() => setDetailRow(null)} />}
    </div>
  )
}
