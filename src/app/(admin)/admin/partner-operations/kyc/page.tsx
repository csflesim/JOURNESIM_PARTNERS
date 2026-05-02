'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Search, Loader2, X, Copy, Check } from 'lucide-react'
import { clsx } from 'clsx'

// ── Types ───────────────────────────────────────────────────────────────

interface KycResult {
  iccid: string
  status: number | null
  expiryTime: string | null
  error: string | null
}

// ── Constants ───────────────────────────────────────────────────────────

const KYC_STATUS: Record<number, { label: string; color: string }> = {
  0: { label: '未認證',   color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  1: { label: '認證中',   color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  2: { label: '已認證',   color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  3: { label: '認證失敗', color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
  4: { label: '已過期',   color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
}

// ── Helpers ─────────────────────────────────────────────────────────────

function formatDate(s: string | null): string {
  if (!s) return '—'
  return new Date(s).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function parseIccids(raw: string): string[] {
  return [...new Set(
    raw.split(/[\n,，\s]+/).map(s => s.trim()).filter(Boolean)
  )]
}

// ── CopyButton ──────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button onClick={copy} className="ml-1 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
    </button>
  )
}

// ── Page ────────────────────────────────────────────────────────────────

interface Agent { id: string; nickname: string; email: string }

export default function KycPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentId, setAgentId] = useState('')
  useEffect(() => { fetch('/api/admin/agents').then(r => r.json()).then(d => setAgents(d.agents ?? [])) }, [])

  const [input, setInput] = useState('')
  const [results, setResults] = useState<KycResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [queried, setQueried] = useState(false)

  async function handleQuery() {
    const iccids = parseIccids(input)
    if (!iccids.length) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/agent/operations/kyc-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId, iccids }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResults(data.items ?? [])
      setQueried(true)
    } catch (e: any) {
      setError(e.message ?? '查詢失敗')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey) {
      const iccids = parseIccids(input)
      if (iccids.length === 1) {
        e.preventDefault()
        handleQuery()
      }
    }
  }

  const iccidCount = parseIccids(input).length
  const certified = results.filter(r => r.status === 2).length
  const uncertified = results.filter(r => r.status === 0).length
  const failed = results.filter(r => r.status === 3 || r.status === 4 || r.error).length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header breadcrumb={['運維操作', '實名認證狀態']} />

      <div className="p-6 space-y-4 max-w-4xl mx-auto">

        {/* Agent Selector */}
        <select value={agentId} onChange={e => setAgentId(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">選擇代理商</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.nickname}（{a.email}）</option>)}
        </select>

        {/* Input Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
            ICCID 輸入
            <span className="ml-2 text-xs text-gray-400 font-normal">支援多筆，以換行或逗號分隔（最多 50 筆）</span>
          </label>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={'89886930012345678901\n89886930012345678902\n89886930012345678903'}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono resize-none"
          />

          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={handleQuery}
              disabled={loading || !input.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              查詢
              {iccidCount > 0 && <span className="ml-0.5 text-indigo-200">（{iccidCount}）</span>}
            </button>
            <button
              onClick={() => { setInput(''); setResults([]); setQueried(false); setError(null) }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm transition-colors"
            >
              <X size={15} />
              清除
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Summary Stats */}
        {queried && results.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{certified}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">已認證</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-center">
              <div className="text-2xl font-bold text-gray-500 dark:text-gray-400">{uncertified}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">未認證</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 text-center">
              <div className="text-2xl font-bold text-red-500 dark:text-red-400">{failed}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">失敗 / 過期 / 錯誤</div>
            </div>
          </div>
        )}

        {/* Results Table */}
        {queried && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {results.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-sm text-gray-400">無結果</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">ICCID</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">認證狀態</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">認證有效期</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {results.map((row, i) => {
                    const statusMeta = row.status !== null ? KYC_STATUS[row.status] : null
                    return (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="flex items-center font-mono text-xs text-gray-700 dark:text-gray-300">
                            {row.iccid}
                            <CopyButton text={row.iccid} />
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {row.error ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                              查詢失敗
                            </span>
                          ) : statusMeta ? (
                            <span className={clsx('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', statusMeta.color)}>
                              {statusMeta.label}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {row.error ? (
                            <span className="text-xs text-red-400 truncate max-w-xs block" title={row.error}>
                              {row.error.replace('Error: BillionConnect API error', 'BC').substring(0, 60)}
                            </span>
                          ) : (
                            formatDate(row.expiryTime)
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Empty state */}
        {!queried && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-600">
            <Search size={36} className="mb-3 opacity-40" />
            <p className="text-sm">輸入 ICCID 查詢實名認證狀態</p>
          </div>
        )}

      </div>
    </div>
  )
}
