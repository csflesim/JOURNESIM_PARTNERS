'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Plus, Trash2, KeyRound, Wallet, Copy, Check, RefreshCw, X } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────

type AccountType        = 'travel_agent' | 'company'
type VerificationStatus = 'pending' | 'reviewing' | 'approved' | 'rejected'
type AccountStatus      = 'active' | 'suspended' | 'cancelled'

interface ApiKey {
  app_key: string
  app_secret: string
  created_at: string
}

interface Verification {
  agent_id?: string
  // 旅行從業人員
  tv_name?: string
  tv_gender?: string
  tv_id_card_front_url?: string
  tv_license_url?: string
  // 公司
  co_company_name?: string
  co_tax_id?: string
  co_address?: string
  co_website?: string
  co_owner_name?: string
  co_owner_title?: string
  co_owner_id_number?: string
  co_contact_name?: string
  co_contact_title?: string
  co_contact_department?: string
  co_contact_position?: string
  co_contact_phone?: string
  co_business_license_url?: string
  co_travel_permit_url?: string
}

interface Agent {
  id: string
  avatar_url: string | null
  nickname: string
  phone: string
  email: string
  account_type: AccountType
  verification_status: VerificationStatus
  account_status: AccountStatus
  referrer_id: string | null
  referrer: { id: string; nickname: string } | null
  balance: number
  note: string
  created_at: string
  // Supabase 巢狀查詢回傳陣列，取 [0] 正規化
  agent_api_keys: ApiKey | ApiKey[] | null
  agent_verifications: Verification | Verification[] | null
}

// Supabase join 可能回傳陣列，取第一筆
function oneKey(v: Agent['agent_api_keys']): ApiKey | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}
function oneVerif(v: Agent['agent_verifications']): Verification | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

interface TopupLog {
  id: string
  amount: number
  note: string
  operated_by: string
  created_at: string
}

type Tab = 'basic' | 'verification' | 'apikey' | 'topup'

// ── Constants ─────────────────────────────────────────────────────────

const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = { travel_agent: '旅行從業人員', company: '公司' }
const ACCOUNT_TYPE_COLOR: Record<AccountType, string> = {
  travel_agent: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  company:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}
const VSTATUS_LABEL: Record<VerificationStatus, string> = {
  pending: '未審核', reviewing: '審核中', approved: '審核通過', rejected: '審核拒絕',
}
const VSTATUS_COLOR: Record<VerificationStatus, string> = {
  pending:   'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  reviewing: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected:  'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
}
const ASTATUS_LABEL: Record<AccountStatus, string> = { active: '正常', suspended: '停用', cancelled: '註銷' }
const ASTATUS_COLOR: Record<AccountStatus, string> = {
  active:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  suspended: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
}

// ── Helpers ───────────────────────────────────────────────────────────

const inp  = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 h-9 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400'
const btn  = 'px-3 h-9 rounded-lg text-sm font-medium transition-colors'
const label = 'block text-xs text-gray-500 dark:text-gray-400 mb-1'

function fmt(d: string) { return new Date(d).toLocaleDateString('zh-TW') }
function fmtBal(n: number) { return Number(n).toLocaleString('zh-TW', { minimumFractionDigits: 2 }) }

