'use client'

import { Header } from '@/components/layout/header'
import { AgentProductTable } from '@/components/plans/agent-product-table'
import { useLanguage } from '@/components/language-provider'

const ESIM_TYPES = ['110', '111', '3105', '3106']

export default function PartnerEsimPlansPage() {
  const { t } = useLanguage()
  return (
    <>
      <Header breadcrumb={[t('breadcrumb.plans'), t('breadcrumb.esim')]} />
      <div className="p-6">
        <AgentProductTable queryParam={`types=${ESIM_TYPES.join(',')}`} />
      </div>
    </>
  )
}
