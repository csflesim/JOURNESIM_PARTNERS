'use client'

import { useState, useCallback, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import {
  Search, Loader2, X, Copy, Check,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { clsx } from 'clsx'

// ── Types ───────────────────────────────────────────────────────────────

interface PlanRow {
  id: string
  channel_sub_order_id: string
  bc_sub_order_id: string | null
  sku_id: string
  sku_name: string
  order_type: string
  iccids: string[]
  plan_status: string | null
  plan_start_time: string | null
  plan_end_time: string | null
  channel_order_id: string
  bc_order_id: string | null
  order_created_at: string
  has_esim_profile: boolean
  matched_iccid: string | null
}

interface DetailsData {
  orderItem: any
  esimProfile: any
  bcPlanUsage: any[] | null
}

interface UsageData {
  orderId: string
  channelOrderId: string
  subOrderList: {
    skuId: string
    skuName: string
    copies: string
    planStatus: string
    planStartTime?: string
    planEndTime?: string
    totalDays?: string
    totalTraffic?: string
    highFlowSize?: string
    planType?: string
    usageInfoList?: { useDate: string; useageAmt: string }[]
    country?: { mcc: string; name: string; apn: string }[]
  }[]
}

interface TrafficData {
  usedDate: string
  type: string
  usedAmount: string
  country: string
  countryRegionCode: string
}

// ── Constants ───────────────────────────────────────────────────────────

const PLAN_STATUS_OPTIONS = [
  { value: '', label: '全部狀態' },
  { value: '0', label: '未使用' },
  { value: '1', label: '使用中' },
  { value: '2', label: '已結束' },
  { value: '3', label: '已取消' },
]

const PLAN_STATUS_LABEL: Record<string, string> = {
  '0': '未使用', '1': '使用中', '2': '已結束', '3': '已取消',
}

const PLAN_STATUS_COLOR: Record<string, string> = {
  '0': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  '1': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  '2': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  '3': 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
}

const ORDER_TYPE_LABEL: Record<string, string> = {
  esim: 'eSIM', esim_air: 'eSIM Air', sim: 'SIM', esim_recharge: 'eSIM 充值',
}

const TRAFFIC_TYPE_LABEL: Record<string, string> = {
  '0': '數據', '1': '簡訊', '2': 'USSD', '3': 'LU',
}

// ── Helpers ─────────────────────────────────────────────────────────────

function formatKB(kb: string | null | undefined): string {
  if (!kb) return '—'
  const val = parseFloat(kb)
  if (isNaN(val) || val === -1) return '無限流量'
  if (val >= 1048576) return `${(val / 1048576).toFixed(val % 1048576 === 0 ? 0 : 1)} GB`
  if (val >= 1024) return `${(val / 1024).toFixed(val % 1024 === 0 ? 0 : 1)} MB`
  return `${val} KB`
}

function formatDate(s: string | null | undefined): string {
  if (!s) return '—'
  return new Date(s).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatDateShort(s: string | null | undefined): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('zh-TW')
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
    <button onClick={copy} className="ml-1.5 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
    </button>
  )
}

// ── PlanStatusBadge ─────────────────────────────────────────────────────

function PlanStatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-gray-400 text-xs">—</span>
  return (
    <span className={clsx('inline-flex px-2 py-0.5 rounded-full text-xs font-medium', PLAN_STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-600')}>
      {PLAN_STATUS_LABEL[status] ?? status}
    </span>
  )
}

// ── Modals ──────────────────────────────────────────────────────────────

function ModalWrapper({ title, onClose, children, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className={clsx(
        'bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] w-full',
        wide ? 'max-w-3xl' : 'max-w-xl'
      )}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex gap-2 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-xs text-gray-500 dark:text-gray-400 w-28 shrink-0 pt-0.5">{label}</span>
      <span className={clsx('text-sm text-gray-800 dark:text-gray-200 break-all', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  )
}

// ── DetailsModal ────────────────────────────────────────────────────────

function DetailsModal({ row, onClose }: { row: PlanRow; onClose: () => void }) {
  const [data, setData] = useState<DetailsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const iccid = row.matched_iccid ?? row.iccids[0]

  useEffect(() => {
    const params = new URLSearchParams()
    if (iccid) params.set('iccid', iccid)
    if (row.id) params.set('order_item_id', row.id)
    fetch(`/api/agent/operations/plan-details?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const order = data?.orderItem
    ? (Array.isArray(data.orderItem.orders) ? data.orderItem.orders[0] : data.orderItem.orders)
    : null
  const product = data?.orderItem
    ? (Array.isArray(data.orderItem.products) ? data.orderItem.products[0] : data.orderItem.products)
    : null
  const ep = data?.esimProfile
  const isEsim = ['esim', 'esim_air'].includes(row.order_type)

  // Latest plan info from F012
  const latestPlan = data?.bcPlanUsage
    ?.flatMap(u => u.subOrderList ?? [])
    .find((s: any) => s.skuId === row.sku_id)

  return (
    <ModalWrapper title="套餐詳情" onClose={onClose} wide>
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-indigo-500" />
        </div>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && data && (
        <div className="space-y-5">

          {/* 套餐信息 */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">套餐信息</h3>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4">
              <InfoRow label="套餐名稱" value={row.sku_name} />
              <InfoRow label="套餐 SKU" value={row.sku_id} mono />
              <InfoRow label="套餐類型" value={product?.plan_type === '1' ? '單日型' : product?.plan_type === '0' ? '總量型' : '—'} />
              <InfoRow label="套餐天數" value={product?.days ? `${product.days} 天` : '—'} />
              <InfoRow label="流量" value={formatKB(product?.capacity)} />
              <InfoRow label="套餐狀態" value={
                latestPlan
                  ? <PlanStatusBadge status={latestPlan.planStatus} />
                  : <PlanStatusBadge status={row.plan_status} />
              } />
              <InfoRow label="開始時間" value={formatDate(latestPlan?.planStartTime ?? row.plan_start_time)} />
              <InfoRow label="結束時間" value={formatDate(latestPlan?.planEndTime ?? row.plan_end_time)} />
              {latestPlan?.totalTraffic && (
                <InfoRow label="總流量" value={formatKB(latestPlan.totalTraffic)} />
              )}
              {latestPlan?.remainingTraffic && (
                <InfoRow label="剩餘流量" value={formatKB(latestPlan.remainingTraffic)} />
              )}
              {latestPlan?.remainingDays && (
                <InfoRow label="剩餘天數" value={`${latestPlan.remainingDays} 天`} />
              )}
            </div>
          </section>

          {/* eSIM 信息 */}
          {isEsim && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">eSIM 信息</h3>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4">
                <InfoRow label="ICCID" value={
                  <span className="flex items-center font-mono text-xs">{iccid ?? '—'}{iccid && <CopyButton text={iccid} />}</span>
                } />
                {ep ? (
                  <>
                    <InfoRow label="啟動碼 (QR)" value={
                      ep.qr_code_content
                        ? <span className="flex items-center font-mono text-xs break-all">{ep.qr_code_content}<CopyButton text={ep.qr_code_content} /></span>
                        : '—'
                    } />
                    {ep.confirmation_code && (
                      <InfoRow label="確認碼" value={
                        <span className="flex items-center font-mono text-xs">{ep.confirmation_code}<CopyButton text={ep.confirmation_code} /></span>
                      } />
                    )}
                    {ep.pin && (
                      <InfoRow label="PIN" value={
                        <span className="flex items-center font-mono text-xs">{ep.pin}<CopyButton text={ep.pin} /></span>
                      } />
                    )}
                    {ep.puk && (
                      <InfoRow label="PUK" value={
                        <span className="flex items-center font-mono text-xs">{ep.puk}<CopyButton text={ep.puk} /></span>
                      } />
                    )}
                    {ep.apn && <InfoRow label="APN" value={<span className="font-mono text-xs">{ep.apn}</span>} />}
                    {ep.msisdn && <InfoRow label="MSISDN" value={<span className="font-mono text-xs">{ep.msisdn}</span>} />}
                    <InfoRow label="Profile 狀態" value={ep.profile_status === 1 ? '已啟用' : ep.profile_status === 0 ? '待啟用' : String(ep.profile_status)} />
                    {ep.valid_time && <InfoRow label="有效期至" value={formatDate(ep.valid_time)} />}
                  </>
                ) : (
                  <InfoRow label="eSIM Profile" value="尚未接收 (待 N009 推送)" />
                )}
              </div>
            </section>
          )}

          {/* SIM ICCID 列表 */}
          {!isEsim && row.iccids.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
                ICCID 列表（{row.iccids.length} 張）
              </h3>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-2 max-h-48 overflow-y-auto">
                {row.iccids.map(id => (
                  <div key={id} className="flex items-center gap-1 py-0.5">
                    <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{id}</span>
                    <CopyButton text={id} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 訂單信息 */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">訂單信息</h3>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4">
              <InfoRow label="内部訂單號" value={
                <span className="flex items-center font-mono text-xs">{row.channel_order_id}<CopyButton text={row.channel_order_id} /></span>
              } />
              <InfoRow label="亿点訂單號" value={
                row.bc_order_id
                  ? <span className="flex items-center font-mono text-xs">{row.bc_order_id}<CopyButton text={row.bc_order_id} /></span>
                  : '—'
              } />
              <InfoRow label="子訂單號" value={
                row.bc_sub_order_id
                  ? <span className="flex items-center font-mono text-xs">{row.bc_sub_order_id}<CopyButton text={row.bc_sub_order_id} /></span>
                  : '—'
              } />
              <InfoRow label="載體類型" value={ORDER_TYPE_LABEL[row.order_type] ?? row.order_type} />
              <InfoRow label="訂單創建時間" value={formatDate(row.order_created_at)} />
              {order?.user_email && <InfoRow label="用戶 Email" value={order.user_email} />}
            </div>
          </section>

        </div>
      )}
    </ModalWrapper>
  )
}

// ── UsageModal (F046) ───────────────────────────────────────────────────

function UsageModal({ row, onClose }: { row: PlanRow; onClose: () => void }) {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSubs, setExpandedSubs] = useState<number[]>([0])
  const iccid = row.matched_iccid ?? row.iccids[0]

  useEffect(() => {
    const params = new URLSearchParams({ iccid: iccid ?? '' })
    if (row.bc_order_id) params.set('orderId', row.bc_order_id)
    fetch(`/api/agent/operations/plan-usage?${params}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
        setLoading(false)
      })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSub(idx: number) {
    setExpandedSubs(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])
  }

  return (
    <ModalWrapper title={`用量查詢 — ${iccid ?? ''}`} onClose={onClose} wide>
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-indigo-500" />
        </div>
      )}
      {error && <p className="text-sm text-red-500">查詢失敗：{error}</p>}
      {!loading && data && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 pb-1">
            <span>亿点訂單號：<span className="font-mono">{data.orderId}</span></span>
            <span>内部訂單號：<span className="font-mono">{data.channelOrderId}</span></span>
          </div>

          {data.subOrderList?.map((sub, idx) => (
            <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              {/* Sub order header */}
              <button
                onClick={() => toggleSub(idx)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{sub.skuName}</span>
                  <PlanStatusBadge status={sub.planStatus} />
                  {sub.copies && parseInt(sub.copies) > 1 && (
                    <span className="text-xs text-gray-400">×{sub.copies}</span>
                  )}
                </div>
                {expandedSubs.includes(idx) ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
              </button>

              {expandedSubs.includes(idx) && (
                <div className="px-4 py-3 space-y-3">
                  {/* Plan stats */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {sub.totalTraffic && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5">
                        <div className="text-xs text-blue-500 dark:text-blue-400 mb-0.5">總流量</div>
                        <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">{formatKB(sub.totalTraffic)}</div>
                      </div>
                    )}
                    {sub.highFlowSize && (
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-2.5">
                        <div className="text-xs text-indigo-500 dark:text-indigo-400 mb-0.5">高速流量</div>
                        <div className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                          {formatKB(sub.highFlowSize)}{sub.planType === '1' ? '/天' : ''}
                        </div>
                      </div>
                    )}
                    {sub.totalDays && (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2.5">
                        <div className="text-xs text-green-500 dark:text-green-400 mb-0.5">套餐天數</div>
                        <div className="text-sm font-semibold text-green-700 dark:text-green-300">{sub.totalDays} 天</div>
                      </div>
                    )}
                    {(sub.planStartTime || sub.planEndTime) && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">
                        <div className="text-xs text-gray-400 mb-0.5">有效期</div>
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {formatDateShort(sub.planStartTime)} ~ {formatDateShort(sub.planEndTime)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Country list */}
                  {sub.country && sub.country.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">覆蓋國家</div>
                      <div className="flex flex-wrap gap-1.5">
                        {sub.country.map(c => (
                          <span key={c.mcc} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-300">
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Daily usage table */}
                  {sub.usageInfoList && sub.usageInfoList.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">每日用量</div>
                      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800">
                              <th className="text-left px-3 py-2 text-gray-500 dark:text-gray-400 font-medium">日期</th>
                              <th className="text-right px-3 py-2 text-gray-500 dark:text-gray-400 font-medium">用量</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {sub.usageInfoList.map((u, i) => (
                              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-300">{u.useDate}</td>
                                <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{formatKB(u.useageAmt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </ModalWrapper>
  )
}

// ── TrafficModal (F023) ─────────────────────────────────────────────────

function TrafficModal({ row, onClose }: { row: PlanRow; onClose: () => void }) {
  const iccid = row.matched_iccid ?? row.iccids[0]

  // Default: last 7 days
  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 6)
  const toDateStr = (d: Date) => d.toISOString().substring(0, 10)

  const [beginDate, setBeginDate] = useState(toDateStr(sevenDaysAgo))
  const [endDate, setEndDate] = useState(toDateStr(today))
  const [tzType, setTzType] = useState<'0' | '1'>('1')
  const [data, setData] = useState<TrafficData[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function query() {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ iccid: iccid ?? '', beginDate, endDate, tzType })
    fetch(`/api/agent/operations/daily-traffic?${params}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(Array.isArray(d) ? d : [])
        setLoading(false)
      })
      .catch(e => { setError(String(e)); setLoading(false) })
  }

  const totalKB = data?.reduce((sum, row) => sum + (row.type === '0' ? parseFloat(row.usedAmount) || 0 : 0), 0)

  return (
    <ModalWrapper title={`查詢高速用量 — ${iccid ?? ''}`} onClose={onClose} wide>
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">開始日期</label>
            <input
              type="date"
              value={beginDate}
              max={endDate}
              onChange={e => setBeginDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">結束日期</label>
            <input
              type="date"
              value={endDate}
              min={beginDate}
              max={toDateStr(today)}
              onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">時區</label>
            <select
              value={tzType}
              onChange={e => setTzType(e.target.value as '0' | '1')}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100"
            >
              <option value="1">東八區（UTC+8）</option>
              <option value="0">運營商時區</option>
            </select>
          </div>
          <button
            onClick={query}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            查詢
          </button>
        </div>

        {error && <p className="text-sm text-red-500">查詢失敗：{error}</p>}

        {data && (
          <>
            {/* Summary */}
            {totalKB !== undefined && totalKB > 0 && (
              <div className="flex items-center gap-4 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                <div>
                  <div className="text-xs text-indigo-500 dark:text-indigo-400">查詢期間數據總用量</div>
                  <div className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{formatKB(String(totalKB))}</div>
                </div>
              </div>
            )}

            {data.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">此期間無流量記錄</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400">日期</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400">類型</th>
                      <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400">用量</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400">國家</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400">地區代碼</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {data.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-700 dark:text-gray-300">{row.usedDate}</td>
                        <td className="px-4 py-2.5">
                          <span className={clsx(
                            'inline-flex px-2 py-0.5 rounded-full text-xs',
                            row.type === '0' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          )}>
                            {TRAFFIC_TYPE_LABEL[row.type] ?? row.type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">
                          {row.type === '0' ? formatKB(row.usedAmount) : `${row.usedAmount} 條`}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{row.country}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-500">{row.countryRegionCode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </ModalWrapper>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────

type ModalState =
  | { type: 'details'; row: PlanRow }
  | { type: 'usage'; row: PlanRow }
  | { type: 'traffic'; row: PlanRow }
  | null

interface Agent { id: string; nickname: string; email: string }

export default function PlanQueryPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentId, setAgentId] = useState('')
  useEffect(() => { fetch('/api/admin/agents').then(r => r.json()).then(d => setAgents(d.agents ?? [])) }, [])

  const [iccid, setIccid] = useState('')
  const [bcOrderId, setBcOrderId] = useState('')
  const [planStatus, setPlanStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [items, setItems] = useState<PlanRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const [modal, setModal] = useState<ModalState>(null)

  const limit = 20

  const doSearch = useCallback(async (p = 1) => {
    setLoading(true)
    setError(null)
    if (!agentId) { setError('請先選擇代理商'); setLoading(false); return }
    const params = new URLSearchParams({ page: String(p), limit: String(limit), agent_id: agentId })
    if (iccid.trim()) params.set('iccid', iccid.trim())
    if (bcOrderId.trim()) params.set('bc_order_id', bcOrderId.trim())
    if (planStatus) params.set('plan_status', planStatus)
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)

    try {
      const res = await fetch(`/api/agent/operations/plan-query?${params}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setItems(data.items ?? [])
      setTotal(data.total ?? 0)
      setPage(p)
      setSearched(true)
    } catch (e: any) {
      setError(e.message ?? '查詢失敗')
    } finally {
      setLoading(false)
    }
  }, [agentId, iccid, bcOrderId, planStatus, dateFrom, dateTo])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') doSearch(1)
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header breadcrumb={['運維操作', '套餐信息查詢']} />

      <div className="p-6 space-y-4">

        {/* Agent Selector */}
        <select value={agentId} onChange={e => setAgentId(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">選擇代理商</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.nickname}（{a.email}）</option>)}
        </select>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">ICCID</label>
              <input
                value={iccid}
                onChange={e => setIccid(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="輸入 ICCID"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">亿点訂單號</label>
              <input
                value={bcOrderId}
                onChange={e => setBcOrderId(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="輸入亿点訂單號"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">套餐狀態</label>
              <select
                value={planStatus}
                onChange={e => setPlanStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {PLAN_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">訂單創建時間（起）</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">訂單創建時間（迄）</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => doSearch(1)}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              搜尋
            </button>
            <button
              onClick={() => {
                setIccid(''); setBcOrderId(''); setPlanStatus(''); setDateFrom(''); setDateTo('')
                setItems([]); setTotal(0); setSearched(false)
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm transition-colors"
            >
              <X size={15} />
              清除
            </button>
            {searched && !loading && (
              <span className="text-sm text-gray-400 dark:text-gray-500">共 {total} 筆</span>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Results Table */}
        {searched && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {items.length === 0 ? (
              <div className="flex items-center justify-center py-16 text-sm text-gray-400">
                {loading ? <Loader2 size={20} className="animate-spin" /> : '無符合記錄'}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">ICCID / 數量</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">套餐名稱</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">載體類型</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">套餐狀態</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">訂單創建時間</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {items.map(item => {
                        const displayIccid = item.matched_iccid ?? (item.iccids.length === 1 ? item.iccids[0] : null)
                        return (
                          <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-4 py-3">
                              {displayIccid ? (
                                <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{displayIccid}</span>
                              ) : item.iccids.length > 0 ? (
                                <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                                  {item.iccids[0]}
                                  {item.iccids.length > 1 && (
                                    <span className="ml-1 text-gray-400 font-sans">+{item.iccids.length - 1}</span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-800 dark:text-gray-200 max-w-xs truncate">{item.sku_name}</td>
                            <td className="px-4 py-3">
                              <span className={clsx(
                                'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                                ['esim', 'esim_air'].includes(item.order_type)
                                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              )}>
                                {ORDER_TYPE_LABEL[item.order_type] ?? item.order_type}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <PlanStatusBadge status={item.plan_status} />
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              {formatDate(item.order_created_at)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setModal({ type: 'details', row: item })}
                                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
                                >
                                  套餐詳情
                                </button>
                                {(item.iccids.length > 0 || item.matched_iccid) && (
                                  <>
                                    <span className="text-gray-300 dark:text-gray-700">|</span>
                                    <button
                                      onClick={() => setModal({ type: 'usage', row: item })}
                                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
                                    >
                                      用量查詢
                                    </button>
                                    <span className="text-gray-300 dark:text-gray-700">|</span>
                                    <button
                                      onClick={() => setModal({ type: 'traffic', row: item })}
                                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
                                    >
                                      高速用量
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      第 {page} / {totalPages} 頁，共 {total} 筆
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => doSearch(page - 1)}
                        disabled={page <= 1 || loading}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        上一頁
                      </button>
                      <button
                        onClick={() => doSearch(page + 1)}
                        disabled={page >= totalPages || loading}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        下一頁
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Empty state before search */}
        {!searched && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
            <Search size={36} className="mb-3 opacity-40" />
            <p className="text-sm">請輸入 ICCID 或亿点訂單號進行搜尋</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal?.type === 'details' && <DetailsModal row={modal.row} onClose={() => setModal(null)} />}
      {modal?.type === 'usage' && <UsageModal row={modal.row} onClose={() => setModal(null)} />}
      {modal?.type === 'traffic' && <TrafficModal row={modal.row} onClose={() => setModal(null)} />}
    </div>
  )
}
