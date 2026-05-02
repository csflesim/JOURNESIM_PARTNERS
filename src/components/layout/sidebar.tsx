'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Smartphone, CreditCard, List, Settings,
  ChevronDown, ChevronRight, Bell, FileText, Users, BarChart2,
  Wrench, Code, BookOpen, PanelLeftClose, PanelLeftOpen, Languages, SlidersHorizontal,
  UserCircle, ShoppingBag,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useLanguage } from '@/components/language-provider'
import { MODULES, type ModuleKey } from '@/lib/permissions'

// ── Types ──────────────────────────────────────────────────────────────

type NavChild = { key: string; label: string; href: string }
type NavItem =
  | { type: 'link';   key: string; label: string; href: string; icon: React.ReactNode }
  | { type: 'group';  key: string; label: string; icon: React.ReactNode; children: NavChild[] }

type NavSection =
  | { type: 'module'; moduleKey: ModuleKey; label: string; items: NavItem[] }
  | { type: 'system'; label: string; items: NavItem[] }

// ── Sidebar ────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [openMenus, setOpenMenus] = useState<string[]>(['purchase-esimOrders'])
  // Collapsed modules (outer layer): moduleKey → collapsed
  const [collapsedModules, setCollapsedModules] = useState<Set<ModuleKey>>(new Set())
  const { t } = useLanguage()

  const sections: NavSection[] = [
    {
      type: 'module',
      moduleKey: 'biz',
      label: MODULES.find(m => m.moduleKey === 'biz')!.label['zh-TW'],
      items: [
        { type: 'link', key: 'biz-dashboard', label: t('nav.dashboard'), href: '/admin', icon: <LayoutDashboard size={18} /> },
        { type: 'link', key: 'agents', label: t('nav.agents'), href: '/agents', icon: <Users size={18} /> },
        { type: 'link', key: 'members', label: t('nav.members'), href: '/members', icon: <UserCircle size={18} /> },
        { type: 'link', key: 'agent-products', label: t('nav.agentProducts'), href: '/agent-products', icon: <ShoppingBag size={18} /> },
      ],
    },
    {
      type: 'module',
      moduleKey: 'purchase',
      label: MODULES.find(m => m.moduleKey === 'purchase')!.label['zh-TW'],
      items: [
        { type: 'link', key: 'purchase-dashboard', label: t('nav.dashboard'), href: '/purchase-dashboard', icon: <LayoutDashboard size={18} /> },
        {
          type: 'group', key: 'purchase-esimOrders', label: t('nav.esimOrders'), icon: <Smartphone size={18} />,
          children: [
            { key: 'purchase-esimCreate',   label: t('nav.createOrder'), href: '/purchase-esim-orders/create' },
            { key: 'purchase-esimList',     label: t('nav.orderList'),   href: '/purchase-esim-orders' },
          ],
        },
        {
          type: 'group', key: 'purchase-simOrders', label: t('nav.simOrders'), icon: <CreditCard size={18} />,
          children: [
            { key: 'purchase-simCreate', label: t('nav.createOrder'), href: '/purchase-sim-orders/create' },
            { key: 'purchase-simList',   label: t('nav.orderList'),   href: '/purchase-sim-orders' },
          ],
        },
        {
          type: 'group', key: 'purchase-plans', label: t('nav.plans'), icon: <List size={18} />,
          children: [
            { key: 'purchase-planEsim',  label: t('nav.plans.esim'),  href: '/purchase-plans/esim' },
            { key: 'purchase-planSim',   label: t('nav.plans.sim'),   href: '/purchase-plans/sim' },
            { key: 'purchase-planAccel', label: t('nav.plans.accel'), href: '/purchase-plans/acceleration' },
          ],
        },
        {
          type: 'group', key: 'purchase-operations', label: t('nav.operations'), icon: <Wrench size={18} />,
          children: [
            { key: 'purchase-opQuery', label: t('nav.planQuery'),  href: '/purchase-operations/plan-query' },
            { key: 'purchase-opAfter', label: t('nav.afterSales'), href: '/purchase-operations/after-sales' },
            { key: 'purchase-opKyc',   label: t('nav.kyc'),        href: '/purchase-operations/kyc' },
            { key: 'purchase-opIccid', label: t('nav.iccid'),      href: '/purchase-operations/iccid' },
          ],
        },
        {
          type: 'group', key: 'purchase-billing', label: t('nav.billing'), icon: <FileText size={18} />,
          children: [
            { key: 'billFx', label: t('nav.exchangeRates'), href: '/billing/exchange-rates' },
          ],
        },
        {
          type: 'group', key: 'purchase-reports', label: t('nav.reports'), icon: <BarChart2 size={18} />,
          children: [
            { key: 'repPurchase', label: t('nav.purchase'), href: '/reports/purchase' },
            { key: 'repSales',    label: t('nav.sales'),    href: '/reports/sales' },
          ],
        },
        {
          type: 'group', key: 'purchase-announcements', label: t('nav.announcements'), icon: <Bell size={18} />,
          children: [
            { key: 'annBiz', label: t('nav.bizAnnounce'), href: '/announcements/business' },
            { key: 'annSys', label: t('nav.sysAnnounce'), href: '/announcements/system' },
          ],
        },
      ],
    },
    {
      type: 'module',
      moduleKey: 'sale',
      label: MODULES.find(m => m.moduleKey === 'sale')!.label['zh-TW'],
      items: [
        { type: 'link', key: 'sale-dashboard', label: t('nav.dashboard'), href: '/sale-dashboard', icon: <LayoutDashboard size={18} /> },
        {
          type: 'group', key: 'sale-esimOrders', label: t('nav.esimOrders'), icon: <Smartphone size={18} />,
          children: [
            { key: 'sale-esimCreate', label: t('nav.createOrder'), href: '/sale-esim-orders/create' },
            { key: 'sale-esimList',   label: t('nav.orderList'),   href: '/sale-esim-orders' },
          ],
        },
        {
          type: 'group', key: 'sale-simOrders', label: t('nav.simOrders'), icon: <CreditCard size={18} />,
          children: [
            { key: 'sale-simCreate', label: t('nav.createOrder'), href: '/sale-sim-orders/create' },
            { key: 'sale-simList',   label: t('nav.orderList'),   href: '/sale-sim-orders' },
          ],
        },
        {
          type: 'group', key: 'sale-products', label: '商品管理', icon: <SlidersHorizontal size={18} />,
          children: [
            { key: 'sale-productEsim',  label: 'eSIM 商品', href: '/sale-products/esim' },
            { key: 'sale-productSim',   label: 'SIM 商品',  href: '/sale-products/sim' },
            { key: 'sale-productAccel', label: '加速包',    href: '/sale-products/acceleration' },
          ],
        },
      ],
    },
    {
      type: 'module',
      moduleKey: 'partners',
      label: MODULES.find(m => m.moduleKey === 'partners')!.label['zh-TW'],
      items: [
        { type: 'link', key: 'partners-dashboard', label: t('nav.dashboard'), href: '/partners-dashboard', icon: <LayoutDashboard size={18} /> },
        {
          type: 'group', key: 'partner-esimOrders', label: t('nav.esimOrders'), icon: <Smartphone size={18} />,
          children: [
            { key: 'partner-esimCreate', label: t('nav.createOrder'), href: '/partner-esim-orders/create' },
            { key: 'partner-esimList',   label: t('nav.orderList'),   href: '/partner-esim-orders' },
          ],
        },
        {
          type: 'group', key: 'partner-simOrders', label: t('nav.simOrders'), icon: <CreditCard size={18} />,
          children: [
            { key: 'partner-simCreate', label: t('nav.createOrder'), href: '/partner-sim-orders/create' },
            { key: 'partner-simList',   label: t('nav.orderList'),   href: '/partner-sim-orders' },
          ],
        },
        {
          type: 'group', key: 'partner-operations', label: t('nav.operations'), icon: <Wrench size={18} />,
          children: [
            { key: 'partner-opQuery', label: t('nav.planQuery'),  href: '/partner-operations/plan-query' },
            { key: 'partner-opAfter', label: t('nav.afterSales'), href: '/partner-operations/after-sales' },
            { key: 'partner-opKyc',   label: t('nav.kyc'),        href: '/partner-operations/kyc' },
            { key: 'partner-opIccid', label: t('nav.iccid'),      href: '/partner-operations/iccid' },
          ],
        },
        {
          type: 'group', key: 'partner-plans', label: t('nav.plans'), icon: <List size={18} />,
          children: [
            { key: 'partner-planEsim',  label: t('nav.plans.esim'),  href: '/partner-plans/esim' },
            { key: 'partner-planSim',   label: t('nav.plans.sim'),   href: '/partner-plans/sim' },
            { key: 'partner-planAccel', label: t('nav.plans.accel'), href: '/partner-plans/acceleration' },
          ],
        },
      ],
    },
    {
      type: 'system',
      label: '系統管理',
      items: [
        {
          type: 'group', key: 'accounts', label: t('nav.accounts'), icon: <Users size={18} />,
          children: [
            { key: 'acctMgmt',  label: t('nav.accounts'),  href: '/accounts' },
            { key: 'acctRoles', label: t('nav.rolesMgmt'), href: '/accounts/roles' },
          ],
        },
        {
          type: 'group', key: 'api', label: t('nav.api'), icon: <Code size={18} />,
          children: [
            { key: 'apiAuth', label: t('nav.apiAuth'), href: '/api-docs/auth' },
            { key: 'apiDocs', label: t('nav.apiDocs'), href: '/api-docs/docs' },
          ],
        },
        {
          type: 'group', key: 'params', label: t('nav.params'), icon: <SlidersHorizontal size={18} />,
          children: [
            { key: 'paramCountries',  label: t('nav.params.countries'),  href: '/params/countries' },
            { key: 'paramOperators',  label: t('nav.params.operators'),  href: '/params/operators' },
            { key: 'paramDays',       label: t('nav.params.days'),       href: '/params/days' },
            { key: 'paramCapacities', label: t('nav.params.capacities'), href: '/params/capacities' },
          ],
        },
        { type: 'link', key: 'guide',       label: t('nav.guide'),       href: '/guide',       icon: <BookOpen size={18} /> },
        { type: 'link', key: 'terminology', label: t('nav.terminology'), href: '/terminology', icon: <Languages size={18} /> },
      ],
    },
  ]

  function toggleMenu(key: string) {
    setOpenMenus(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  function toggleModule(moduleKey: ModuleKey) {
    setCollapsedModules(prev => {
      const next = new Set(prev)
      next.has(moduleKey) ? next.delete(moduleKey) : next.add(moduleKey)
      return next
    })
  }

  function isActive(href: string) {
    return pathname === href
  }

  function renderItem(item: NavItem) {
    if (item.type === 'link') {
      return (
        <Link
          key={item.key}
          href={item.href}
          className={clsx(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            isActive(item.href)
              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          {item.icon}
          {!collapsed && <span>{item.label}</span>}
        </Link>
      )
    }

    // group
    const open = openMenus.includes(item.key)
    return (
      <div key={item.key}>
        <button
          onClick={() => toggleMenu(item.key)}
          className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
          </div>
          {!collapsed && (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
        </button>
        {!collapsed && open && (
          <div className="ml-4 border-l border-gray-200 dark:border-gray-700 pl-3 mb-1">
            {item.children.map(child => (
              <Link
                key={child.key}
                href={child.href}
                className={clsx(
                  'block px-3 py-1.5 rounded-lg text-sm transition-colors',
                  isActive(child.href)
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className={clsx(
      'flex flex-col h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-200',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg tracking-wide">FLESIM</span>}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400">
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {sections.map(section => {
          const moduleCollapsed = section.type === 'module' && collapsedModules.has(section.moduleKey)

          return (
            <div key={section.type === 'module' ? section.moduleKey : 'system'}>
              {/* Section header */}
              {!collapsed && (
                <div className="mt-3 mb-1 flex items-center gap-2 px-3">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap flex-1">
                    {section.label}
                  </span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  {section.type === 'module' && (
                    <button
                      onClick={() => toggleModule(section.moduleKey)}
                      className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-1 flex-shrink-0"
                      title={moduleCollapsed ? '展開模組' : '收合模組'}
                    >
                      {moduleCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    </button>
                  )}
                </div>
              )}

              {/* Section items */}
              {!moduleCollapsed && section.items.map(item => renderItem(item))}
            </div>
          )
        })}
      </nav>

      {/* Settings */}
      {!collapsed && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <Link href="/settings" className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <Settings size={16} />
            <span>{t('nav.settings')}</span>
          </Link>
        </div>
      )}
    </aside>
  )
}
