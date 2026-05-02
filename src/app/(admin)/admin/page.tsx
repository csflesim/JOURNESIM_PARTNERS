'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { useLanguage } from '@/components/language-provider'
import { Package, ShoppingCart, Users, RefreshCw } from 'lucide-react'

export default function DashboardPage() {
  const { t } = useLanguage()
  const [balance, setBalance] = useState<string>('')
  const [currency, setCurrency] = useState('')
  const [stats, setStats] = useState({ products: 0, orders: 0, agents: 0 })

  function fetchBalance() {
    setBalance('')
    fetch('/api/admin/balance').then(r => r.json()).then(d => {
      setBalance(d.balance)
      setCurrency(d.currency)
    })
  }

  useEffect(() => {
    fetchBalance()
    fetch('/api/admin/stats').then(r => r.json()).then(d => setStats(d)).catch(() => {})
  }, [])

  const cards = [
    { label: t('dash.totalProducts'), value: stats.products, icon: <Package size={20} className="text-indigo-600 dark:text-indigo-400" />, bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
    { label: t('dash.totalOrders'),   value: stats.orders,   icon: <ShoppingCart size={20} className="text-green-600 dark:text-green-400" />,  bg: 'bg-green-50 dark:bg-green-900/30' },
    { label: t('dash.totalAgents'),   value: stats.agents,   icon: <Users size={20} className="text-orange-600 dark:text-orange-400" />, bg: 'bg-orange-50 dark:bg-orange-900/30' },
  ]

  return (
    <>
      <Header
        breadcrumb={[t('dash.title')]}
        balance={balance ? `${currency} ${balance}` : undefined}
      />
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{t('dash.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('dash.welcome')}</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {cards.map(card => (
            <div key={card.label} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">{card.label}</span>
                <div className={`p-2 rounded-lg ${card.bg}`}>{card.icon}</div>
              </div>
              <div className="mt-3 text-2xl font-bold text-gray-800 dark:text-gray-100">{card.value}</div>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('dash.bcBalance')}</span>
            <button onClick={fetchBalance} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 dark:text-gray-500">
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            {balance
              ? <>{currency} <span>{balance}</span></>
              : <span className="text-gray-400 dark:text-gray-500 text-lg">{t('common.loading')}</span>
            }
          </div>
        </div>
      </div>
    </>
  )
}
