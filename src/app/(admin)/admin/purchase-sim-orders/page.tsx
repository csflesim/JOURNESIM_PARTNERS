'use client'

import { useState, useCallback, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import {
  Search, X, Loader2, ChevronDown, ChevronRight,
  Plus, Minus, Copy, Check, Download,
} from 'lucide-react'
import { clsx } from 'clsx'

// ── Types ────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string
  channel_sub_order_id: string
  bc_sub_order_id: string | null
  sku_id: string
  copies: number
  number: number
  iccid: string[] | null
  plan_status: string | null
  plan_start_time: string | null
  plan_end_time: string | null
  products: {
    name: string; type: string; days: string | null; capacity: string | null
    high_flow_size: string | null; limit_flow_speed: string | null
    hotspot_support: string | null; desc_text: string | null
    apn: string | null; provider: string | null; speed_limit_rule: string | null
    plan_type: string | null
  } | null
}

interface Order {
  id: string
  channel_order_id: string
  bc_order_id: string | null
  order_type: string
  order_status: string
  total_amount: number | null
  estimated_use_time: string | null
  comment: string | null
  created_at: string
  source: string
  user_email: string | null
  after_sale_status: string | null
  order_items: OrderItem[]
}

// ── Constants ─────────────────────────────────────────────────────────────

const ORDER_STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'pending', label: '待處理' },
  { value: 'processing', label: '處理中' },
  { value: 'success', label: '訂購成功' },
  { value: 'failed', label: '失敗' },
  { value: 'cancelled', label: '已取消' },
]

const PLAN_STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: '0', label: '未激活' },
  { value: '1', label: '使用中' },
  { value: '2', label: '已結束' },
  { value: '3', label: '已取消' },
]

const AFTER_SALE_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'none', label: '未售後' },
  { value: 'pending', label: '待審核' },
  { value: 'approved', label: '審核通過' },
  { value: 'refunded', label: '已退款' },
]

const REFUND_TYPE_OPTIONS = [
  { value: '0', label: '自動退款' },
  { value: '1', label: '協定退款' },
]

// BC F017 售後原因代碼
const AFTER_SALE_REASON_OPTIONS = [
  { value: '20', label: '無理由退訂' },
  { value: '14', label: '商品問題' },
  { value: '1',  label: '信號問題' },
  { value: '2',  label: '速度問題' },
  { value: '3',  label: '未收到貨' },
  { value: '4',  label: '重複下單' },
  { value: '99', label: '其他' },
]

const ORDER_STATUS_BADGE: Record<string, string> = {
  pending:    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  processing: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  success:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  failed:     'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  cancelled:  'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: '待處理', processing: '處理中', success: '訂購成功',
  failed: '失敗', cancelled: '已取消',
}

const PLAN_STATUS_LABEL: Record<string, string> = {
  '0': '未激活', '1': '已激活', '2': '已結束', '3': '已取消',
}

const AFTER_SALE_LABEL: Record<string, string> = {
  pending: '待審核', approved: '審核通過', refunded: '已退款',
}

// ── Helpers ───────────────────────────────────────────────────────────────

function formatKB(kb: string | null | undefined): string {
  if (!kb) return '—'
  const v = parseFloat(kb)
  if (isNaN(v) || v === -1) return '無限流量'
  if (v >= 1048576) return `${(v / 1048576).toFixed(v % 1048576 === 0 ? 0 : 1)} GB`
  if (v >= 1024) return `${(v / 1024).toFixed(v % 1024 === 0 ? 0 : 1)} MB`
  return `${v} KB`
}

function formatKbps(kbps: string | null): string {
  if (!kbps) return '—'
  const v = parseFloat(kbps)
  if (isNaN(v) || v === -1) return '不限速'
  if (v === 0) return '斷網'
  if (v >= 1024) return `${(v / 1024).toFixed(1)} Mbps`
  return `${v} kbps`
}

function formatDate(s: string | null | undefined): string {
  if (!s) return '--'
  return new Date(s).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).replace(/\//g, '-')
}

