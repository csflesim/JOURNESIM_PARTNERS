'use client'

import { useEffect, useState, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { useLanguage, type Lang } from '@/components/language-provider'
import { MODULES, PERMISSION_GROUPS, type ModuleKey, type PermissionKey } from '@/lib/permissions'
import { Pencil, Trash2, Plus, Settings2 } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────

interface Role {
  id: string
  name: string
  description: string
  user_count: number
  created_at: string
}

interface Account {
  id: string
  username: string
  role_id: string | null
  is_active: boolean
  created_at: string
  admin_roles: { name: string } | null
}

type Permissions = Record<PermissionKey, boolean>

// ── Permission Panel ─────────────────────────────────────────────────

function PermissionPanel({
  roleId,
  label,
  lang,
}: {
  roleId: string | null
  label: string
  lang: Lang
}) {
  const { t } = useLanguage()
  const [perms, setPerms] = useState<Permissions | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [savingModule, setSavingModule] = useState<ModuleKey | null>(null)

  useEffect(() => {
    if (!roleId) { setPerms(null); return }
    fetch(`/api/admin/roles/${roleId}/permissions`)
      .then(r => r.json())
      .then(d => setPerms(d.permissions ?? null))
  }, [roleId])

  async function toggle(key: PermissionKey) {
    if (!roleId || !perms) return
    const newVal = !perms[key]
    setPerms(prev => prev ? { ...prev, [key]: newVal } : prev)
    setSaving(key)
    await fetch(`/api/admin/roles/${roleId}/permissions`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permission_key: key, enabled: newVal }),
    })
    setSaving(null)
  }

  function isModuleOn(moduleKey: ModuleKey): boolean {
    if (!perms) return false
    const keys = PERMISSION_GROUPS
      .filter(g => g.moduleKey === moduleKey)
      .flatMap(g => g.items.map(i => i.key))
    return keys.length > 0 && keys.every(k => perms[k])
  }

  async function toggleModule(moduleKey: ModuleKey) {
    if (!roleId || !perms) return
    const enable = !isModuleOn(moduleKey)
    const keys = PERMISSION_GROUPS
      .filter(g => g.moduleKey === moduleKey)
      .flatMap(g => g.items.map(i => i.key))
    setPerms(prev => {
      if (!prev) return prev
      const next = { ...prev }
      keys.forEach(k => { next[k] = enable })
      return next
    })
    setSavingModule(moduleKey)
    await Promise.all(keys.map(key =>
      fetch(`/api/admin/roles/${roleId}/permissions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission_key: key, enabled: enable }),
      })
    ))
    setSavingModule(null)
  }

  function groupLabel(labels: Record<string, string>) {
    return labels[lang] ?? labels['zh-TW']
  }

  const moduleGroups = MODULES.map(m => ({
    module: m,
    groups: PERMISSION_GROUPS.filter(g => g.moduleKey === m.moduleKey),
  })).filter(({ groups }) => groups.length > 0)

  const systemGroups = PERMISSION_GROUPS.filter(g => !g.moduleKey)

  function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
          on ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
        } ${disabled ? 'opacity-50 cursor-wait' : ''}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    )
  }

  function GroupCard({ group }: { group: typeof PERMISSION_GROUPS[0] }) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
          {groupLabel(group.label)}
        </div>
        <div className="space-y-3">
          {group.items.map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {groupLabel(item.label)}
              </span>
              <Toggle
                on={perms![item.key]}
                onClick={() => toggle(item.key)}
                disabled={saving === item.key}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('acct.permTitle')}</span>
        {label && (
          <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        )}
      </div>

      {!roleId ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
          {t('acct.selectPrompt')}
        </div>
      ) : !perms ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">{t('common.loading')}</div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {/* ── Module sections ── */}
          {moduleGroups.map(({ module, groups }) => {
            const on = isModuleOn(module.moduleKey)
            return (
              <div key={module.moduleKey}>
                {/* Module header row */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {module.label[lang] ?? module.label['zh-TW']}
                  </span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  <Toggle
                    on={on}
                    onClick={() => toggleModule(module.moduleKey)}
                    disabled={savingModule === module.moduleKey}
                  />
                </div>
                {/* Group cards */}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                  {groups.map(group => <GroupCard key={group.groupKey} group={group} />)}
                </div>
              </div>
            )
          })}

          {/* ── System groups (no module) ── */}
          {systemGroups.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  系統管理
                </span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                {systemGroups.map(group => <GroupCard key={group.groupKey} group={group} />)}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}

// ── Add/Edit Modal ───────────────────────────────────────────────────

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
        className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4"
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

type Tab = 'accounts' | 'roles'

export default function AccountsPage() {
  const { t, lang } = useLanguage()
  const [tab, setTab] = useState<Tab>('accounts')

  // Roles state
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [roleSearch, setRoleSearch] = useState('')
  const [roleModal, setRoleModal] = useState<{ mode: 'add' | 'edit'; role?: Role } | null>(null)
  const [roleForm, setRoleForm] = useState({ name: '', description: '' })

  // Accounts state
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAcctRoleId, setSelectedAcctRoleId] = useState<string | null>(null)
  const [selectedAcctLabel, setSelectedAcctLabel] = useState('')
  const [acctSearch, setAcctSearch] = useState('')
  const [acctRoleFilter, setAcctRoleFilter] = useState('')
  const [acctStatusFilter, setAcctStatusFilter] = useState('')
  const [acctModal, setAcctModal] = useState<{ mode: 'add' | 'edit'; acct?: Account } | null>(null)
  const [acctForm, setAcctForm] = useState({ username: '', role_id: '', is_active: true })

  async function fetchRoles() {
    const data = await fetch('/api/admin/roles').then(r => r.json())
    setRoles(data.roles ?? [])
  }

  async function fetchAccounts() {
    const data = await fetch('/api/admin/accounts').then(r => r.json())
    setAccounts(data.accounts ?? [])
  }

  useEffect(() => { fetchRoles(); fetchAccounts() }, [])

  // ── Roles CRUD ──
  function openAddRole() {
    setRoleForm({ name: '', description: '' })
    setRoleModal({ mode: 'add' })
  }
  function openEditRole(role: Role) {
    setRoleForm({ name: role.name, description: role.description })
    setRoleModal({ mode: 'edit', role })
  }
  async function saveRole() {
    if (!roleForm.name.trim()) { alert(t('acct.nameRequired')); return }
    if (roleModal?.mode === 'add') {
      await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleForm),
      })
    } else if (roleModal?.role) {
      await fetch(`/api/admin/roles/${roleModal.role.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roleForm),
      })
    }
    setRoleModal(null)
    fetchRoles()
  }
  async function deleteRole(id: string) {
    if (!confirm(t('acct.confirmDelete'))) return
    await fetch(`/api/admin/roles/${id}`, { method: 'DELETE' })
    if (selectedRoleId === id) setSelectedRoleId(null)
    fetchRoles()
  }

  // ── Accounts CRUD ──
  function openAddAccount() {
    setAcctForm({ username: '', role_id: roles[0]?.id ?? '', is_active: true })
    setAcctModal({ mode: 'add' })
  }
  function openEditAccount(acct: Account) {
    setAcctForm({ username: acct.username, role_id: acct.role_id ?? '', is_active: acct.is_active })
    setAcctModal({ mode: 'edit', acct })
  }
  async function saveAccount() {
    if (!acctForm.username.trim()) { alert(t('acct.nameRequired')); return }
    if (acctModal?.mode === 'add') {
      await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(acctForm),
      })
    } else if (acctModal?.acct) {
      await fetch(`/api/admin/accounts/${acctModal.acct.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(acctForm),
      })
    }
    setAcctModal(null)
    fetchAccounts()
  }
  async function toggleAccountStatus(acct: Account) {
    await fetch(`/api/admin/accounts/${acct.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !acct.is_active }),
    })
    fetchAccounts()
  }
  async function deleteAccount(id: string) {
    if (!confirm(t('acct.confirmDelete'))) return
    await fetch(`/api/admin/accounts/${id}`, { method: 'DELETE' })
    fetchAccounts()
  }

  // Filtered lists
  const filteredRoles = useMemo(() =>
    roles.filter(r => r.name.toLowerCase().includes(roleSearch.toLowerCase())),
    [roles, roleSearch]
  )

  const filteredAccounts = useMemo(() =>
    accounts.filter(a => {
      if (acctSearch && !a.username.toLowerCase().includes(acctSearch.toLowerCase())) return false
      if (acctRoleFilter && a.role_id !== acctRoleFilter) return false
      if (acctStatusFilter === 'active' && !a.is_active) return false
      if (acctStatusFilter === 'inactive' && a.is_active) return false
      return true
    }),
    [accounts, acctSearch, acctRoleFilter, acctStatusFilter]
  )

  const inputCls = 'w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500'
  const thCls = 'px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase'
  const tdCls = 'px-4 py-3 text-sm text-gray-700 dark:text-gray-300'

  return (
    <>
      <Header breadcrumb={[t('nav.accounts')]} />
      <div className="p-6 flex flex-col gap-4 h-[calc(100vh-56px)]">
        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-200 dark:border-gray-700">
          {(['accounts', 'roles'] as Tab[]).map(tabKey => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === tabKey
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t(tabKey === 'accounts' ? 'acct.tabAccounts' : 'acct.tabRoles')}
            </button>
          ))}
        </div>

        {/* Content: Left list + Right permissions panel */}
        <div className="flex gap-4 flex-1 min-h-0">

          {/* ── Roles Tab ── */}
          {tab === 'roles' && (
            <>
              <div className="w-[420px] shrink-0 flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <input
                    value={roleSearch}
                    onChange={e => setRoleSearch(e.target.value)}
                    placeholder={t('acct.searchRole')}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={openAddRole}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg whitespace-nowrap"
                  >
                    <Plus size={14} />
                    {t('acct.addRole')}
                  </button>
                </div>
                {/* Table */}
                <div className="flex-1 overflow-y-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                      <tr>
                        <th className={thCls}>{t('acct.roleName')}</th>
                        <th className={thCls}>{t('acct.roleDesc')}</th>
                        <th className={thCls}>{t('acct.userCount')}</th>
                        <th className={thCls}>{t('acct.createdAt')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {filteredRoles.length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">{t('acct.noRoles')}</td></tr>
                      ) : filteredRoles.map(role => (
                        <tr
                          key={role.id}
                          onClick={() => setSelectedRoleId(role.id)}
                          className={`cursor-pointer transition-colors ${
                            selectedRoleId === role.id
                              ? 'bg-indigo-50 dark:bg-indigo-900/20'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`}
                        >
                          <td className={tdCls}>
                            <span className={selectedRoleId === role.id ? 'text-indigo-700 dark:text-indigo-400 font-medium' : ''}>
                              {role.name}
                            </span>
                          </td>
                          <td className={tdCls + ' text-gray-500 dark:text-gray-400'}>{role.description}</td>
                          <td className={tdCls}>{role.user_count}</td>
                          <td className={tdCls}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-gray-500 dark:text-gray-400 text-xs">
                                {new Date(role.created_at).toLocaleString()}
                              </span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                                <button onClick={() => openEditRole(role)} className="p-1 text-gray-400 hover:text-indigo-600 rounded">
                                  <Pencil size={13} />
                                </button>
                                <button onClick={() => deleteRole(role.id)} className="p-1 text-gray-400 hover:text-red-500 rounded">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400">
                  <span>{t('acct.total', { n: filteredRoles.length })}</span>
                  <Settings2 size={14} className="text-gray-300 dark:text-gray-600" />
                </div>
              </div>

              <PermissionPanel
                roleId={selectedRoleId}
                label={selectedRoleId ? t('acct.selectedRole', { n: roles.find(r => r.id === selectedRoleId)?.name ?? '' }) : ''}
                lang={lang}
              />
            </>
          )}

          {/* ── Accounts Tab ── */}
          {tab === 'accounts' && (
            <>
              <div className="w-[460px] shrink-0 flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <input
                    value={acctSearch}
                    onChange={e => setAcctSearch(e.target.value)}
                    placeholder={t('acct.searchAccount')}
                    className="w-28 px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <select
                    value={acctRoleFilter}
                    onChange={e => setAcctRoleFilter(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
                  >
                    <option value="">{t('acct.allRoles')}</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <select
                    value={acctStatusFilter}
                    onChange={e => setAcctStatusFilter(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
                  >
                    <option value="">{t('acct.allStatuses')}</option>
                    <option value="active">{t('acct.active')}</option>
                    <option value="inactive">{t('acct.inactive')}</option>
                  </select>
                  <button
                    onClick={openAddAccount}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg whitespace-nowrap"
                  >
                    <Plus size={14} />
                    {t('acct.addAccount')}
                  </button>
                </div>
                {/* Table */}
                <div className="flex-1 overflow-y-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                      <tr>
                        <th className={thCls}>{t('acct.username')}</th>
                        <th className={thCls}>{t('acct.role')}</th>
                        <th className={thCls}>{t('acct.status')}</th>
                        <th className={thCls}>{t('acct.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {filteredAccounts.length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">{t('acct.noAccounts')}</td></tr>
                      ) : filteredAccounts.map(acct => (
                        <tr
                          key={acct.id}
                          onClick={() => {
                            setSelectedAcctRoleId(acct.role_id)
                            setSelectedAcctLabel(t('acct.selectedAcct', { n: acct.username }))
                          }}
                          className={`cursor-pointer transition-colors ${
                            selectedAcctRoleId === acct.role_id && selectedAcctLabel.includes(acct.username)
                              ? 'bg-indigo-50 dark:bg-indigo-900/20'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`}
                        >
                          <td className={tdCls}>
                            <span className="font-medium text-indigo-700 dark:text-indigo-400">
                              {acct.username}
                            </span>
                          </td>
                          <td className={tdCls}>{acct.admin_roles?.name ?? '—'}</td>
                          <td className={tdCls}>
                            <button
                              onClick={e => { e.stopPropagation(); toggleAccountStatus(acct) }}
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                                acct.is_active ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${acct.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                          </td>
                          <td className={tdCls}>
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              <button onClick={() => openEditAccount(acct)} className="p-1 text-gray-400 hover:text-indigo-600 rounded">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => deleteAccount(acct.id)} className="p-1 text-gray-400 hover:text-red-500 rounded">
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
                  <span>{t('acct.total', { n: filteredAccounts.length })}</span>
                  <Settings2 size={14} className="text-gray-300 dark:text-gray-600" />
                </div>
              </div>

              <PermissionPanel
                roleId={selectedAcctRoleId}
                label={selectedAcctLabel}
                lang={lang}
              />
            </>
          )}
        </div>
      </div>

      {/* ── Role Modal ── */}
      {roleModal && (
        <Modal
          title={roleModal.mode === 'add' ? t('acct.addRole') : t('acct.roleName')}
          onClose={() => setRoleModal(null)}
          onSave={saveRole}
        >
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('acct.roleName')}</label>
              <input
                value={roleForm.name}
                onChange={e => setRoleForm(p => ({ ...p, name: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('acct.roleDesc')}</label>
              <input
                value={roleForm.description}
                onChange={e => setRoleForm(p => ({ ...p, description: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ── Account Modal ── */}
      {acctModal && (
        <Modal
          title={acctModal.mode === 'add' ? t('acct.addAccount') : t('acct.username')}
          onClose={() => setAcctModal(null)}
          onSave={saveAccount}
        >
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('acct.username')}</label>
              <input
                value={acctForm.username}
                onChange={e => setAcctForm(p => ({ ...p, username: e.target.value }))}
                className={inputCls}
                disabled={acctModal.mode === 'edit'}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('acct.role')}</label>
              <select
                value={acctForm.role_id}
                onChange={e => setAcctForm(p => ({ ...p, role_id: e.target.value }))}
                className={inputCls}
              >
                <option value="">{t('acct.allRoles')}</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
