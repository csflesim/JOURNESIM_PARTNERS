'use client'

import { Header } from '@/components/layout/header'
import { AgentProductTable } from '@/components/plans/agent-product-table'
import { useLanguage } from '@/components/language-provider'

export default function PartnerAccelPlansPage() {
  const { t } = useLanguage()
  return (
    <>
      <Header breadcrumb={[t('breadcrumb.plans'), t('breadcrumb.accel')]} />
      <div className="p-6">
        <AgentProductTable queryParam="acceleration=true" />
      </div>
    </>
  )
}
