import { Header } from '@/components/layout/header'

export default function PurchaseDashboardPage() {
  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      <Header breadcrumb={['採購模組', '儀表板']} />
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        採購模組儀表板（建置中）
      </div>
    </div>
  )
}
