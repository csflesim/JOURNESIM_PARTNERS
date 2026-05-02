'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Plus, Pencil, Trash2, Eye, EyeOff, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { PRODUCTS, type Product } from '@/lib/products'
import { COUNTRIES } from '@/lib/countries'
import { clsx } from 'clsx'

export default function SaleProductsSimPage() {
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState(
    PRODUCTS.filter(p => p.kind === 'sim').map(p => ({ ...p, enabled: true }))
  )
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const country = (iso: string) => COUNTRIES.find(c => c.iso === iso)
  const filtered = search.trim()
    ? products.filter(p =>
        p.nameZh.includes(search) ||
        p.nameEn.toLowerCase().includes(search.toLowerCase()) ||
        p.iso.includes(search.toLowerCase())
      )
    : products

  function toggleEnabled(id: string) {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p))
  }

  function toggleExpanded(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function minPrice(p: Product) {
    const min = p.fixedPlans.length > 0 ? Math.min(...p.fixedPlans.map(f => f.price)) : null
    return min == null ? '—' : `NT$${min}`
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      <Header breadcrumb={['銷售模組', '商品管理', 'SIM 商品']} />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 w-72">
            <Search size={15} className="text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜尋商品…"
              className="flex-1 text-sm bg-transparent outline-none text-gray-700 dark:text-gray-300 placeholder-gray-400"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
            <Plus size={15} />
            新增商品
          </button>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 w-8" />
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">商品名稱</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">國家／地區</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">套餐數量</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">起售價</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">狀態</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product, i) => {
                const c = country(product.iso)
                const isExpanded = expanded.has(product.id)
                const isLast = i === filtered.length - 1

                return (
                  <>
                    <tr
                      key={product.id}
                      className={clsx(
                        'border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer',
                        isLast && !isExpanded && 'border-b-0'
                      )}
                      onClick={() => toggleExpanded(product.id)}
                    >
                      <td className="px-4 py-3.5 text-gray-400">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-gray-900 dark:text-white">{product.nameZh}</div>
                        <div className="text-xs text-gray-400">{product.nameEn}</div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300">
                        {c ? `${c.zh} (${product.iso.toUpperCase()})` : product.iso.toUpperCase()}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300">
                        {product.fixedPlans.length} 種
                      </td>
                      <td className="px-4 py-3.5 text-gray-700 dark:text-gray-300 font-medium">
                        {minPrice(product)}
                      </td>
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <span className={clsx(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                          product.enabled
                            ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        )}>
                          <span className={clsx('w-1.5 h-1.5 rounded-full', product.enabled ? 'bg-green-500' : 'bg-gray-400')} />
                          {product.enabled ? '上架中' : '已下架'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleEnabled(product.id)}
                            title={product.enabled ? '下架' : '上架'}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                          >
                            {product.enabled ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                          <button
                            title="編輯"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            title="刪除"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded plan details */}
                    {isExpanded && (
                      <tr key={`${product.id}-plans`} className={clsx(
                        'border-b border-gray-50 dark:border-gray-800 bg-indigo-50/40 dark:bg-indigo-900/10',
                        isLast && 'border-b-0'
                      )}>
                        <td colSpan={7} className="px-8 py-4">
                          <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2">套餐列表</div>
                          <div className="flex flex-wrap gap-2">
                            {product.fixedPlans.map(plan => (
                              <div key={plan.id} className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {plan.gb >= 99 ? '無限' : `${plan.gb}GB`}/{plan.days}天
                                </span>
                                <span className="text-gray-400">·</span>
                                <span className="text-gray-600 dark:text-gray-400">NT${plan.price}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-gray-400">找不到符合的商品</div>
          )}
        </div>
      </div>
    </div>
  )
}
