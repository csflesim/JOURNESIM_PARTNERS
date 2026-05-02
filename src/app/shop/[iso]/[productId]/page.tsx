'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { use } from 'react'
import {
  ArrowLeft, Minus, Plus, HelpCircle, ChevronDown,
  ChevronUp, Wifi, Shield, Headphones, Puzzle, Phone, MapPin,
  Check,
} from 'lucide-react'
import { clsx } from 'clsx'
import { flagUrl } from '@/lib/countries'
import { getProductById, productImageUrl, type DailyPlan, type FixedPlan } from '@/lib/products'
import { COUNTRIES } from '@/lib/countries'

type Lang = 'zh' | 'en'

const T = {
  zh: {
    back: '返回',
    daily: '日費套餐',
    fixed: '固定套餐',
    selectSpeed: '選擇手機套餐',
    selectDays: '選擇天數',
    qty: '數量',
    total: '總計',
    buy: '立即購買',
    compat: '檢查 eSIM 相容性',
    coverage: '覆蓋範圍及網絡',
    viewAll: '查看全部',
    related: '更多適合於當前目的地的計劃',
    howTitle: '如何使用您的 eSIM？',
    howSteps: [
      { title: '選擇目的地與數據方案', sub: '您的裝置必須支援 eSIM 且已解鎖' },
      { title: '安裝您的 eSIM', sub: '可透過 App 安裝，或依照指示掃描 QR Code' },
      { title: '享受您的數據方案', sub: '抵達目的地後，方案將自動啟用' },
    ],
    advantagesTitle: '在 {country} 使用 FLESIM eSIM 的優勢',
    advantages: [
      { title: '穩定的網路連線', desc: '無論身在何處，都能享受最快、最穩定的網路連線。' },
      { title: '避免漫遊費用', desc: '告別隱藏費用，出發前即可清楚知道數據費用' },
      { title: '24/7 客戶服務', desc: '我們全年無休為您解答問題，確保您隨時保持連線。' },
      { title: '安裝簡單', desc: '準備好聰明旅行了嗎？下載 App，選擇方案並安裝 eSIM，落地即可上網。' },
      { title: '保留原本門號', desc: '使用原本的門號通話與傳訊，無論身在何處都能與親友保持聯繫。' },
      { title: '本地與區域方案', desc: '不論旅程走到哪，選擇本地或區域 eSIM，暢遊無限制。' },
    ],
    faqTitle: 'FLESIM {country} eSIM 常見問題',
    faqs: [
      { q: '什麼是 eSIM？', a: 'eSIM（嵌入式 SIM）是一種數位化的 SIM 卡，直接內建於手機中，無需插入實體 SIM 卡即可連接行動網路。' },
      { q: 'FLESIM 的 eSIM 是否支援我的裝置？', a: 'iPhone XS 及後續機型、Google Pixel 3 及後續機型，以及多款三星 Galaxy 旗艦機型均支援 eSIM。' },
      { q: '如何使用 FLESIM 的 eSIM？', a: '購買後您將收到 QR Code，掃描安裝後抵達目的地即可自動連線。' },
      { q: '如果我需要更多流量或天數，可以為 eSIM 充值嗎？', a: '目前 eSIM 方案到期後需重新購買，我們正在開發補充包功能，敬請期待。' },
    ],
    currency: 'NT$',
    perDay: '/日',
    days: '天',
    gb: 'GB',
    noProduct: '找不到此商品',
  },
  en: {
    back: 'Back',
    daily: 'Daily Plan',
    fixed: 'Fixed Plan',
    selectSpeed: 'Choose Data Speed',
    selectDays: 'Choose Days',
    qty: 'Quantity',
    total: 'Total',
    buy: 'Buy Now',
    compat: 'Check eSIM Compatibility',
    coverage: 'Coverage & Networks',
    viewAll: 'View All',
    related: 'More plans for this destination',
    howTitle: 'How to Use Your eSIM?',
    howSteps: [
      { title: 'Choose destination & data plan', sub: 'Your device must support eSIM and be unlocked' },
      { title: 'Install your eSIM', sub: 'Install via App or scan QR Code as instructed' },
      { title: 'Enjoy your data plan', sub: 'Plan activates automatically upon arrival' },
    ],
    advantagesTitle: 'Why Use FLESIM eSIM in {country}',
    advantages: [
      { title: 'Stable Connection', desc: 'Enjoy the fastest, most stable network wherever you are.' },
      { title: 'No Roaming Fees', desc: 'No hidden charges — know your data cost before you travel.' },
      { title: '24/7 Customer Support', desc: "We're available around the clock to keep you connected." },
      { title: 'Easy Setup', desc: 'Download the app, pick a plan, install eSIM — connected on arrival.' },
      { title: 'Keep Your Number', desc: 'Use your home number for calls & texts while using FLESIM data.' },
      { title: 'Local & Regional Plans', desc: 'Choose local or regional eSIM for unlimited travel freedom.' },
    ],
    faqTitle: 'FLESIM {country} eSIM FAQ',
    faqs: [
      { q: 'What is an eSIM?', a: 'An eSIM is a digital SIM built into your device, letting you connect without a physical SIM card.' },
      { q: 'Does FLESIM eSIM support my device?', a: 'iPhone XS+, Google Pixel 3+, and many Samsung Galaxy flagships support eSIM.' },
      { q: 'How do I use FLESIM eSIM?', a: 'After purchase you receive a QR Code. Scan to install, then it auto-activates on arrival.' },
      { q: 'Can I top up if I need more data or days?', a: 'Currently you need to repurchase after expiry. A top-up feature is coming soon.' },
    ],
    currency: 'NT$',
    perDay: '/day',
    days: 'd',
    gb: 'GB',
    noProduct: 'Product not found',
  },
}

