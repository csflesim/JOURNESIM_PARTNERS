'use client'

import { Header } from '@/components/layout/header'
import { AgentProductTable } from '@/components/plans/agent-product-table'
import { useLanguage } from '@/components/language-provider'

const SIM_TYPES = ['110', '111', '210', '211', '212', '220', '221', '311', '3101', '3102', '3103', '3104', '3201', '3202', '3211', '3212']

export default function PartnerSimPlansPage() {
  const { t } = useLanguage()
  return (
    <>
      <Header breadcrumb={[t('breadcrumb.plans'), t('breadcrumb.sim')]} />
      <div className="p-6">
        <AgentProductTable queryParam={`types=${SIM_TYPES.join(',')}`} />
      </div>
    </>
  )
}
