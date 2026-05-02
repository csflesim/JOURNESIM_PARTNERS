'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { X, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { productImageUrl } from '@/lib/products'
import type { Product } from '@/lib/products'

type Lang = 'zh' | 'en'

const T = {
  zh: { esim: 'eSIM', sim: 'SIM 卡', from: '起價', currency: 'NT$', noPlans: '暫無此類型方案', loading: '載入中…' },
  en: { esim: 'eSIM', sim: 'SIM Card', from: 'From', currency: 'NT$', noPlans: 'No plans available', loading: 'Loading…' },
}

export function CountryModal({
  iso,
  nameZh,
  nameEn,
  lang = 'zh',
  onClose,
}: {
  iso: string
  nameZh: string
  nameEn: string
  lang?: Lang
  onClose: () => void
}) {
  const t = T[lang]
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/products?iso=${iso}`)
      .then(r => r.json())
      .then(data => { if (data.success) setProducts(data.products) })
      .finally(() => setLoading(false))
  }, [iso])

  const esimProducts = products.filter(p => p.kind === 'esim')
  const simProducts  = products.filter(p => p.kind === 'sim')
  const [tab, setTab] = useState<'esim' | 'sim'>('esim')
  const shown = tab === 'esim' ? esimProducts : simProducts

  // Escape key close
  useEffect(() => {
    function h(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const countryName = lang === 'zh' ? nameZh : nameEn

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{countryName}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 flex-shrink-0">
          {(['esim', 'sim'] as const).map(k => {
            const has = k === 'esim' ? esimProducts.length > 0 : simProducts.length > 0
            if (!has) return null
            return (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={clsx(
                  'px-5 py-2 rounded-full text-sm font-semibold transition-all',
                  tab === k
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                )}
              >
                {k === 'esim' ? t.esim : t.sim}
              </button>
            )
          })}
        </div>

        {/* Product list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-10">{t.loading}</p>
          ) : shown.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">{t.noPlans}</p>
          ) : shown.map(product => {
            const minPrice = Math.min(
              ...product.dailyPlans.map(d => d.pricePerDay),
              ...product.fixedPlans.map(f => f.price)
            )
            return (
              <Link
                key={product.id}
                href={`/shop/${iso}/${product.id}`}
                onClick={onClose}
                className="flex items-center gap-4 bg-gray-50 rounded-2xl p-3 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all"
              >
                <div className="w-28 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-200">
                  <Image
                    src={productImageUrl(product.imageQuery, 224, 160)}
                    alt={lang === 'zh' ? product.nameZh : product.nameEn}
                    width={112}
                    height={80}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 text-sm mb-1">
                    {lang === 'zh' ? product.nameZh : product.nameEn}
                  </div>
                  <div className="text-xs text-gray-400">
                    {t.from} {t.currency}{minPrice}
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
