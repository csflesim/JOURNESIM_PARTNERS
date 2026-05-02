import { Header } from '@/components/layout/header'

export default function SalePlansSimPage() {
  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      <Header breadcrumb={['銷售模組', '套餐列表', 'SIM 套餐']} />
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        SIM 套餐列表（建置中）
      </div>
    </div>
  )
}