const ADVANTAGE_ICONS = [
  <Shield size={22} className="text-indigo-500" key="shield" />,
  <MapPin size={22} className="text-indigo-500" key="map" />,
  <Headphones size={22} className="text-indigo-500" key="phone" />,
  <Puzzle size={22} className="text-indigo-500" key="puzzle" />,
  <Phone size={22} className="text-indigo-500" key="phone2" />,
  <Wifi size={22} className="text-indigo-500" key="wifi" />,
]

// ── Days horizontal picker (mobile-style) ─────────────────────────────
function DaysPicker({ value, onChange }: { value: number; onChange: (d: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const days = Array.from({ length: 30 }, (_, i) => i + 1)

  return (
    <div
      ref={containerRef}
      className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
      style={{ scrollbarWidth: 'none' }}
    >
      {days.map(d => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={clsx(
            'flex-shrink-0 w-10 h-10 rounded-full text-sm font-semibold transition-all border',
            value === d
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
              : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
          )}
        >
          {d}
        </button>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
export default function ProductPage({
  params,
}: {
  params: Promise<{ iso: string; productId: string }>
}) {
  const { iso, productId } = use(params)
  const [lang] = useState<Lang>('zh')
  const [planType, setPlanType] = useState<'daily' | 'fixed'>('daily')
  const [selectedSpeed, setSelectedSpeed] = useState<string>('')
  const [selectedDays, setSelectedDays] = useState(1)
  const [selectedFixed, setSelectedFixed] = useState<string>('')
  const [qty, setQty] = useState(1)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const t = T[lang]
  const product = getProductById(productId)
  const country = COUNTRIES.find(c => c.iso === iso)

  if (!product || !country) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        {t.noProduct}
      </div>
    )
  }

  // Init defaults
  if (!selectedSpeed && product.dailyPlans.length > 0) {
    setSelectedSpeed(product.dailyPlans[0].speedKey)
  }
  if (!selectedFixed && product.fixedPlans.length > 0) {
    setSelectedFixed(product.fixedPlans[0].id)
  }

  const countryName = lang === 'zh' ? country.zh : country.en
  const productName = lang === 'zh' ? product.nameZh : product.nameEn

  // Compute total price
  let unitPrice = 0
  if (planType === 'daily') {
    const sp = product.dailyPlans.find(d => d.speedKey === selectedSpeed)
    unitPrice = sp ? sp.pricePerDay * selectedDays : 0
  } else {
    const fp = product.fixedPlans.find(f => f.id === selectedFixed)
    unitPrice = fp ? fp.price : 0
  }
  const total = unitPrice * qty

  const imageUrl = productImageUrl(product.imageQuery)
  const advantagesTitle = t.advantagesTitle.replace('{country}', countryName)
  const faqTitle = t.faqTitle.replace('{country}', countryName)

  return (
    <div className="min-h-screen bg-white">
      {/* ── Simple top bar ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/shop" className="p-1.5 -ml-1.5 text-gray-600 hover:text-gray-900">
            <ArrowLeft size={20} />
          </Link>
          <span className="text-sm font-semibold text-gray-800 truncate">{productName}</span>
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* Left: scenic image */}
          <div className="lg:w-[420px] flex-shrink-0">
            <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100 sticky top-20">
              <Image
                src={imageUrl}
                alt={productName}
                width={840}
                height={630}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
          </div>

          {/* Right: plan selector */}
          <div className="flex-1 min-w-0">
            {/* Product title + flag */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-100 flex-shrink-0">
                <Image src={flagUrl(iso)} alt={countryName} width={32} height={32} className="w-full h-full object-cover" unoptimized />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{productName}</h1>
            </div>

            {/* Plan type tabs */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                {(['daily', 'fixed'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setPlanType(tab)}
                    className={clsx(
                      'px-5 py-2 rounded-lg text-sm font-semibold transition-all',
                      planType === tab
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    {tab === 'daily' ? t.daily : t.fixed}
                  </button>
                ))}
              </div>
              <button className="text-gray-400 hover:text-gray-600 ml-1" title="Help">
                <HelpCircle size={18} />
              </button>
            </div>

            {/* ── Daily plan UI ── */}
            {planType === 'daily' && (
              <div className="space-y-6">
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-3">{t.selectSpeed}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {product.dailyPlans.map((plan: DailyPlan) => (
                      <button
                        key={plan.speedKey}
                        onClick={() => setSelectedSpeed(plan.speedKey)}
                        className={clsx(
                          'px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all',
                          selectedSpeed === plan.speedKey
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        )}
                      >
                        {plan.speedLabel}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-6">
                  {/* Days selector */}
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-700 mb-3">{t.selectDays}</div>
                    {/* Desktop: simple dropdown */}
                    <div className="hidden sm:block">
                      <div className="relative">
                        <select
                          value={selectedDays}
                          onChange={e => setSelectedDays(Number(e.target.value))}
                          className="w-full appearance-none border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 bg-white pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        >
                          {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
                            <option key={d} value={d}>{d} {t.days}</option>
                          ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    {/* Mobile: horizontal scroll picker */}
                    <div className="sm:hidden">
                      <DaysPicker value={selectedDays} onChange={setSelectedDays} />
                    </div>
                  </div>

                  {/* Quantity */}
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-3">{t.qty}</div>
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setQty(q => Math.max(1, q - 1))}
                        className="w-12 h-12 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-12 text-center text-sm font-semibold text-gray-800">{qty}</span>
                      <button
                        onClick={() => setQty(q => q + 1)}
                        className="w-12 h-12 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Fixed plan UI ── */}
            {planType === 'fixed' && (
              <div className="space-y-6">
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-3">{t.selectSpeed}</div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {product.fixedPlans.map((plan: FixedPlan) => (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedFixed(plan.id)}
                        className={clsx(
                          'flex items-center justify-between px-4 py-4 rounded-xl border-2 transition-all text-left',
                          selectedFixed === plan.id
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={clsx(
                            'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                            selectedFixed === plan.id ? 'border-indigo-600' : 'border-gray-300'
                          )}>
                            {selectedFixed === plan.id && (
                              <div className="w-2 h-2 rounded-full bg-indigo-600" />
                            )}
                          </div>
                          <div>
                            <div className={clsx('font-bold text-sm', selectedFixed === plan.id ? 'text-indigo-700' : 'text-gray-800')}>
                              {plan.gb} {t.gb}
                            </div>
                            <div className="text-xs text-gray-400">{plan.days} {t.days}</div>
                          </div>
                        </div>
                        <div className={clsx('text-sm font-bold', selectedFixed === plan.id ? 'text-indigo-700' : 'text-gray-700')}>
                          {t.currency}{plan.price}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-3">{t.qty}</div>
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden w-fit">
                    <button
                      onClick={() => setQty(q => Math.max(1, q - 1))}
                      className="w-12 h-12 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-12 text-center text-sm font-semibold text-gray-800">{qty}</span>
                    <button
                      onClick={() => setQty(q => q + 1)}
                      className="w-12 h-12 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Total + Buy */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-gray-600">{t.total}</span>
                <span className="text-2xl font-bold text-gray-900">
                  {t.currency} <span className="text-indigo-600">{total.toLocaleString()}</span>
                </span>
              </div>
              <button className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-base hover:opacity-90 transition-opacity shadow-lg shadow-indigo-200">
                {t.buy}
              </button>
              <button className="w-full mt-3 py-3 text-sm text-indigo-600 hover:underline">
                {t.compat}
              </button>
            </div>

            {/* Features list */}
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              {/* Coverage */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">{t.coverage}：</span>
                <div className="w-5 h-5 rounded-full overflow-hidden border border-gray-100 inline-block">
                  <Image src={flagUrl(iso)} alt={countryName} width={20} height={20} className="w-full h-full object-cover" unoptimized />
                </div>
                <button className="text-indigo-600 hover:underline text-sm font-medium">
                  {t.viewAll} ({product.coverageCount})
                </button>
              </div>
              {product.features.map((f, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{lang === 'zh' ? f.zh : f.en}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Related products ───────────────────────────────────────── */}
      {product.relatedIsos.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="bg-gray-50 rounded-3xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{t.related}</h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {product.relatedIsos.map(relIso => {
                const relCountry = COUNTRIES.find(c => c.iso === relIso)
                if (!relCountry) return null
                return (
                  <Link
                    key={relIso}
                    href={`/shop/${relIso}`}
                    className="flex-shrink-0 w-52 bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow"
                  >
                    <div className="h-28 bg-gray-100">
                      <Image
                        src={productImageUrl(relCountry.en, 400, 224)}
                        alt={relCountry.en}
                        width={400}
                        height={224}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 rounded-full overflow-hidden border border-gray-100 flex-shrink-0">
                          <Image src={flagUrl(relIso)} alt={relCountry.en} width={20} height={20} className="w-full h-full object-cover" unoptimized />
                        </div>
                        <span className="text-sm font-semibold text-gray-800">
                          {lang === 'zh' ? relCountry.zh : relCountry.en} eSIM
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {t.currency}25{lang === 'zh' ? ' 起' : '+'}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── How to use ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-gray-50 rounded-3xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-8 text-center">{t.howTitle}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {t.howSteps.map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-200">
                  {i + 1}
                </div>
                <div className="font-semibold text-gray-900 mb-2">{step.title}</div>
                <div className="text-sm text-gray-500">{step.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Advantages ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-gray-50 rounded-3xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-8 text-center">{advantagesTitle}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {t.advantages.map((adv, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="mb-3">{ADVANTAGE_ICONS[i]}</div>
                <div className="font-semibold text-gray-900 mb-2">{adv.title}</div>
                <div className="text-sm text-gray-500 leading-relaxed">{adv.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FAQ ────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">{faqTitle}</h2>
        <div className="grid sm:grid-cols-2 gap-3 max-w-4xl mx-auto">
          {t.faqs.map((faq, i) => (
            <div
              key={i}
              className={clsx(
                'border rounded-xl overflow-hidden',
                openFaq === i ? 'border-indigo-200' : 'border-gray-200'
              )}
            >
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span className="text-sm font-semibold text-gray-900 pr-4">{i + 1}. {faq.q}</span>
                {openFaq === i
                  ? <ChevronUp size={15} className="text-indigo-500 flex-shrink-0" />
                  : <ChevronDown size={15} className="text-gray-400 flex-shrink-0" />}
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer spacer ──────────────────────────────────────────── */}
      <div className="h-20" />

      {/* ── Mobile sticky bottom bar ───────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex items-center justify-between md:hidden shadow-xl z-40">
        <div>
          <div className="text-xs text-gray-400">{t.total}</div>
          <div className="text-lg font-bold text-indigo-600">{t.currency}{total.toLocaleString()}</div>
        </div>
        <button className="px-8 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-sm hover:opacity-90 transition-opacity">
          {t.buy}
        </button>
      </div>
    </div>
  )
}
