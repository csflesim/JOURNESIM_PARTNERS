'use client'

import { useEffect, useState, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { useLanguage } from '@/components/language-provider'
import { Plus, Pencil, Trash2, Settings2 } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────

interface Member {
  id: string
  email: string
  phone: string
  display_name: string
  auth_provider: string
  is_active: boolean
  note: string
  created_at: string
  updated_at: string
}

const PROVIDERS = ['email', 'google', 'apple', 'line'] as const

// ── Modal ────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  onSave,
  children,
}: {
  title: string
  onClose: () => void
  onSave: () => void
  children: React.ReactNode
}) {
  const { t } = useLanguage()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
        {children}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            {t('btn.close')}
          </button>
          <button
            onClick={onSave}
            className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
          >
            {t('btn.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────

export default function MembersPage() {
  const { t } = useLanguage()
  const [members, setMembers] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [providerFilter, setProviderFilter] = useState('')
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; member?: Member } | null>(null)
  const [form, setForm] = useState({
    email: '',
    phone: '',
    display_name: '',
    auth_provider: 'email',
    is_active: true,
    note: '',
  })

  async function fetchMembers() {
    const data = await fetch('/api/admin/members').then(r => r.json())
    setMembers(data.members ?? [])
  }

  useEffect(() => { fetchMembers() }, [])

  // ── CRUD ──
  function openAdd() {
    setForm({ email: '', phone: '', display_name: '', auth_provider: 'email', is_active: true, note: '' })
    setModal({ mode: 'add' })
  }

  function openEdit(m: Member) {
    setForm({
      email: m.email,
      phone: m.phone,
      display_name: m.display_name,
      auth_provider: m.auth_provider,
      is_active: m.is_active,
      note: m.note,
    })
    setModal({ mode: 'edit', member: m })
  }

  async function save() {
    if (!form.email.trim()) { alert(t('member.emailRequired')); return }
    if (modal?.mode === 'add') {
      await fetch('/api/admin/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } else if (modal?.member) {
      await fetch(`/api/admin/members/${modal.member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    }
    setModal(null)
    fetchMembers()
  }

  async function toggleStatus(m: Member) {
    await fetch(`/api/admin/members/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !m.is_active }),
    })
    fetchMembers()
  }

  async function deleteMember(id: string) {
    if (!confirm(t('member.confirmDelete'))) return
    await fetch(`/api/admin/members/${id}`, { method: 'DELETE' })
    fetchMembers()
  }

  // ── Filtered list ──
  const filtered = useMemo(() =>
    members.filter(m => {
      if (search) {
        const q = search.toLowerCase()
        if (!m.email.toLowerCase().includes(q) && !m.display_name.toLowerCase().includes(q)) return false
      }
      if (statusFilter === 'active' && !m.is_active) return false
      if (statusFilter === 'inactive' && m.is_active) return false
      if (providerFilter && m.auth_provider !== providerFilter) return false
      return true
    }),
    [members, search, statusFilter, providerFilter]
  )

  const inputCls = 'w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500'
  const thCls = 'px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase'
  const tdCls = 'px-4 py-3 text-sm text-gray-700 dark:text-gray-300'

  return (
    <>
      <Header breadcrumb={[t('member.title')]} />
      <div className="p-6 flex flex-col gap-4 h-[calc(100vh-56px)]">
        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('member.search')}
            className="w-56 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={providerFilter}
            onChange={e => setProviderFilter(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
          >
            <option value="">{t('member.allProviders')}</option>
            {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
          >
            <option value="">{t('member.allStatuses')}</option>
            <option value="active">{t('member.active')}</option>
            <option value="inactive">{t('member.inactive')}</option>
          </select>
          <div className="flex-1" />
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg whitespace-nowrap"
          >
            <Plus size={14} />
            {t('member.add')}
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr>
                  <th className={thCls}>{t('member.email')}</th>
                  <th className={thCls}>{t('member.displayName')}</th>
                  <th className={thCls}>{t('member.phone')}</th>
                  <th className={thCls}>{t('member.provider')}</th>
                  <th className={thCls}>{t('member.status')}</th>
                  <th className={thCls}>{t('member.createdAt')}</th>
                  <th className={thCls}>{t('member.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                      {t('member.noData')}
                    </td>
                  </tr>
                ) : filtered.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className={tdCls}>
                      <span className="font-medium text-indigo-700 dark:text-indigo-400">{m.email}</span>
                    </td>
                    <td className={tdCls}>{m.display_name || '—'}</td>
                    <td className={tdCls}>{m.phone || '—'}</td>
                    <td className={tdCls}>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {m.auth_provider}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <button
                        onClick={() => toggleStatus(m)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                          m.is_active ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${m.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </td>
                    <td className={tdCls + ' text-xs text-gray-500 dark:text-gray-400'}>
                      {new Date(m.created_at).toLocaleString()}
                    </td>
                    <td className={tdCls}>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(m)} className="p-1 text-gray-400 hover:text-indigo-600 rounded">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deleteMember(m.id)} className="p-1 text-gray-400 hover:text-red-500 rounded">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400">
            <span>{t('member.total', { n: filtered.length })}</span>
            <Settings2 size={14} className="text-gray-300 dark:text-gray-600" />
          </div>
        </div>
      </div>

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <Modal
          title={modal.mode === 'add' ? t('member.add') : t('member.email')}
          onClose={() => setModal(null)}
          onSave={save}
        >
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('member.email')}</label>
              <input
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className={inputCls}
                disabled={modal.mode === 'edit'}
                type="email"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('member.displayName')}</label>
              <input
                value={form.display_name}
                onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('member.phone')}</label>
              <input
                value={form.phone}
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('member.provider')}</label>
              <select
                value={form.auth_provider}
                onChange={e => setForm(p => ({ ...p, auth_provider: e.target.value }))}
                className={inputCls}
              >
                {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('member.note')}</label>
              <textarea
                value={form.note}
                onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                className={inputCls + ' resize-none'}
                rows={2}
              />
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
