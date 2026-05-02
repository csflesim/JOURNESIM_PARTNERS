import { Header } from '@/components/layout/header'

export default function SaleSimOrderCreatePage() {
  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      <Header breadcrumb={['銷售模組', 'SIM 卡訂單', '創建訂單']} />
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        創建銷售 SIM 卡訂單（建置中）
      </div>
    </div>
  )
}
