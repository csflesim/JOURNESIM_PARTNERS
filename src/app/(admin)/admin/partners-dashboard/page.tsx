import { Header } from '@/components/layout/header'

export default function PartnersDashboardPage() {
  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      <Header breadcrumb={['代理商模組', '儀表板']} />
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        代理商模組儀表板（建置中）
      </div>
    </div>
  )
}
