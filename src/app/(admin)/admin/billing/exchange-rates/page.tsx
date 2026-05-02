'use client'

import { useEffect, useState, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { useLanguage } from '@/components/language-provider'
import { Plus, Trash2, RefreshCw, ArrowRight, Loader2, CheckCircle } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────

interface Transaction {
  id: string
  date: string
  description: string
  type: string
  from_currency: string | null
  from_amount: number | null
  from_fee: number | null
  to_currency: string | null
  to_amount: number | null
  notes: string
  // computed
  rate: number | null
  running_balances: Record<string, number>
}

interface PageData {
  transactions: Transaction[]
  balances: Record<string, number>
  avgRates: Record<string, Record<string, number>>
}

// ── Constants ─────────────────────────────────────────────────────────

const CURRENCIES = ['TWD', 'USD', 'HKD', 'CNY']

const CCY_META: Record<string, { flag: string; name: Record<string, string>; bg: string; text: string; border: string }> = {
  TWD: { flag: '🇹🇼', name: { 'zh-TW': '新台幣', 'zh-CN': '新台币', en: 'TWD', ja: '台湾ドル', ko: '대만 달러' },
    bg: 'bg-sky-50 dark:bg-sky-900/10', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-800' },
  USD: { flag: '🇺🇸', name: { 'zh-TW': '美元', 'zh-CN': '美元', en: 'USD', ja: '米ドル', ko: '미국 달러' },
    bg: 'bg-emerald-50 dark:bg-emerald-900/10', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  HKD: { flag: '🇭🇰', name: { 'zh-TW': '港幣', 'zh-CN': '港币', en: 'HKD', ja: '香港ドル', ko: '홍콩 달러' },
    bg: 'bg-orange-50 dark:bg-orange-900/10', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
  CNY: { flag: '🇨🇳', name: { 'zh-TW': '人民幣', 'zh-CN': '人民币', en: 'CNY', ja: '人民元', ko: '중국 위안' },
    bg: 'bg-amber-50 dark:bg-amber-900/10', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
}

const TX_TYPES = ['initial', 'exchange', 'settlement', 'other'] as const
type TxType = typeof TX_TYPES[number]

const TYPE_KEY: Record<TxType, string> = {
  initial: 'fx.typeInitial', exchange: 'fx.typeExchange',
  settlement: 'fx.typeSettlement', other: 'fx.typeOther',
}
const TYPE_COLOR: Record<TxType, string> = {
  initial:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  exchange:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  settlement: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  other:      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

function fmt(n: number | null | undefined, d = 4) {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })
}
function fmtRate(n: number | null | undefined) { return fmt(n, 6) }

// ── Add Modal ────────────────────────────────────────────────────────

interface FormState {
  date: string; type: TxType; description: string
  from_currency: string; from_amount: string; from_fee: string
  to_currency: string;   to_amount: string
  notes: string
}

function AddModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = useLanguage()
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState<FormState>({
    date: today, type: 'exchange', description: '',
    from_currency: 'TWD', from_amount: '', from_fee: '',
    to_currency: 'CNY',   to_amount: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(p => ({ ...p, [k]: v }))
  }

  const rate = useMemo(() => {
    const fa = parseFloat(form.from_amount) || 0
    const fee = parseFloat(form.from_fee) || 0
    const ta = parseFloat(form.to_amount)
    const total = fa + fee
    if (total > 0 && ta > 0) return ta / total
    return null
  }, [form.from_amount, form.from_fee, form.to_amount])

  const isExchange   = form.type === 'exchange'
  const isInitial    = form.type === 'initial'
  const isSettlement = form.type === 'settlement'

  async function save() {
    setSaving(true)
    const body = {
      date: form.date,
      description: form.description,
      type: form.type,
      from_currency: (isExchange || isSettlement) && form.from_currency ? form.from_currency : null,
      from_amount:   (isExchange || isSettlement) && form.from_amount   ? parseFloat(form.from_amount) : null,
      from_fee:      isExchange && form.from_fee ? parseFloat(form.from_fee) : 0,
      to_currency:   (isExchange || isInitial)    && form.to_currency   ? form.to_currency   : null,
      to_amount:     (isExchange || isInitial)    && form.to_amount     ? parseFloat(form.to_amount)   : null,
      notes: form.notes,
    }
    await fetch('/api/admin/exchange-rates/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    onSaved()
  }

  const canSave = form.date && (
    (isExchange   && form.from_currency && form.from_amount && form.to_currency && form.to_amount) ||
    (isInitial    && form.to_currency   && form.to_amount) ||
    (isSettlement && form.from_currency && form.from_amount) ||
    form.type === 'other'
  )

  const inp = 'w-full h-9 px-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
  const lbl = 'text-xs text-gray-500 dark:text-gray-400 mb-1 block'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{t('fx.addTx')}</h2>

        {/* Date + Type */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>{t('fx.date')}</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>{t('fx.txDesc')}</label>
            <select value={form.type} onChange={e => set('type', e.target.value as TxType)} className={inp}>
              {TX_TYPES.map(tp => <option key={tp} value={tp}>{t(TYPE_KEY[tp])}</option>)}
            </select>
          </div>
        </div>

        {/* Exchange: from → to */}
        {isExchange && (
          <div className="flex items-end gap-2">
            {/* From */}
            <div className="flex-1 space-y-2">
              <div>
                <label className={lbl}>匯出幣別</label>
                <select value={form.from_currency} onChange={e => set('from_currency', e.target.value)} className={inp}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{CCY_META[c].flag} {c}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>匯出金額</label>
                <input type="number" step="0.0001" value={form.from_amount}
                  onChange={e => set('from_amount', e.target.value)} placeholder="0.0000" className={inp} />
              </div>
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center pb-1.5 px-1">
              <ArrowRight size={18} className="text-gray-400 mt-6" />
            </div>

            {/* To */}
            <div className="flex-1 space-y-2">
              <div>
                <label className={lbl}>到帳幣別</label>
                <select value={form.to_currency} onChange={e => set('to_currency', e.target.value)} className={inp}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{CCY_META[c].flag} {c}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>到帳金額</label>
                <input type="number" step="0.0001" value={form.to_amount}
                  onChange={e => set('to_amount', e.target.value)} placeholder="0.0000" className={inp} />
              </div>
            </div>
          </div>
        )}

        {/* Initial: to only */}
        {isInitial && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>到帳幣別</label>
              <select value={form.to_currency} onChange={e => set('to_currency', e.target.value)} className={inp}>
                {CURRENCIES.map(c => <option key={c} value={c}>{CCY_META[c].flag} {c}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>到帳金額</label>
              <input type="number" step="0.0001" value={form.to_amount}
                onChange={e => set('to_amount', e.target.value)} placeholder="0.0000" className={inp} />
            </div>
          </div>
        )}

        {/* Settlement: from only */}
        {isSettlement && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>扣款幣別</label>
              <select value={form.from_currency} onChange={e => set('from_currency', e.target.value)} className={inp}>
                {CURRENCIES.map(c => <option key={c} value={c}>{CCY_META[c].flag} {c}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>扣款金額</label>
              <input type="number" step="0.0001" value={form.from_amount}
                onChange={e => set('from_amount', e.target.value)} placeholder="0.0000" className={inp} />
            </div>
          </div>
        )}

        {/* Fee + Final Rate */}
        {isExchange && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>匯出手續費（{form.from_currency}）</label>
              <input
                type="number" step="0.0001" value={form.from_fee}
                onChange={e => set('from_fee', e.target.value)}
                placeholder="0.0000" className={inp}
              />
            </div>
            <div>
              <label className={lbl}>最終匯率（含手續費，自動推導）</label>
              <div className={`${inp} flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 cursor-default select-none border-dashed`}>
                {rate != null ? (
                  <>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{fmtRate(rate)}</span>
                    <span className="text-xs text-gray-400">
                      1 {form.from_currency} = {fmtRate(rate)} {form.to_currency}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-400 text-xs">填入金額後自動計算</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Notes — full width */}
        <div>
          <label className={lbl}>{t('fx.notes')}</label>
          <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="..." className={inp} />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            {t('btn.close')}
          </button>
          <button
            onClick={save} disabled={saving || !canSave}
            className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg"
          >
            {saving ? '儲存中...' : t('btn.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Trading Rate Row ──────────────────────────────────────────────────

interface TradingRate { currency: string; rate: number; updated_at: string; updated_by: string }

type RateSaveState = 'idle' | 'saving' | 'saved'

function TradingRates() {
  const [rates, setRates] = useState<TradingRate[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [states, setStates] = useState<Record<string, RateSaveState>>({})

  useEffect(() => {
    fetch('/api/admin/exchange-rates').then(r => r.json()).then(d => {
      const rows: TradingRate[] = d.rates ?? []
      setRates(rows)
      const init: Record<string, string> = {}
      for (const r of rows) init[r.currency] = String(r.rate)
      setDrafts(init)
    })
  }, [])

  async function save(currency: string) {
    const val = parseFloat(drafts[currency])
    if (isNaN(val) || val <= 0) return
    setStates(p => ({ ...p, [currency]: 'saving' }))
    await fetch('/api/admin/exchange-rates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currency, rate: val }),
    })
    setRates(prev => prev.map(r => r.currency === currency ? { ...r, rate: val, updated_at: new Date().toISOString() } : r))
    setStates(p => ({ ...p, [currency]: 'saved' }))
    setTimeout(() => setStates(p => ({ ...p, [currency]: 'idle' })), 2000)
  }

  const tradingCurrencies = ['CNY', 'USD', 'HKD']

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">交易匯率</span>
          <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">以台幣（TWD）為基準，人工設定 — 用於商品定價換算，避免價格頻繁浮動</span>
        </div>
        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
          🇹🇼 TWD 基準
        </span>
      </div>
      {/* Rate rows */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
        {tradingCurrencies.map(code => {
          const meta = CCY_META[code]
          const draft = drafts[code] ?? ''
          const rate = parseFloat(draft)
          const inverse = rate > 0 ? 1 / rate : null
          const state = states[code] ?? 'idle'
          const row = rates.find(r => r.currency === code)

          return (
            <div key={code} className="flex items-center gap-4 px-5 py-3">
              {/* Currency label */}
              <div className="w-32 flex items-center gap-2 shrink-0">
                <span className="text-lg">{meta.flag}</span>
                <div>
                  <span className={`font-semibold text-sm ${meta.text}`}>{code}</span>
                  <div className="text-xs text-gray-400">{meta.name['zh-TW']}</div>
                </div>
              </div>

              {/* Rate input */}
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm text-gray-500 shrink-0">1 TWD =</span>
                <input
                  type="number" step="0.000001" value={draft}
                  onChange={e => setDrafts(p => ({ ...p, [code]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && save(code)}
                  className="w-36 h-9 px-3 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span className="text-sm text-gray-500 shrink-0">{code}</span>
              </div>

              {/* Inverse reference */}
              {inverse != null && (
                <div className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                  → 1 {code} = <span className="font-mono text-gray-600 dark:text-gray-300">{fmt(inverse, 4)}</span> TWD
                </div>
              )}

              {/* Save button */}
              <button
                onClick={() => save(code)}
                disabled={state === 'saving' || isNaN(rate) || rate <= 0}
                className="shrink-0 flex items-center gap-1.5 px-3 h-9 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg"
              >
                {state === 'saving' && <Loader2 size={13} className="animate-spin" />}
                {state === 'saved'  && <CheckCircle size={13} />}
                {state === 'saved' ? '已儲存' : '儲存'}
              </button>

              {/* Last updated */}
              {row?.updated_at && (
                <div className="text-xs text-gray-400 dark:text-gray-500 shrink-0 hidden xl:block">
                  {new Date(row.updated_at).toLocaleString()}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────

export default function ExchangeRatesPage() {
  const { t, lang } = useLanguage()
  const [data, setData] = useState<PageData>({ transactions: [], balances: {}, avgRates: {} })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  async function fetchData() {
    setLoading(true)
    const res = await fetch('/api/admin/exchange-rates/transactions').then(r => r.json())
    setData({
      transactions: res.transactions ?? [],
      balances: res.balances ?? {},
      avgRates: res.avgRates ?? {},
    })
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function deleteTx(id: string) {
    if (!confirm(t('fx.confirmDelete'))) return
    await fetch(`/api/admin/exchange-rates/transactions/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const thCls = 'px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase whitespace-nowrap'
  const tdCls = 'px-3 py-2.5 text-sm whitespace-nowrap'

  return (
    <>
      <Header breadcrumb={[t('nav.billing'), t('nav.exchangeRates')]} />
      <div className="p-6 space-y-6">

        {/* ── Trading Rates (top) ── */}
        <TradingRates />

        {/* ── Balance Cards ── */}
        <div className="grid grid-cols-4 gap-4">
          {CURRENCIES.map(code => {
            const meta = CCY_META[code]
            const bal = data.balances[code] ?? 0
            // Best avg rate for this currency: look for pairs involving it
            const rateLabel = (() => {
              const rates = data.avgRates
              // prefer showing against CNY if not CNY itself
              if (code !== 'CNY' && rates[code]?.['CNY']) {
                return `1 ${code} ≈ ${fmtRate(rates[code]['CNY'])} CNY`
              }
              if (code === 'CNY' && rates['TWD']?.['CNY']) {
                return `1 TWD ≈ ${fmtRate(rates['TWD']['CNY'])} CNY`
              }
              return null
            })()

            return (
              <div key={code} className={`${meta.bg} border ${meta.border} rounded-xl p-4`}>
                <div className={`text-xs font-medium mb-1 ${meta.text}`}>
                  {meta.flag} {code} — {meta.name[lang] ?? meta.name['zh-TW']}
                </div>
                <div className={`text-2xl font-bold font-mono ${meta.text}`}>
                  {loading ? '...' : fmt(bal, 2)}
                </div>
                {rateLabel && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">{rateLabel}</div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Avg Rate Summary ── */}
        {Object.keys(data.avgRates).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.avgRates).flatMap(([fc, tcs]) =>
              Object.entries(tcs).map(([tc, rate]) => (
                <div key={`${fc}-${tc}`} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{CCY_META[fc]?.flag} {fc}</span>
                  <ArrowRight size={11} className="text-gray-400" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">{CCY_META[tc]?.flag} {tc}</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 ml-1">{fmtRate(rate)}</span>
                  <span className="text-gray-400">{t('fx.avgRate')}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Ledger Table ── */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('fx.ledger')}</span>
            <div className="flex items-center gap-2">
              <button onClick={fetchData} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <RefreshCw size={14} />
              </button>
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
                <Plus size={14} />{t('fx.addTx')}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className={thCls}>{t('fx.date')}</th>
                  <th className={thCls}>類型／說明</th>
                  <th className={thCls + ' text-right'}>匯出幣別</th>
                  <th className={thCls + ' text-right'}>匯出金額</th>
                  <th className={thCls + ' text-right'}>手續費</th>
                  <th className={thCls + ' text-center'}>最終匯率</th>
                  <th className={thCls + ' text-right'}>到帳幣別</th>
                  <th className={thCls + ' text-right'}>到帳金額</th>
                  {/* Running balances */}
                  {CURRENCIES.map(c => (
                    <th key={c} className={thCls + ' text-right'}>{CCY_META[c].flag} {c}</th>
                  ))}
                  <th className={thCls}>{t('fx.notes')}</th>
                  <th className={thCls}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {loading ? (
                  <tr><td colSpan={13 + CURRENCIES.length} className="px-4 py-8 text-center text-sm text-gray-400">{t('common.loading')}</td></tr>
                ) : data.transactions.length === 0 ? (
                  <tr><td colSpan={13 + CURRENCIES.length} className="px-4 py-8 text-center text-sm text-gray-400">{t('fx.noData')}</td></tr>
                ) : data.transactions.map(tx => {
                  const typeCls = TYPE_COLOR[tx.type as TxType] ?? TYPE_COLOR.other
                  const fcMeta = tx.from_currency ? CCY_META[tx.from_currency] : null
                  const tcMeta = tx.to_currency   ? CCY_META[tx.to_currency]   : null
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className={tdCls + ' text-gray-600 dark:text-gray-400'}>{tx.date}</td>
                      <td className={tdCls}>
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block px-1.5 py-0.5 text-xs rounded ${typeCls}`}>
                            {t(TYPE_KEY[tx.type as TxType] ?? 'fx.typeOther')}
                          </span>
                          {tx.description && <span className="text-gray-500 dark:text-gray-400 text-xs">{tx.description}</span>}
                        </div>
                      </td>
                      <td className={tdCls + ' text-right'}>
                        {fcMeta && <span className={`font-medium ${fcMeta.text}`}>{fcMeta.flag} {tx.from_currency}</span>}
                      </td>
                      <td className={tdCls + ' text-right font-mono text-red-500 dark:text-red-400'}>
                        {tx.from_amount != null ? `−${fmt(tx.from_amount, 4)}` : ''}
                      </td>
                      <td className={tdCls + ' text-right font-mono text-orange-500 dark:text-orange-400'}>
                        {tx.from_fee ? `−${fmt(tx.from_fee, 4)}` : ''}
                      </td>
                      <td className={tdCls + ' text-center'}>
                        {tx.rate != null && (
                          <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">
                            {fmtRate(tx.rate)}
                          </span>
                        )}
                      </td>
                      <td className={tdCls + ' text-right'}>
                        {tcMeta && <span className={`font-medium ${tcMeta.text}`}>{tcMeta.flag} {tx.to_currency}</span>}
                      </td>
                      <td className={tdCls + ' text-right font-mono text-green-600 dark:text-green-400'}>
                        {tx.to_amount != null ? `+${fmt(tx.to_amount, 4)}` : ''}
                      </td>
                      {/* Running balances per currency */}
                      {CURRENCIES.map(c => (
                        <td key={c} className={tdCls + ' text-right font-mono text-xs text-gray-500 dark:text-gray-400'}>
                          {fmt(tx.running_balances[c] ?? 0, 2)}
                        </td>
                      ))}
                      <td className={tdCls + ' text-gray-400 dark:text-gray-500 max-w-[100px] truncate text-xs'}>{tx.notes}</td>
                      <td className={tdCls}>
                        <button onClick={() => deleteTx(tx.id)}
                          className="p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 rounded">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <AddModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); fetchData() }} />
      )}
    </>
  )
}