function getAllIccids(order: Order): string[] {
  return order.order_items.flatMap(item => item.iccid ?? [])
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

// ── ModalWrapper ───────────────────────────────────────────────────────────

function ModalWrapper({ title, onClose, children, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className={clsx('bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] w-full', wide ? 'max-w-3xl' : 'max-w-xl')}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-xs text-gray-500 dark:text-gray-400 w-28 shrink-0 pt-0.5">{label}</span>
      <span className={clsx('text-sm text-gray-800 dark:text-gray-200 break-all', mono && 'font-mono text-xs')}>{value ?? '--'}</span>
    </div>
  )
}

// ── OrderDetailModal ───────────────────────────────────────────────────────

function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const item = order.order_items[0]
  const product = item?.products
  const iccids = getAllIccids(order)

  return (
    <ModalWrapper title="訂單詳情" onClose={onClose} wide>
      <div className="space-y-5">
        {/* 套餐信息 */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">套餐信息</h3>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4">
            <InfoRow label="套餐 ID" value={<span className="font-mono text-xs">{item?.sku_id}</span>} />
            <InfoRow label="套餐名稱" value={product?.name} />
            <InfoRow label="流量" value={
              product?.plan_type === '1'
                ? `${formatKB(product?.high_flow_size)}/天`
                : formatKB(product?.capacity)
            } />
            <InfoRow label="限速峰值" value={formatKbps(product?.limit_flow_speed ?? null)} />
            <InfoRow label="天數" value={product?.days ? `${product.days} 天` : '--'} />
            <InfoRow label="數量" value={item ? `${item.copies} 份 × ${item.number} 張` : '--'} />
          </div>
        </section>

        {/* 詳細規格 */}
        {product?.desc_text && (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">詳細規格</h3>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4">
              <InfoRow label="套餐描述" value={
                <span className="whitespace-pre-wrap text-xs leading-relaxed">{product.desc_text}</span>
              } />
              <InfoRow label="APN" value={product.apn} />
              <InfoRow label="熱點分享" value={product.hotspot_support === '1' ? '支持' : product.hotspot_support === '0' ? '不支持' : '--'} />
              <InfoRow label="供應商" value={product.provider} />
              <InfoRow label="限速規則" value={product.speed_limit_rule} />
            </div>
          </section>
        )}

        {/* 訂單信息 */}
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">訂單信息</h3>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4">
            <InfoRow label="分銷/店鋪訂單號" value={
              <span className="flex items-center font-mono text-xs">{order.channel_order_id}<CopyButton text={order.channel_order_id} /></span>
            } />
            <InfoRow label="亿点訂單號" value={
              order.bc_order_id
                ? <span className="flex items-center font-mono text-xs">{order.bc_order_id}<CopyButton text={order.bc_order_id} /></span>
                : '--'
            } />
            <InfoRow label="ICCID" value={
              iccids.length > 0
                ? <span className="font-mono text-xs">{iccids.join(', ')}</span>
                : '--'
            } />
            <InfoRow label="訂單金額" value={order.total_amount ? `CNY ${order.total_amount}` : '--'} />
            <InfoRow label="訂單狀態" value={ORDER_STATUS_LABEL[order.order_status] ?? order.order_status} />
            <InfoRow label="預計出行時間" value={order.estimated_use_time ? formatDate(order.estimated_use_time) : '--'} />
            <InfoRow label="訂單創建時間" value={formatDate(order.created_at)} />
            <InfoRow label="創建人" value={order.source === 'admin' ? '管理員' : order.user_email ?? order.source} />
            <InfoRow label="訂單備註" value={order.comment} />
          </div>
        </section>
      </div>
    </ModalWrapper>
  )
}

// ── CardExpiryModal ────────────────────────────────────────────────────────

function CardExpiryModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const [data, setData] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const iccids = getAllIccids(order)

  useEffect(() => {
    if (!iccids.length) { setError('此訂單無 ICCID 資料'); setLoading(false); return }
    fetch('/api/admin/orders/card-expiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ iccids }),
    }).then(r => r.json()).then(d => {
      if (d.error) setError(d.error)
      else setData(Array.isArray(d) ? d : [])
      setLoading(false)
    }).catch(e => { setError(String(e)); setLoading(false) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function exportCSV() {
    if (!data) return
    const rows = [['ICCID', '卡片有效期'], ...data.map(r => [r.iccid, r.expirationDate ?? '--'])]
    const csv = rows.map(r => r.join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a'); a.href = url; a.download = 'card_expiry.csv'; a.click()
  }

  return (
    <ModalWrapper title="查詢有效期" onClose={onClose}>
      {loading && <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-indigo-500" /></div>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && data && (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">ICCID</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">卡片有效期</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-700 dark:text-gray-300">{r.iccid}</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{r.expirationDate ?? '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 hover:bg-gray-50">
              <Download size={14} />導出
            </button>
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm">
              關閉
            </button>
          </div>
        </>
      )}
    </ModalWrapper>
  )
}

// ── AfterSaleModal ─────────────────────────────────────────────────────────

function AfterSaleModal({ order, prefillIccid, onClose, onSuccess }: {
  order: Order
  prefillIccid?: string
  onClose: () => void
  onSuccess: () => void
}) {
  const allIccids = getAllIccids(order)
  const item = order.order_items[0]
  const [selectedIccids, setSelectedIccids] = useState<string[]>(prefillIccid ? [prefillIccid] : [])
  const [reason, setReason] = useState('20')
  const [refundType, setRefundType] = useState('0')
  const [unSubscribeFlow, setUnSubscribeFlow] = useState('1')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleIccid(id: string) {
    setSelectedIccids(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  async function handleSubmit() {
    if (!selectedIccids.length) { setError('請選擇 ICCID'); return }
    if (!item?.channel_sub_order_id) { setError('找不到子訂單號，無法提交'); return }
    setSubmitting(true); setError(null)
    try {
      const res = await fetch('/api/admin/orders/after-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          channelOrderId: order.channel_order_id,
          channelSubOrderId: item.channel_sub_order_id,
          reason,
          iccid: selectedIccids,
          refundType,
          unSubscribeFlow,
          comment: comment.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      onSuccess()
    } catch (e: any) {
      setError(e.message ?? '提交失敗')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalWrapper title="申請售後" onClose={onClose}>
      <div className="space-y-4">
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
          <div>分銷/店鋪訂單號：<span className="font-mono text-gray-800 dark:text-gray-200">{order.channel_order_id}</span></div>
          <div>亿点訂單號：<span className="font-mono text-gray-800 dark:text-gray-200">{order.bc_order_id ?? '--'}</span></div>
          <div>套餐名稱：<span className="text-gray-800 dark:text-gray-200">{item?.products?.name ?? item?.sku_id ?? '--'}</span></div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
            <span className="text-red-500 mr-1">*</span>ICCIDS
          </label>
          {allIccids.length > 0 ? (
            <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 min-h-12">
              {allIccids.map(id => (
                <button key={id} type="button" onClick={() => toggleIccid(id)}
                  className={clsx('inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-colors',
                    selectedIccids.includes(id)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                  )}>
                  {id}
                  {selectedIccids.includes(id) && <X size={11} />}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">此訂單暫無 ICCID 資料（N001 尚未推送）</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
              <span className="text-red-500 mr-1">*</span>售後原因
            </label>
            <select value={reason} onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100">
              {AFTER_SALE_REASON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
              <span className="text-red-500 mr-1">*</span>退款方式
            </label>
            <select value={refundType} onChange={e => setRefundType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100">
              {REFUND_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
            是否退訂流量
          </label>
          <select value={unSubscribeFlow} onChange={e => setUnSubscribeFlow(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100">
            <option value="1">退訂流量</option>
            <option value="0">不退訂流量</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">備註</label>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
            placeholder="選填"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50">
            取消
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm disabled:opacity-50">
            {submitting && <Loader2 size={14} className="animate-spin" />}
            提交申請
          </button>
        </div>
      </div>
    </ModalWrapper>
  )
}

// ── PlanStatusModal ────────────────────────────────────────────────────────

const PLAN_TIMELINE = ['未激活', '已激活', '已結束']
const PLAN_TIMELINE_STATUS: Record<string, number> = { '0': 0, '1': 1, '2': 2, '3': 2 }
const AFTERSALE_TIMELINE = ['未售後', '待審核', '審核通過', '已退款']
const AFTERSALE_TIMELINE_STATUS: Record<string, number> = { none: 0, pending: 1, approved: 2, refunded: 3 }

function Timeline({ steps, activeIdx }: { steps: string[]; activeIdx: number }) {
  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-gray-400 w-8 text-right font-mono">- - -</span>
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

function PlanStatusModal({ order, iccid, onClose }: {
  order: Order
  iccid: string
  onClose: () => void
}) {
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const item = order.order_items[0]
  const product = item?.products

  useEffect(() => {
    const params = new URLSearchParams({ iccid, channel_order_id: order.channel_order_id })
    fetch(`/api/admin/orders/plan-status?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const bcPlan = data?.bcPlan
  const afterSaleStatus = data?.afterSaleStatus ?? 'none'
  const subPlan = bcPlan?.subOrderList?.find((s: any) => s.skuId === item?.sku_id) ?? bcPlan?.subOrderList?.[0]
  const planStatusIdx = PLAN_TIMELINE_STATUS[subPlan?.planStatus ?? '0'] ?? 0
  const afterSaleIdx = AFTERSALE_TIMELINE_STATUS[afterSaleStatus] ?? 0

  return (
    <ModalWrapper title="查看狀態" onClose={onClose}>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-indigo-500" /></div>
      ) : (
        <div className="space-y-5">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4">
            <InfoRow label="套餐名稱" value={product?.name ?? item?.sku_id} />
            <InfoRow label="APN" value={product?.apn} />
            <InfoRow label="套餐狀態" value={PLAN_STATUS_LABEL[subPlan?.planStatus ?? '0'] ?? '—'} />
            <InfoRow label="售後狀態" value={afterSaleStatus === 'none' ? '未售後' : (AFTER_SALE_LABEL[afterSaleStatus] ?? afterSaleStatus)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <section>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">套餐歷史狀態</h3>
              <Timeline steps={PLAN_TIMELINE} activeIdx={planStatusIdx} />
            </section>
            <section>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">售後歷史狀態</h3>
              <Timeline steps={AFTERSALE_TIMELINE} activeIdx={afterSaleIdx} />
            </section>
          </div>
        </div>
      )}
    </ModalWrapper>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

type ModalState =
  | { type: 'detail'; order: Order }
  | { type: 'expiry'; order: Order }
  | { type: 'aftersale'; order: Order; prefillIccid?: string }
  | { type: 'planstatus'; order: Order; iccid: string }
  | null

export default function SimOrdersPage() {
  // Filter state
  const [channelOrderId, setChannelOrderId] = useState('')
  const [bcOrderId, setBcOrderId] = useState('')
  const [iccid, setIccid] = useState('')
  const [skuName, setSkuName] = useState('')
  const [orderStatus, setOrderStatus] = useState('')
  const [planStatus, setPlanStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [afterSaleStatus, setAfterSaleStatus] = useState('')
  const [showMore, setShowMore] = useState(false)

  // Data state
  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<ModalState>(null)
  const limit = 20

  const doSearch = useCallback(async (p = 1) => {
    setLoading(true); setError(null)
    const params = new URLSearchParams({ page: String(p), limit: String(limit) })
    if (channelOrderId.trim()) params.set('channel_order_id', channelOrderId.trim())
    if (bcOrderId.trim()) params.set('bc_order_id', bcOrderId.trim())
    if (iccid.trim()) params.set('iccid', iccid.trim())
    if (skuName.trim()) params.set('sku_name', skuName.trim())
    if (orderStatus) params.set('order_status', orderStatus)
    if (planStatus) params.set('plan_status', planStatus)
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    if (afterSaleStatus) params.set('after_sale_status', afterSaleStatus)
    try {
      const res = await fetch(`/api/admin/sim-orders?${params}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setOrders(data.orders ?? [])
      setTotal(data.total ?? 0)
      setPage(p)
      setSearched(true)
    } catch (e: any) { setError(e.message ?? '查詢失敗') }
    finally { setLoading(false) }
  }, [channelOrderId, bcOrderId, iccid, skuName, orderStatus, planStatus, dateFrom, dateTo, afterSaleStatus])

  function reset() {
    setChannelOrderId(''); setBcOrderId(''); setIccid(''); setSkuName('')
    setOrderStatus(''); setPlanStatus(''); setDateFrom(''); setDateTo(''); setAfterSaleStatus('')
    setOrders([]); setTotal(0); setSearched(false)
  }

  function toggleExpand(id: string) {
    setExpandedOrders(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header breadcrumb={['SIM 卡訂單', '訂單列表']} />

      <div className="p-6 space-y-4">

        {/* Filter Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: '分銷/店鋪訂單號', val: channelOrderId, set: setChannelOrderId, ph: '請輸入' },
              { label: '亿点訂單號', val: bcOrderId, set: setBcOrderId, ph: '請輸入' },
              { label: 'ICCID', val: iccid, set: setIccid, ph: '請輸入', mono: true },
              { label: '套餐名稱', val: skuName, set: setSkuName, ph: '搜索套餐名稱或 ID' },
            ].map(f => (
              <div key={f.label}>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{f.label}</label>
                <input value={f.val} onChange={e => f.set(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doSearch(1)}
                  placeholder={f.ph}
                  className={clsx('w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500', f.mono && 'font-mono')} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            {[
              { label: '訂單狀態', val: orderStatus, set: setOrderStatus, opts: ORDER_STATUS_OPTIONS },
              { label: '套餐狀態', val: planStatus, set: setPlanStatus, opts: PLAN_STATUS_OPTIONS },
            ].map(f => (
              <div key={f.label}>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{f.label}</label>
                <select value={f.val} onChange={e => f.set(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {f.opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ))}
            <div className="lg:col-span-2">
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">訂單創建時間</label>
              <div className="flex items-center gap-2">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <span className="text-gray-400 text-sm">→</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </div>

          {/* 更多篩選 */}
          {showMore && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">售後狀態</label>
                <select value={afterSaleStatus} onChange={e => setAfterSaleStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {AFTER_SALE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <button onClick={() => setShowMore(v => !v)}
              className="flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800">
              更多篩選
              {showMore ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <div className="flex items-center gap-3">
              <button onClick={reset}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
                重置
              </button>
              <button onClick={() => doSearch(1)} disabled={loading}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                查詢
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Results */}
        {searched && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {orders.length === 0 && !loading ? (
              <div className="flex items-center justify-center py-16 text-sm text-gray-400">無符合記錄</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <th className="w-10 px-4 py-3" />
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">亿点訂單號</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">ICCID</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">數量</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">訂單金額</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">訂單狀態</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => {
                        const iccids = getAllIccids(order)
                        const expanded = expandedOrders.has(order.id)
                        const totalQty = order.order_items.reduce((s, i) => s + i.number, 0)
                        return (
                          <>
                            {/* Order row */}
                            <tr key={order.id}
                              className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                              <td className="px-4 py-3 text-center">
                                {iccids.length > 0 && (
                                  <button onClick={() => toggleExpand(order.id)}
                                    className="p-0.5 rounded text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">
                                    {expanded ? <Minus size={14} /> : <Plus size={14} />}
                                  </button>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                                  {order.bc_order_id ?? order.channel_order_id}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-400 text-xs">
                                {iccids.length ? `${iccids.length} 張` : '—'}
                              </td>
                              <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{totalQty}</td>
                              <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                {order.total_amount != null ? order.total_amount : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={clsx('inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                                  ORDER_STATUS_BADGE[order.order_status] ?? ORDER_STATUS_BADGE.pending)}>
                                  {ORDER_STATUS_LABEL[order.order_status] ?? order.order_status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
                                  <button className="hover:text-indigo-800 font-medium"
                                    onClick={() => setModal({ type: 'detail', order })}>
                                    訂單詳情
                                  </button>
                                  <span className="text-gray-300 dark:text-gray-700">|</span>
                                  <button className="hover:text-indigo-800 font-medium"
                                    onClick={() => setModal({ type: 'expiry', order })}>
                                    查詢有效期
                                  </button>
                                  <span className="text-gray-300 dark:text-gray-700">|</span>
                                  <button className="hover:text-indigo-800 font-medium"
                                    onClick={() => setModal({ type: 'aftersale', order })}>
                                    申請售後
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {/* ICCID sub-rows */}
                            {expanded && iccids.map(id => (
                              <tr key={`${order.id}-${id}`}
                                className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                                <td className="px-4 py-2" />
                                <td className="px-4 py-2" />
                                <td className="px-4 py-2 font-mono text-xs text-gray-600 dark:text-gray-400 pl-8">{id}</td>
                                <td colSpan={3} className="px-4 py-2" />
                                <td className="px-4 py-2">
                                  <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
                                    <button className="hover:text-indigo-800 font-medium"
                                      onClick={() => setModal({ type: 'planstatus', order, iccid: id })}>
                                      查看狀態
                                    </button>
                                    <span className="text-gray-300 dark:text-gray-700">|</span>
                                    <button className="hover:text-indigo-800 font-medium"
                                      onClick={() => setModal({ type: 'aftersale', order, prefillIccid: id })}>
                                      申請售後
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-500 dark:text-gray-400">第 {page} / {totalPages} 頁，共 {total} 筆</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => doSearch(page - 1)} disabled={page <= 1 || loading}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50">
                        上一頁
                      </button>
                      <button onClick={() => doSearch(page + 1)} disabled={page >= totalPages || loading}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 disabled:opacity-40 hover:bg-gray-50">
                        下一頁
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {!searched && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600">
            <Search size={36} className="mb-3 opacity-40" />
            <p className="text-sm">設置篩選條件後點擊查詢</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal?.type === 'detail' && <OrderDetailModal order={modal.order} onClose={() => setModal(null)} />}
      {modal?.type === 'expiry' && <CardExpiryModal order={modal.order} onClose={() => setModal(null)} />}
      {modal?.type === 'aftersale' && (
        <AfterSaleModal
          order={modal.order}
          prefillIccid={modal.prefillIccid}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); doSearch(page) }}
        />
      )}
      {modal?.type === 'planstatus' && (
        <PlanStatusModal
          order={modal.order}
          iccid={modal.iccid}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
