'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { ProductTable, Product } from '@/components/plans/product-table'
import { useLanguage } from '@/components/language-provider'

export default function AccelerationPlansPage() {
  const { t } = useLanguage()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchProducts() {
    const res = await fetch('/api/admin/products?acceleration=true')
    const data = await res.json()
    setProducts(data.products ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchProducts() }, [])

  async function handleSync() {
    const res = await fetch('/api/admin/sync-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ salesMethod: '5' }),
    })
    const data = await res.json()
    alert(data.message)
    if (data.success) fetchProducts()
  }

  async function handleToggleActive(skuId: string, active: boolean) {
    await fetch('/api/admin/products/toggle', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skuId, isActive: active }),
    })
    fetchProducts()
  }

  return (
    <>
      <Header breadcrumb={[t('breadcrumb.plans'), t('breadcrumb.accel')]} />
      <div className="p-6">
        {loading ? (
          <div className="text-sm text-gray-400">{t('common.loading')}</div>
        ) : (
          <ProductTable products={products} onSync={handleSync} onToggleActive={handleToggleActive} />
        )}
      </div>
    </>
  )
}