function Badge({ text, color }: { text: string; color: string }) {
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{text}</span>
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600">
      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
    </button>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | AccountType>('all')
  const [vstFilter,  setVstFilter]  = useState<'all' | VerificationStatus>('all')
  const [astFilter,  setAstFilter]  = useState<'all' | AccountStatus>('all')

  const [selected,    setSelected]    = useState<Agent | null>(null)
  const [tab,         setTab]         = useState<Tab>('basic')
  const [showAddModal, setShowAddModal] = useState(false)

  async function load() {
    setLoading(true)
    const r = await fetch('/api/admin/agents')
    const d = await r.json()
    setAgents(d.agents ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const filtered = agents.filter(a => {
    if (typeFilter !== 'all' && a.account_type !== typeFilter) return false
    if (vstFilter  !== 'all' && a.verification_status !== vstFilter) return false
    if (astFilter  !== 'all' && a.account_status !== astFilter) return false
    const q = search.toLowerCase()
    return !q || a.nickname.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
  })

  function openEdit(a: Agent) { setSelected({ ...a }); setTab('basic') }
  function closePanel() { setSelected(null) }

  async function deleteAgent(a: Agent, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`確認刪除「${a.nickname}」？`)) return
    await fetch(`/api/admin/agents/${a.id}`, { method: 'DELETE' })
    if (selected?.id === a.id) setSelected(null)
    await load()
  }

  // ─────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <Header breadcrumb={['帳號管理', '代理商管理']} />

      {/* ── Add Modal ── */}
      {showAddModal && (
        <AddModal
          agents={agents}
          onClose={() => setShowAddModal(false)}
          onSaved={async () => { await load(); setShowAddModal(false) }}
        />
      )}

      <div className="flex flex-1 overflow-hidden">

        {/* ── List ── */}
        <div className={`flex flex-col overflow-hidden transition-all duration-200 ${selected ? 'w-[52%] border-r border-gray-200 dark:border-gray-700' : 'flex-1'}`}>
          <div className="flex-1 overflow-auto p-6">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <input
                className={`${inp} w-64`}
                placeholder="搜尋暱稱 / Email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <div className="flex flex-wrap gap-2 text-xs">
                <FilterTabs label="類型" value={typeFilter} onChange={setTypeFilter as (v: string) => void}
                  options={[['all','全部'],['travel_agent','旅行從業人員'],['company','公司']]} />
                <FilterTabs label="審核" value={vstFilter} onChange={setVstFilter as (v: string) => void}
                  options={[['all','全部'],['pending','未審核'],['reviewing','審核中'],['approved','通過'],['rejected','拒絕']]} />
                <FilterTabs label="帳戶" value={astFilter} onChange={setAstFilter as (v: string) => void}
                  options={[['all','全部'],['active','正常'],['suspended','停用'],['cancelled','註銷']]} />
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className={`${btn} bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 ml-auto`}
              >
                <Plus size={14} /> 新增代理商
              </button>
            </div>

            {/* Table */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">代理商</th>
                    {!selected && <th className="px-4 py-3 text-left">電話</th>}
                    <th className="px-4 py-3 text-left">類型</th>
                    <th className="px-4 py-3 text-left">審核</th>
                    <th className="px-4 py-3 text-left">帳戶</th>
                    <th className="px-4 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700/50">
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">載入中…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">暫無資料</td></tr>
                  ) : filtered.map(a => (
                    <tr key={a.id}
                      onClick={() => openEdit(a)}
                      className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40 ${selected?.id === a.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar url={a.avatar_url} name={a.nickname} size={28} />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{a.nickname}</div>
                            <div className="text-xs text-gray-400">{a.email}</div>
                          </div>
                        </div>
                      </td>
                      {!selected && <td className="px-4 py-3 text-gray-500">{a.phone || '—'}</td>}
                      <td className="px-4 py-3"><Badge text={ACCOUNT_TYPE_LABEL[a.account_type]} color={ACCOUNT_TYPE_COLOR[a.account_type]} /></td>
                      <td className="px-4 py-3"><Badge text={VSTATUS_LABEL[a.verification_status]} color={VSTATUS_COLOR[a.verification_status]} /></td>
                      <td className="px-4 py-3"><Badge text={ASTATUS_LABEL[a.account_status]} color={ASTATUS_COLOR[a.account_status]} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-0.5" onClick={e => e.stopPropagation()}>
                          <button onClick={() => { openEdit(a); setTab('topup') }} title="預存款" className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-600"><Wallet size={14} /></button>
                          <button onClick={() => { openEdit(a); setTab('apikey') }} title="API 憑證" className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-indigo-600"><KeyRound size={14} /></button>
                          <button onClick={e => deleteAgent(a, e)} title="刪除" className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Detail Panel (edit only) ── */}
        {selected && (
          <DetailPanel
            agent={selected}
            tab={tab}
            setTab={setTab}
            agents={agents}
            onClose={closePanel}
            onSaved={async (updated) => { await load(); setSelected(updated) }}
          />
        )}
      </div>
    </div>
  )
}

// ── Filter Tabs ───────────────────────────────────────────────────────

function FilterTabs({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: [string, string][]
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-gray-400 mr-1">{label}：</span>
      {options.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)}
          className={`px-2 py-0.5 rounded-full transition-colors ${value === v ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
        >{l}</button>
      ))}
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────

function Avatar({ url, name, size = 32 }: { url: string | null; name: string; size?: number }) {
  const s = { width: size, height: size }
  if (url) return <img src={url} alt={name} style={s} className="rounded-full object-cover shrink-0" />
  const initials = name.slice(0, 1).toUpperCase()
  return (
    <div style={s} className="rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
      {initials}
    </div>
  )
}

// ── Add Modal ─────────────────────────────────────────────────────────

function AddModal({ agents, onClose, onSaved }: {
  agents: Agent[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [modalTab, setModalTab] = useState<'basic' | 'verification'>('basic')
  const [form, setForm] = useState({
    avatar_url: '', nickname: '', phone: '', email: '',
    password: '', account_type: 'travel_agent' as AccountType,
    verification_status: 'pending' as VerificationStatus,
    account_status: 'active' as AccountStatus,
    referrer_id: '', note: '',
  })
  const [verif, setVerif] = useState<Verification>({
    tv_name: '', tv_gender: '', tv_id_card_front_url: '', tv_license_url: '',
    co_company_name: '', co_tax_id: '', co_address: '', co_website: '',
    co_owner_name: '', co_owner_title: '', co_owner_id_number: '',
    co_contact_name: '', co_contact_title: '', co_contact_department: '',
    co_contact_position: '', co_contact_phone: '',
    co_business_license_url: '', co_travel_permit_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function setF(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })) }
  function setV(k: keyof Verification, v: string) { setVerif(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.nickname || !form.email) { setError('暱稱和 Email 為必填'); return }
    setSaving(true); setError('')
    const r = await fetch('/api/admin/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        avatar_url:  form.avatar_url  || null,
        referrer_id: form.referrer_id || null,
        password_hash: form.password  || '',
        verification: verif,
      }),
    })
    const d = await r.json()
    if (!r.ok) { setError(d.error ?? '儲存失敗'); setSaving(false); return }
    // also save verification
    if (d.agent?.id) {
      await fetch(`/api/admin/agents/${d.agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verification: verif }),
      })
    }
    await onSaved()
    setSaving(false)
  }

  const isTraveler = form.account_type === 'travel_agent'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">新增代理商</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X size={16} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6 shrink-0">
          {(['basic', 'verification'] as const).map(t => (
            <button key={t} onClick={() => setModalTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                modalTab === t
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >{{ basic: '基本資料', verification: '認證資料' }[t]}</button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {modalTab === 'basic' && (
            <div className="space-y-3">
              <div>
                <label className={label}>頭像網址</label>
                <input className={inp} placeholder="https://…" value={form.avatar_url} onChange={e => setF('avatar_url', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>暱稱 <span className="text-red-500">*</span></label>
                  <input className={inp} value={form.nickname} onChange={e => setF('nickname', e.target.value)} />
                </div>
                <div>
                  <label className={label}>行動電話</label>
                  <input className={inp} value={form.phone} onChange={e => setF('phone', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>電子信箱 <span className="text-red-500">*</span></label>
                  <input className={inp} type="email" value={form.email} onChange={e => setF('email', e.target.value)} />
                </div>
                <div>
                  <label className={label}>密碼</label>
                  <input className={inp} type="password" placeholder="••••••••" value={form.password} onChange={e => setF('password', e.target.value)} />
                </div>
              </div>
              <div>
                <label className={label}>帳戶類型</label>
                <select className={inp} value={form.account_type} onChange={e => setF('account_type', e.target.value)}>
                  <option value="travel_agent">旅行從業人員</option>
                  <option value="company">公司</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={label}>審核狀態</label>
                  <select className={inp} value={form.verification_status} onChange={e => setF('verification_status', e.target.value)}>
                    <option value="pending">未審核</option>
                    <option value="reviewing">審核中</option>
                    <option value="approved">審核通過</option>
                    <option value="rejected">審核拒絕</option>
                  </select>
                </div>
                <div>
                  <label className={label}>帳戶狀態</label>
                  <select className={inp} value={form.account_status} onChange={e => setF('account_status', e.target.value)}>
                    <option value="active">正常</option>
                    <option value="suspended">停用</option>
                    <option value="cancelled">註銷</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={label}>推薦人</label>
                <select className={inp} value={form.referrer_id} onChange={e => setF('referrer_id', e.target.value)}>
                  <option value="">— 無 —</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.nickname} ({a.email})</option>)}
                </select>
              </div>
              <div>
                <label className={label}>備註</label>
                <textarea className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" rows={2} value={form.note} onChange={e => setF('note', e.target.value)} />
              </div>
            </div>
          )}

          {modalTab === 'verification' && (
            <div className="space-y-4">
              {isTraveler ? (
                <>
                  <SectionTitle>旅行從業人員認證</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={label}>姓名</label>
                      <input className={inp} value={verif.tv_name ?? ''} onChange={e => setV('tv_name', e.target.value)} />
                    </div>
                    <div>
                      <label className={label}>性別</label>
                      <select className={inp} value={verif.tv_gender ?? ''} onChange={e => setV('tv_gender', e.target.value)}>
                        <option value="">— 請選擇 —</option>
                        <option value="male">男</option>
                        <option value="female">女</option>
                        <option value="other">其他</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={label}>身分證正面（圖片網址）</label>
                    <input className={inp} placeholder="https://…" value={verif.tv_id_card_front_url ?? ''} onChange={e => setV('tv_id_card_front_url', e.target.value)} />
                  </div>
                  <div>
                    <label className={label}>旅行從業人員執照（圖片網址）</label>
                    <input className={inp} placeholder="https://…" value={verif.tv_license_url ?? ''} onChange={e => setV('tv_license_url', e.target.value)} />
                  </div>
                </>
              ) : (
                <>
                  <SectionTitle>公司認證</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={label}>公司名稱</label>
                      <input className={inp} value={verif.co_company_name ?? ''} onChange={e => setV('co_company_name', e.target.value)} />
                    </div>
                    <div>
                      <label className={label}>統一編號</label>
                      <input className={inp} value={verif.co_tax_id ?? ''} onChange={e => setV('co_tax_id', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className={label}>公司地址</label>
                    <input className={inp} value={verif.co_address ?? ''} onChange={e => setV('co_address', e.target.value)} />
                  </div>
                  <div>
                    <label className={label}>公司網址</label>
                    <input className={inp} placeholder="https://…" value={verif.co_website ?? ''} onChange={e => setV('co_website', e.target.value)} />
                  </div>
                  <SectionTitle>負責人資料</SectionTitle>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={label}>負責人姓名</label>
                      <input className={inp} value={verif.co_owner_name ?? ''} onChange={e => setV('co_owner_name', e.target.value)} />
                    </div>
                    <div>
                      <label className={label}>稱謂</label>
                      <input className={inp} placeholder="先生/小姐" value={verif.co_owner_title ?? ''} onChange={e => setV('co_owner_title', e.target.value)} />
                    </div>
                    <div>
                      <label className={label}>身份證號</label>
                      <input className={inp} value={verif.co_owner_id_number ?? ''} onChange={e => setV('co_owner_id_number', e.target.value)} />
                    </div>
                  </div>
                  <SectionTitle>聯繫人資料</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={label}>聯繫人姓名</label>
                      <input className={inp} value={verif.co_contact_name ?? ''} onChange={e => setV('co_contact_name', e.target.value)} />
                    </div>
                    <div>
                      <label className={label}>稱謂</label>
                      <input className={inp} placeholder="先生/小姐" value={verif.co_contact_title ?? ''} onChange={e => setV('co_contact_title', e.target.value)} />
                    </div>
                    <div>
                      <label className={label}>部門</label>
                      <input className={inp} value={verif.co_contact_department ?? ''} onChange={e => setV('co_contact_department', e.target.value)} />
                    </div>
                    <div>
                      <label className={label}>職稱</label>
                      <input className={inp} value={verif.co_contact_position ?? ''} onChange={e => setV('co_contact_position', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className={label}>聯繫人電話</label>
                    <input className={inp} value={verif.co_contact_phone ?? ''} onChange={e => setV('co_contact_phone', e.target.value)} />
                  </div>
                  <SectionTitle>證照文件（圖片網址）</SectionTitle>
                  <div>
                    <label className={label}>營業執照</label>
                    <input className={inp} placeholder="https://…" value={verif.co_business_license_url ?? ''} onChange={e => setV('co_business_license_url', e.target.value)} />
                  </div>
                  <div>
                    <label className={label}>旅行業許可證</label>
                    <input className={inp} placeholder="https://…" value={verif.co_travel_permit_url ?? ''} onChange={e => setV('co_travel_permit_url', e.target.value)} />
                  </div>
                </>
              )}
              <p className="text-xs text-gray-400">帳戶類型在「基本資料」設定，此表單會自動對應</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {error && <p className="px-6 pb-2 text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button onClick={onClose} className={`${btn} border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700`}>取消</button>
          <button onClick={save} disabled={saving} className={`${btn} bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50`}>
            {saving ? '建立中…' : '建立代理商'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Detail Panel ──────────────────────────────────────────────────────

function DetailPanel({
  agent, tab, setTab, agents, onClose, onSaved,
}: {
  agent: Agent
  tab: Tab
  setTab: (t: Tab) => void
  agents: Agent[]
  onClose: () => void
  onSaved: (updated: Agent) => Promise<void>
}) {
  const TABS: { key: Tab; label: string }[] = [
    { key: 'basic',        label: '基本資料' },
    { key: 'verification', label: '認證資料' },
    { key: 'apikey',       label: 'API 憑證' },
    { key: 'topup',        label: '預存款' },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Avatar url={agent.avatar_url} name={agent.nickname || '?'} size={36} />
          <div>
            <div className="font-semibold text-gray-900 dark:text-gray-100">{agent.nickname}</div>
            <div className="text-xs text-gray-400">{agent.email}</div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X size={16} /></button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 px-5">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-5">
        {tab === 'basic'        && <BasicTab        agent={agent} agents={agents} onSaved={onSaved} />}
        {tab === 'verification' && <VerificationTab agent={agent} isNew={false} onSaved={onSaved} />}
        {tab === 'apikey'       && <ApiKeyTab        agent={agent} onSaved={onSaved} />}
        {tab === 'topup'        && <TopupTab         agent={agent} onSaved={onSaved} />}
      </div>
    </div>
  )
}

// ── Basic Tab ─────────────────────────────────────────────────────────

function BasicTab({ agent, agents, onSaved }: {
  agent: Agent; agents: Agent[]
  onSaved: (a: Agent) => Promise<void>
}) {
  const [form, setForm] = useState({
    avatar_url:          agent.avatar_url ?? '',
    nickname:            agent.nickname,
    phone:               agent.phone,
    email:               agent.email,
    password:            '',
    account_type:        agent.account_type,
    verification_status: agent.verification_status,
    account_status:      agent.account_status,
    referrer_id:         agent.referrer_id ?? '',
    note:                agent.note,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.nickname || !form.email) { setError('暱稱和 Email 為必填'); return }
    setSaving(true); setError('')
    const body = {
      ...form,
      avatar_url:  form.avatar_url  || null,
      referrer_id: form.referrer_id || null,
      password_hash: form.password  || undefined,
    }
    const url    = `/api/admin/agents/${agent.id}`
    const method = 'PATCH'
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const d = await r.json()
    if (!r.ok) { setError(d.error ?? '儲存失敗') }
    else await onSaved(d.agent ?? agent)
    setSaving(false)
  }

  const otherAgents = agents.filter(a => a.id !== agent.id)

  return (
    <div className="space-y-4 max-w-lg">
      {/* Avatar */}
      <div>
        <label className={label}>頭像網址</label>
        <input className={inp} placeholder="https://…" value={form.avatar_url} onChange={e => set('avatar_url', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>暱稱 <span className="text-red-500">*</span></label>
          <input className={inp} value={form.nickname} onChange={e => set('nickname', e.target.value)} />
        </div>
        <div>
          <label className={label}>行動電話</label>
          <input className={inp} value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>電子信箱 <span className="text-red-500">*</span></label>
          <input className={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div>
          <label className={label}>新密碼（留空不變）</label>
          <input className={inp} type="password" placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} />
        </div>
      </div>

      <div>
        <label className={label}>帳戶類型</label>
        <select className={inp} value={form.account_type} onChange={e => set('account_type', e.target.value)}>
          <option value="travel_agent">旅行從業人員</option>
          <option value="company">公司</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>審核狀態</label>
          <select className={inp} value={form.verification_status} onChange={e => set('verification_status', e.target.value)}>
            <option value="pending">未審核</option>
            <option value="reviewing">審核中</option>
            <option value="approved">審核通過</option>
            <option value="rejected">審核拒絕</option>
          </select>
        </div>
        <div>
          <label className={label}>帳戶狀態</label>
          <select className={inp} value={form.account_status} onChange={e => set('account_status', e.target.value)}>
            <option value="active">正常</option>
            <option value="suspended">停用</option>
            <option value="cancelled">註銷</option>
          </select>
        </div>
      </div>

      <div>
        <label className={label}>推薦人</label>
        <select className={inp} value={form.referrer_id} onChange={e => set('referrer_id', e.target.value)}>
          <option value="">— 無 —</option>
          {otherAgents.map(a => <option key={a.id} value={a.id}>{a.nickname} ({a.email})</option>)}
        </select>
      </div>

      <div>
        <label className={label}>備註</label>
        <textarea className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" rows={2} value={form.note} onChange={e => set('note', e.target.value)} />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button onClick={save} disabled={saving} className={`${btn} bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 w-full`}>
        {saving ? '儲存中…' : '儲存基本資料'}
      </button>
    </div>
  )
}

// ── Verification Tab ──────────────────────────────────────────────────

function VerificationTab({ agent, isNew, onSaved }: { agent: Agent; isNew: boolean; onSaved: (a: Agent) => Promise<void> }) {
  const v = oneVerif(agent.agent_verifications) ?? {}
  const isTraveler = agent.account_type === 'travel_agent'

  const [form, setForm] = useState<Verification>({
    tv_name:                  v.tv_name                  ?? '',
    tv_gender:                v.tv_gender                ?? '',
    tv_id_card_front_url:     v.tv_id_card_front_url     ?? '',
    tv_license_url:           v.tv_license_url           ?? '',
    co_company_name:          v.co_company_name          ?? '',
    co_tax_id:                v.co_tax_id                ?? '',
    co_address:               v.co_address               ?? '',
    co_website:               v.co_website               ?? '',
    co_owner_name:            v.co_owner_name            ?? '',
    co_owner_title:           v.co_owner_title           ?? '',
    co_owner_id_number:       v.co_owner_id_number       ?? '',
    co_contact_name:          v.co_contact_name          ?? '',
    co_contact_title:         v.co_contact_title         ?? '',
    co_contact_department:    v.co_contact_department    ?? '',
    co_contact_position:      v.co_contact_position      ?? '',
    co_contact_phone:         v.co_contact_phone         ?? '',
    co_business_license_url:  v.co_business_license_url  ?? '',
    co_travel_permit_url:     v.co_travel_permit_url     ?? '',
  })
  const [saving, setSaving] = useState(false)

  function set(k: keyof Verification, val: string) { setForm(f => ({ ...f, [k]: val })) }

  async function save() {
    setSaving(true)
    await fetch(`/api/admin/agents/${agent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verification: form }),
    })
    await onSaved({ ...agent, agent_verifications: { ...form, agent_id: agent.id } })
    setSaving(false)
  }

  return (
    <div className="space-y-5 max-w-lg">
      {isTraveler ? (
        <>
          <SectionTitle>旅行從業人員認證</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>姓名</label>
              <input className={inp} value={form.tv_name ?? ''} onChange={e => set('tv_name', e.target.value)} />
            </div>
            <div>
              <label className={label}>性別</label>
              <select className={inp} value={form.tv_gender ?? ''} onChange={e => set('tv_gender', e.target.value)}>
                <option value="">— 請選擇 —</option>
                <option value="male">男</option>
                <option value="female">女</option>
                <option value="other">其他</option>
              </select>
            </div>
          </div>
          <div>
            <label className={label}>身分證正面（圖片網址）</label>
            <input className={inp} placeholder="https://…" value={form.tv_id_card_front_url ?? ''} onChange={e => set('tv_id_card_front_url', e.target.value)} />
          </div>
          <div>
            <label className={label}>旅行從業人員執照（圖片網址）</label>
            <input className={inp} placeholder="https://…" value={form.tv_license_url ?? ''} onChange={e => set('tv_license_url', e.target.value)} />
          </div>
          <FilePreview url={form.tv_id_card_front_url} />
        </>
      ) : (
        <>
          <SectionTitle>公司認證</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>公司名稱</label>
              <input className={inp} value={form.co_company_name ?? ''} onChange={e => set('co_company_name', e.target.value)} />
            </div>
            <div>
              <label className={label}>統一編號</label>
              <input className={inp} value={form.co_tax_id ?? ''} onChange={e => set('co_tax_id', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={label}>公司地址</label>
            <input className={inp} value={form.co_address ?? ''} onChange={e => set('co_address', e.target.value)} />
          </div>
          <div>
            <label className={label}>公司網址</label>
            <input className={inp} placeholder="https://…" value={form.co_website ?? ''} onChange={e => set('co_website', e.target.value)} />
          </div>

          <SectionTitle>負責人資料</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={label}>負責人姓名</label>
              <input className={inp} value={form.co_owner_name ?? ''} onChange={e => set('co_owner_name', e.target.value)} />
            </div>
            <div>
              <label className={label}>負責人稱謂</label>
              <input className={inp} placeholder="先生/小姐" value={form.co_owner_title ?? ''} onChange={e => set('co_owner_title', e.target.value)} />
            </div>
            <div>
              <label className={label}>負責人身份證號</label>
              <input className={inp} value={form.co_owner_id_number ?? ''} onChange={e => set('co_owner_id_number', e.target.value)} />
            </div>
          </div>

          <SectionTitle>聯繫人資料</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>聯繫人姓名</label>
              <input className={inp} value={form.co_contact_name ?? ''} onChange={e => set('co_contact_name', e.target.value)} />
            </div>
            <div>
              <label className={label}>聯繫人稱謂</label>
              <input className={inp} placeholder="先生/小姐" value={form.co_contact_title ?? ''} onChange={e => set('co_contact_title', e.target.value)} />
            </div>
            <div>
              <label className={label}>聯繫人部門</label>
              <input className={inp} value={form.co_contact_department ?? ''} onChange={e => set('co_contact_department', e.target.value)} />
            </div>
            <div>
              <label className={label}>聯繫人職稱</label>
              <input className={inp} value={form.co_contact_position ?? ''} onChange={e => set('co_contact_position', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={label}>聯繫人電話</label>
            <input className={inp} value={form.co_contact_phone ?? ''} onChange={e => set('co_contact_phone', e.target.value)} />
          </div>

          <SectionTitle>證照文件（圖片網址）</SectionTitle>
          <div>
            <label className={label}>營業執照</label>
            <input className={inp} placeholder="https://…" value={form.co_business_license_url ?? ''} onChange={e => set('co_business_license_url', e.target.value)} />
          </div>
          <div>
            <label className={label}>旅行業許可證</label>
            <input className={inp} placeholder="https://…" value={form.co_travel_permit_url ?? ''} onChange={e => set('co_travel_permit_url', e.target.value)} />
          </div>
          <div className="flex gap-2">
            <FilePreview url={form.co_business_license_url} />
            <FilePreview url={form.co_travel_permit_url} />
          </div>
        </>
      )}

      {isNew
        ? <p className="text-xs text-center text-gray-400 py-1">請先在「基本資料」儲存後，再儲存認證資料</p>
        : <button onClick={save} disabled={saving} className={`${btn} bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 w-full`}>
            {saving ? '儲存中…' : '儲存認證資料'}
          </button>
      }
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700 pb-1">{children}</h3>
}

function FilePreview({ url }: { url?: string }) {
  if (!url) return null
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      <img src={url} alt="" className="h-24 rounded-lg border border-gray-200 dark:border-gray-700 object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
    </a>
  )
}

// ── API Key Tab ───────────────────────────────────────────────────────

function ApiKeyTab({ agent, onSaved }: { agent: Agent; onSaved: (a: Agent) => Promise<void> }) {
  const k = oneKey(agent.agent_api_keys)
  const [visible, setVisible] = useState(false)
  const [regen, setRegen]     = useState(false)

  async function regenKey() {
    if (!confirm('確認重新產生？原有憑證將立即失效。')) return
    setRegen(true)
    const r = await fetch(`/api/admin/agents/${agent.id}/api-key`, { method: 'POST' })
    const d = await r.json()
    if (r.ok) await onSaved({ ...agent, agent_api_keys: d.apiKey })
    setRegen(false)
  }

  const mask = (s: string) => '•'.repeat(s.length)

  return (
    <div className="max-w-lg space-y-4">
      {k ? (
        <>
          <div>
            <label className={label}>App Key</label>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
              <code className="flex-1 text-sm font-mono break-all text-gray-800 dark:text-gray-200">
                {visible ? k.app_key : mask(k.app_key)}
              </code>
              <CopyBtn text={k.app_key} />
            </div>
          </div>
          <div>
            <label className={label}>App Secret</label>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
              <code className="flex-1 text-sm font-mono break-all text-gray-800 dark:text-gray-200">
                {visible ? k.app_secret : mask(k.app_secret)}
              </code>
              <CopyBtn text={k.app_secret} />
            </div>
          </div>
          <button onClick={() => setVisible(v => !v)} className="text-xs text-indigo-600 hover:underline">
            {visible ? '隱藏憑證' : '顯示憑證'}
          </button>
          <p className="text-xs text-gray-400">最後產生：{fmt(k.created_at)}</p>
        </>
      ) : (
        <p className="text-sm text-gray-500 py-4 text-center">尚未產生 API 憑證</p>
      )}
      <button onClick={regenKey} disabled={regen}
        className={`${btn} flex items-center gap-2 border border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-50`}>
        <RefreshCw size={13} className={regen ? 'animate-spin' : ''} />
        {k ? '重新產生 API 憑證' : '產生 API 憑證'}
      </button>
    </div>
  )
}

// ── Topup Tab ─────────────────────────────────────────────────────────

function TopupTab({ agent, onSaved }: { agent: Agent; onSaved: (a: Agent) => Promise<void> }) {
  const [logs, setLogs]     = useState<TopupLog[]>([])
  const [amt, setAmt]       = useState('')
  const [note, setNote]     = useState('')
  const [saving, setSaving] = useState(false)
  const [balance, setBalance] = useState(agent.balance)

  useEffect(() => {
    fetch(`/api/admin/agents/${agent.id}/topup`)
      .then(r => r.json())
      .then(d => setLogs(d.logs ?? []))
  }, [agent.id])

  async function submit() {
    if (!amt) return
    setSaving(true)
    const r = await fetch(`/api/admin/agents/${agent.id}/topup`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amt, note }),
    })
    const d = await r.json()
    if (r.ok) {
      setBalance(d.balance)
      await onSaved({ ...agent, balance: d.balance })
      setAmt(''); setNote('')
      const r2 = await fetch(`/api/admin/agents/${agent.id}/topup`)
      const d2 = await r2.json()
      setLogs(d2.logs ?? [])
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl px-5 py-3 flex items-center justify-between">
        <span className="text-sm text-indigo-700 dark:text-indigo-300">目前餘額（TWD）</span>
        <span className="text-2xl font-bold font-mono text-indigo-700 dark:text-indigo-300">{fmtBal(balance)}</span>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className={label}>金額（TWD）</label>
          <input className={inp} type="number" step="0.01" placeholder="正數=充值，負數=扣款"
            value={amt} onChange={e => setAmt(e.target.value)} />
        </div>
        <div className="flex-1">
          <label className={label}>備註</label>
          <input className={inp} placeholder="充值說明" value={note} onChange={e => setNote(e.target.value)} />
        </div>
        <div className="flex items-end">
          <button onClick={submit} disabled={saving || !amt} className={`${btn} bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50`}>
            {saving ? '處理中…' : '確認'}
          </button>
        </div>
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 text-xs font-medium text-gray-500 uppercase">充值紀錄</div>
        <div className="max-h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-center py-8 text-sm text-gray-400">尚無紀錄</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left">日期</th>
                  <th className="px-4 py-2 text-right">金額</th>
                  <th className="px-4 py-2 text-left">備註</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {logs.map(l => (
                  <tr key={l.id}>
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{fmt(l.created_at)}</td>
                    <td className={`px-4 py-2 text-right font-mono font-medium ${Number(l.amount) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                      {Number(l.amount) >= 0 ? '+' : ''}{fmtBal(l.amount)}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{l.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
