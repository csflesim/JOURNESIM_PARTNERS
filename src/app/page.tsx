'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Globe, Wifi, Shield, Zap, Clock, Headphones,
  ChevronDown, ChevronUp, Search, Menu, X,
  Star, ArrowRight, Smartphone, Check,
} from 'lucide-react'
import { clsx } from 'clsx'
import { COUNTRIES, flagUrl } from '@/lib/countries'
import { CountryModal } from '@/components/country-modal'

// ── Types ──────────────────────────────────────────────────────────────
type Lang = 'zh' | 'en'

// ── i18n ───────────────────────────────────────────────────────────────
const copy = {
  zh: {
    nav: {
      esim: 'eSIM',
      how: '如何使用',
      about: '關於我們',
      support: '支援中心',
      signIn: '登入',
      signUp: '立即購買',
    },
    hero: {
      tag: '全球 eSIM 連線解決方案',
      title: '出門在外，\n隨時保持連線',
      sub: '即時啟用・覆蓋 190+ 國家與地區・告別高額漫遊費',
      searchPlaceholder: '搜尋目的地，例如：日本、美國…',
      cta: '查看所有方案',
    },
    dest: {
      title: '選擇目的地',
      sub: '找到最適合你旅程的 eSIM 方案',
      local: '單一國家',
      regional: '區域方案',
      from: '起',
      viewAll: '查看全部目的地',
      currency: 'NT$',
    },
    how: {
      title: '如何使用 FLESIM',
      sub: '三步驟，輕鬆啟用全球網路',
      steps: [
        {
          num: '01',
          title: '選擇方案',
          desc: '依目的地、天數與流量需求，挑選最合適的 eSIM 方案。',
        },
        {
          num: '02',
          title: '掃描安裝',
          desc: '購買後立即取得 QR Code，用手機掃描即可完成安裝，無需更換實體 SIM 卡。',
        },
        {
          num: '03',
          title: '開啟連線',
          desc: '抵達目的地後自動連線，馬上享有高速網路，輕鬆分享 Wi-Fi。',
        },
      ],
    },
    why: {
      title: '為什麼選擇 FLESIM',
      sub: '我們讓旅行連線變得更簡單、更划算',
      features: [
        { icon: 'zap', title: '即時啟用', desc: '掃描 QR Code，數分鐘內完成設定，無需等待實體卡片寄送。' },
        { icon: 'globe', title: '190+ 國家覆蓋', desc: '覆蓋全球超過 190 個國家與地區，一卡走遍天下。' },
        { icon: 'shield', title: '安全加密', desc: '所有連線均經過加密保護，確保資料安全與隱私。' },
        { icon: 'wifi', title: '高速 4G/5G', desc: '與當地頂級電信商合作，提供穩定的 4G/5G 高速網路體驗。' },
        { icon: 'clock', title: '彈性方案', desc: '提供 1 天至 30 天、1 GB 至無限流量等多種組合選擇。' },
        { icon: 'headphones', title: '24/7 客服', desc: '全天候中英文客服支援，旅途中遇到問題隨時為你解決。' },
      ],
    },
    testimonials: {
      title: '旅客真實評價',
      sub: '超過 50,000 名旅客信賴 FLESIM',
    },
    faq: {
      title: '常見問題',
      sub: '找不到答案？歡迎聯繫我們的客服團隊',
      items: [
        {
          q: '什麼是 eSIM？',
          a: 'eSIM（嵌入式 SIM）是一種數位化的 SIM 卡，直接內建於手機中，無需插入實體 SIM 卡即可連接行動網路。目前多數新款 iPhone 與 Android 旗艦機均支援 eSIM。',
        },
        {
          q: '如何確認我的手機支援 eSIM？',
          a: 'iPhone XS 及後續機型、Google Pixel 3 及後續機型，以及多款三星 Galaxy 旗艦機型均支援 eSIM。您可以在手機設定中查詢「行動數據」或「SIM 卡」相關選項來確認。',
        },
        {
          q: '購買後什麼時候可以收到 eSIM？',
          a: '完成付款後，系統將立即寄送 QR Code 至您的電子郵件信箱，整個過程通常在 5 分鐘內完成，全天候 24 小時均可購買。',
        },
        {
          q: 'eSIM 可以與現有 SIM 卡同時使用嗎？',
          a: '可以。大多數支援 eSIM 的手機均支援雙 SIM 卡（一實體 + 一 eSIM），您可以保留原有號碼接收電話/簡訊，同時使用 FLESIM 的數據流量。',
        },
        {
          q: '方案到期後流量沒用完怎麼辦？',
          a: '方案到期後，未使用的流量將自動失效，恕不退款或轉移。建議依照行程天數選擇合適的方案，或購買可加購流量的彈性方案。',
        },
        {
          q: '在哪些國家可以使用？',
          a: 'FLESIM 目前覆蓋超過 190 個國家與地區，包含亞洲、歐洲、美洲、中東及非洲等地區。詳細覆蓋清單請查看各方案的說明頁面。',
        },
        {
          q: '如果連線速度過慢或無法連線怎麼辦？',
          a: '請先確認已在手機設定中啟用 eSIM，並開啟數據漫遊功能。若仍有問題，請聯繫我們的 24/7 客服，我們將協助您快速排除問題。',
        },
        {
          q: '支援哪些付款方式？',
          a: '目前支援信用卡（Visa、Mastercard、JCB）及多種電子支付方式。所有交易均透過安全加密的支付閘道處理，確保金融資料安全。',
        },
        {
          q: '可以申請退款嗎？',
          a: '若 eSIM 尚未被掃描安裝，您可在購買後 24 小時內申請全額退款。一旦 QR Code 已被掃描啟用，則視為已使用，恕不受理退款申請。',
        },
        {
          q: 'eSIM 可以重複安裝到不同手機嗎？',
          a: '每張 eSIM QR Code 僅能安裝一次，且只能在一台裝置上使用。如需在新手機上使用，請重新購買新的 eSIM 方案。',
        },
      ],
    },
    app: {
      title: '隨時隨地管理你的 eSIM',
      sub: '下載 FLESIM App，輕鬆查看流量、管理方案、一鍵購買補充包',
      ios: 'App Store 下載',
      android: 'Google Play 下載',
    },
    footer: {
      tagline: '全球旅行連線，從未如此簡單。',
      resources: '資源中心',
      partner: '合作夥伴',
      company: '關於我們',
      resourcesLinks: ['使用教學', '相容裝置', '覆蓋地圖', 'API 文件'],
      partnerLinks: ['成為代理商', '企業方案', '聯盟行銷', '批發購買'],
      companyLinks: ['品牌故事', '媒體中心', '職缺招募', '聯絡我們'],
      rights: '© 2025 FLESIM. 版權所有。',
      privacy: '隱私政策',
      terms: '服務條款',
    },
  },
  en: {
    nav: {
      esim: 'eSIM',
      how: 'How It Works',
      about: 'About',
      support: 'Support',
      signIn: 'Sign In',
      signUp: 'Buy Now',
    },
    hero: {
      tag: 'Global eSIM Connectivity',
      title: 'Stay Connected\nAnywhere in the World',
      sub: 'Instant activation · 190+ countries & regions · No roaming fees',
      searchPlaceholder: 'Search your destination, e.g. Japan, USA…',
      cta: 'View All Plans',
    },
    dest: {
      title: 'Choose Your Destination',
      sub: 'Find the perfect eSIM plan for your journey',
      local: 'Local',
      regional: 'Regional',
      from: 'From',
      viewAll: 'View All Destinations',
      currency: 'NT$',
    },
    how: {
      title: 'How FLESIM Works',
      sub: 'Three simple steps to stay connected globally',
      steps: [
        {
          num: '01',
          title: 'Choose a Plan',
          desc: 'Select the best eSIM plan based on your destination, travel duration, and data needs.',
        },
        {
          num: '02',
          title: 'Scan & Install',
          desc: 'Receive your QR Code instantly after purchase. Scan it to install — no physical SIM swap needed.',
        },
        {
          num: '03',
          title: 'Connect & Go',
          desc: 'Your eSIM activates automatically upon arrival. Enjoy high-speed data and share your hotspot.',
        },
      ],
    },
    why: {
      title: 'Why Choose FLESIM',
      sub: 'We make travel connectivity simpler and more affordable',
      features: [
        { icon: 'zap', title: 'Instant Activation', desc: 'Scan a QR Code and get connected in minutes — no waiting for a physical card.' },
        { icon: 'globe', title: '190+ Countries', desc: 'Coverage in over 190 countries and regions worldwide — one plan for every trip.' },
        { icon: 'shield', title: 'Secure & Encrypted', desc: 'All connections are encrypted to keep your data safe and your privacy protected.' },
        { icon: 'wifi', title: '4G/5G Speed', desc: 'Partnered with top local carriers to deliver fast and stable 4G/5G data experience.' },
        { icon: 'clock', title: 'Flexible Plans', desc: 'From 1 day to 30 days, 1 GB to unlimited — mix and match to fit your journey.' },
        { icon: 'headphones', title: '24/7 Support', desc: 'Round-the-clock bilingual support ready to help you wherever you are in the world.' },
      ],
    },
    testimonials: {
      title: 'Trusted by Travelers',
      sub: 'Over 50,000 happy travelers choose FLESIM',
    },
    faq: {
      title: 'Frequently Asked Questions',
      sub: "Can't find your answer? Contact our support team.",
      items: [
        {
          q: 'What is an eSIM?',
          a: 'An eSIM (embedded SIM) is a digital SIM built into your phone, allowing you to connect to mobile networks without a physical SIM card. Most modern iPhones and flagship Android devices support eSIM.',
        },
        {
          q: 'How do I know if my phone supports eSIM?',
          a: 'iPhone XS and later, Google Pixel 3 and later, and many Samsung Galaxy flagship models support eSIM. Check your phone settings under "Mobile Data" or "SIM Card" to confirm.',
        },
        {
          q: 'When will I receive my eSIM after purchase?',
          a: 'Your QR Code will be emailed to you instantly after payment — typically within 5 minutes, available 24/7.',
        },
        {
          q: 'Can I use eSIM alongside my existing SIM?',
          a: 'Yes. Most eSIM-compatible phones support dual SIM (one physical + one eSIM), so you can keep your home number for calls and SMS while using FLESIM data.',
        },
        {
          q: "What happens if I don't use all my data?",
          a: 'Unused data expires at the end of your plan period and cannot be refunded or transferred. We recommend choosing a plan that matches your travel duration.',
        },
        {
          q: 'Which countries are supported?',
          a: 'FLESIM covers 190+ countries and regions across Asia, Europe, the Americas, the Middle East, and Africa. See individual plan pages for detailed coverage.',
        },
        {
          q: "What if my connection is slow or doesn't work?",
          a: 'Ensure eSIM is enabled in your phone settings and data roaming is turned on. If the issue persists, contact our 24/7 support and we\'ll help you troubleshoot.',
        },
        {
          q: 'What payment methods are accepted?',
          a: 'We accept major credit cards (Visa, Mastercard, JCB) and various digital payment options. All transactions are processed through a secure, encrypted payment gateway.',
        },
        {
          q: 'Can I get a refund?',
          a: 'If the eSIM QR Code has not been scanned, you may request a full refund within 24 hours of purchase. Once activated, the eSIM is considered used and is non-refundable.',
        },
        {
          q: 'Can I install the eSIM on multiple devices?',
          a: 'Each eSIM QR Code can only be installed once and used on a single device. To use on a new device, please purchase a new eSIM plan.',
        },
      ],
    },
    app: {
      title: 'Manage Your eSIM Anytime, Anywhere',
      sub: 'Download the FLESIM app to monitor data usage, manage plans, and top up with one tap.',
      ios: 'Download on App Store',
      android: 'Get it on Google Play',
    },
    footer: {
      tagline: 'Global travel connectivity, made effortless.',
      resources: 'Resources',
      partner: 'Partner',
      company: 'Company',
      resourcesLinks: ['How to Use', 'Compatible Devices', 'Coverage Map', 'API Docs'],
      partnerLinks: ['Become a Reseller', 'Enterprise Plans', 'Affiliate Program', 'Wholesale'],
      companyLinks: ['Our Story', 'Press', 'Careers', 'Contact Us'],
      rights: '© 2025 FLESIM. All rights reserved.',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
    },
  },
} as const

// ── Destination data ───────────────────────────────────────────────────
const localDestinations = [
  { iso: 'jp', name: { zh: '日本', en: 'Japan' }, flag: '🇯🇵', price: 199, days: 5, gb: 1 },
  { iso: 'kr', name: { zh: '南韓', en: 'South Korea' }, flag: '🇰🇷', price: 189, days: 5, gb: 1 },
  { iso: 'us', name: { zh: '美國', en: 'USA' }, flag: '🇺🇸', price: 299, days: 7, gb: 3 },
  { iso: 'gb', name: { zh: '英國', en: 'UK' }, flag: '🇬🇧', price: 319, days: 7, gb: 3 },
  { iso: 'fr', name: { zh: '法國', en: 'France' }, flag: '🇫🇷', price: 329, days: 7, gb: 3 },
  { iso: 'th', name: { zh: '泰國', en: 'Thailand' }, flag: '🇹🇭', price: 159, days: 5, gb: 1 },
  { iso: 'sg', name: { zh: '新加坡', en: 'Singapore' }, flag: '🇸🇬', price: 179, days: 5, gb: 1 },
  { iso: 'au', name: { zh: '澳洲', en: 'Australia' }, flag: '🇦🇺', price: 349, days: 7, gb: 3 },
]

const regionalDestinations = [
  { iso: '', name: { zh: '亞洲 8 國', en: 'Asia 8 Countries' }, flag: '🌏', price: 349, days: 10, gb: 5 },
  { iso: '', name: { zh: '歐洲 30 國', en: 'Europe 30 Countries' }, flag: '🌍', price: 499, days: 10, gb: 5 },
  { iso: '', name: { zh: '北美 3 國', en: 'North America 3' }, flag: '🌎', price: 399, days: 10, gb: 5 },
  { iso: '', name: { zh: '東南亞 7 國', en: 'Southeast Asia 7' }, flag: '🌏', price: 299, days: 7, gb: 3 },
]

// ── Testimonials ───────────────────────────────────────────────────────
const testimonials = [
  { name: 'Sarah L.', country: { zh: '美國', en: 'USA' }, stars: 5, text: { zh: '在日本旅行時超好用！即時啟用、速度快，完全不需要找 Wi-Fi。強力推薦！', en: 'Used it in Japan — instant setup, blazing fast. Never needed to hunt for Wi-Fi. Highly recommend!' } },
  { name: '王小明', country: { zh: '台灣', en: 'Taiwan' }, stars: 5, text: { zh: '去歐洲自助旅行買了歐洲方案，30 國都能用，比買當地 SIM 卡方便太多了。', en: 'Bought the Europe plan for my backpacking trip — works in 30 countries, so much easier than local SIMs.' } },
  { name: 'Ryo T.', country: { zh: '日本', en: 'Japan' }, stars: 5, text: { zh: '客服回覆速度很快，安裝遇到問題馬上就解決了，服務非常好！', en: 'Support responded super fast when I had trouble installing. Excellent customer service!' } },
  { name: 'Emma K.', country: { zh: '澳洲', en: 'Australia' }, stars: 5, text: { zh: '價格合理、速度穩定，以後出國都會選 FLESIM！', en: 'Great price, stable speeds. FLESIM will be my go-to for all future international trips!' } },
]

// ── Feature icon helper ────────────────────────────────────────────────
function FeatureIcon({ icon }: { icon: string }) {
  const cls = 'text-indigo-600 dark:text-indigo-400'
  const size = 28
  switch (icon) {
    case 'zap':         return <Zap size={size} className={cls} />
    case 'globe':       return <Globe size={size} className={cls} />
    case 'shield':      return <Shield size={size} className={cls} />
    case 'wifi':        return <Wifi size={size} className={cls} />
    case 'clock':       return <Clock size={size} className={cls} />
    case 'headphones':  return <Headphones size={size} className={cls} />
    default:            return null
  }
}

// ── Logo ───────────────────────────────────────────────────────────────
function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const iconSize = size === 'lg' ? 48 : size === 'md' ? 36 : 28
  const textSize = size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-xl' : 'text-base'
  return (
    <div className="flex items-center gap-2">
      <svg width={iconSize} height={iconSize} viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="lg1" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4F8EF7" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="12" fill="url(#lg1)" />
        <path d="M14 16h20M14 24h14M14 32h8" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <circle cx="36" cy="30" r="7" fill="white" fillOpacity="0.15" stroke="white" strokeWidth="2" />
        <path d="M33 30l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={clsx('font-bold tracking-tight text-gray-900 dark:text-white', textSize)}>FLESIM</span>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════
export default function HomePage() {
  const [lang, setLang] = useState<Lang>('zh')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [destTab, setDestTab] = useState<'local' | 'regional'>('local')
  const [destModal, setDestModal] = useState<{ iso: string; zh: string; en: string } | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [heroScrolled, setHeroScrolled] = useState(false)
  const [heroSearch, setHeroSearch] = useState('')
  const [heroDropdown, setHeroDropdown] = useState(false)
  const heroInputRef = useRef<HTMLInputElement>(null)
  const heroDropdownRef = useRef<HTMLDivElement>(null)

  const T = copy[lang]

  useEffect(() => {
    function onScroll() { setHeroScrolled(window.scrollY > 60) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close hero dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        heroInputRef.current && !heroInputRef.current.contains(e.target as Node) &&
        heroDropdownRef.current && !heroDropdownRef.current.contains(e.target as Node)
      ) {
        setHeroDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const heroResults = heroSearch.trim()
    ? COUNTRIES.filter(c =>
        c.en.toLowerCase().includes(heroSearch.toLowerCase()) ||
        c.zh.includes(heroSearch)
      ).slice(0, 6)
    : []

  const destinations = destTab === 'local' ? localDestinations : regionalDestinations
  const filteredDest = destinations

  return (
    <>
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── Navbar ──────────────────────────────────────────────────── */}
      <header className={clsx(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        heroScrolled
          ? 'bg-white/95 dark:bg-gray-950/95 backdrop-blur shadow-sm border-b border-gray-100'
          : 'bg-transparent'
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" aria-label="FLESIM Home"><Logo /></Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {['esim', 'how', 'about', 'support'].map(k => (
              <a key={k} href={`#${k}`}
                className={clsx(
                  'transition-colors hover:text-indigo-600',
                  heroScrolled ? 'text-gray-700' : 'text-white/90'
                )}>
                {T.nav[k as keyof typeof T.nav]}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {/* Language toggle */}
            <button
              onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
              className={clsx(
                'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-colors',
                heroScrolled
                  ? 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                  : 'border-white/30 text-white/80 hover:border-white hover:text-white'
              )}
            >
              <Globe size={13} />
              {lang === 'zh' ? 'EN' : '中文'}
            </button>
            <Link href="/login"
              className={clsx(
                'text-sm font-medium px-4 py-2 rounded-full transition-colors',
                heroScrolled
                  ? 'text-gray-700 hover:text-indigo-600'
                  : 'text-white/90 hover:text-white'
              )}>
              {T.nav.signIn}
            </Link>
            <Link href="/shop"
              className="text-sm font-semibold px-5 py-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow hover:opacity-90 transition-opacity">
              {T.nav.signUp}
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 text-white"
            onClick={() => setMobileMenuOpen(v => !v)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3 shadow-lg">
            {['esim', 'how', 'about', 'support'].map(k => (
              <a key={k} href={`#${k}`}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-gray-700 py-2 hover:text-indigo-600">
                {T.nav[k as keyof typeof T.nav]}
              </a>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              <button onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
                className="text-sm text-gray-600 border border-gray-200 px-3 py-2 rounded-lg w-full text-left flex items-center gap-2">
                <Globe size={14} /> {lang === 'zh' ? 'Switch to English' : '切換為中文'}
              </button>
              <Link href="/login" className="text-sm font-medium text-center py-2.5 rounded-lg border border-gray-200 text-gray-700">
                {T.nav.signIn}
              </Link>
              <Link href="/shop" className="text-sm font-semibold text-center py-2.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                {T.nav.signUp}
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative min-h-[620px] flex items-center overflow-hidden bg-gradient-to-br from-[#0f1b3d] via-[#1a2d6b] to-[#3b1b7e]">
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-purple-500/15 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-96 h-96 rounded-full bg-indigo-600/10 blur-2xl" />
        </div>

        {/* Grid dots pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-20 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
              <Globe size={14} className="text-blue-300" />
              <span className="text-sm text-blue-200 font-medium">{T.hero.tag}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-5 whitespace-pre-line">
              {T.hero.title}
            </h1>

            <p className="text-lg text-blue-100/80 mb-8 leading-relaxed">
              {T.hero.sub}
            </p>

            {/* Search bar */}
            <div className="relative max-w-lg">
              <div className="flex items-center gap-3 bg-white rounded-2xl shadow-2xl p-2">
                <div className="flex-1 flex items-center gap-2 px-3">
                  <Search size={18} className="text-gray-400 flex-shrink-0" />
                  <input
                    ref={heroInputRef}
                    type="text"
                    placeholder={T.hero.searchPlaceholder}
                    value={heroSearch}
                    onChange={e => { setHeroSearch(e.target.value); setHeroDropdown(true) }}
                    onFocus={() => setHeroDropdown(true)}
                    className="w-full text-sm text-gray-700 bg-transparent outline-none placeholder-gray-400 py-2"
                  />
                  {heroSearch && (
                    <button onClick={() => { setHeroSearch(''); setHeroDropdown(false) }}>
                      <X size={14} className="text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
                <Link href="/shop"
                  className="flex-shrink-0 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity whitespace-nowrap">
                  {T.hero.cta}
                </Link>
              </div>

              {/* Dropdown */}
              {heroDropdown && heroResults.length > 0 && (
                <div
                  ref={heroDropdownRef}
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl overflow-hidden z-50"
                >
                  {heroResults.map(c => (
                    <Link
                      key={c.iso}
                      href={`/shop/${c.iso}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      onClick={() => setHeroDropdown(false)}
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-100 flex-shrink-0">
                        <Image
                          src={flagUrl(c.iso)}
                          alt={c.en}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-800">
                        {lang === 'zh' ? c.zh : c.en}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Trust indicators */}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-blue-200/70">
              <span className="flex items-center gap-1.5"><Check size={14} className="text-green-400" /> 190+ {lang === 'zh' ? '個國家' : 'countries'}</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-green-400" /> {lang === 'zh' ? '即時啟用' : 'Instant activation'}</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-green-400" /> {lang === 'zh' ? '24/7 客服' : '24/7 support'}</span>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <svg className="absolute bottom-0 left-0 right-0 w-full" viewBox="0 0 1440 60" preserveAspectRatio="none" height="60">
          <path d="M0,60 C360,0 1080,60 1440,0 L1440,60 Z" fill="white" />
        </svg>
      </section>

      {/* ── Destination selector ─────────────────────────────────────── */}
      <section id="esim" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">{T.dest.title}</h2>
          <p className="text-gray-500">{T.dest.sub}</p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-gray-100 rounded-full p-1 gap-1">
            {(['local', 'regional'] as const).map(tab => (
              <button key={tab}
                onClick={() => setDestTab(tab)}
                className={clsx(
                  'px-6 py-2 rounded-full text-sm font-semibold transition-all',
                  destTab === tab
                    ? 'bg-white shadow text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                )}>
                {T.dest[tab]}
              </button>
            ))}
          </div>
        </div>

        {/* Country grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredDest.map((dest, i) => (
            <button
              key={i}
              onClick={() => dest.iso
                ? setDestModal({ iso: dest.iso, zh: dest.name.zh, en: dest.name.en })
                : undefined
              }
              className="group bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:border-indigo-200 transition-all text-left w-full"
            >
              <div className="text-4xl mb-3">{dest.flag}</div>
              <div className="font-semibold text-gray-900 mb-1">{dest.name[lang]}</div>
              <div className="text-xs text-gray-400 mb-3">
                {dest.days}{lang === 'zh' ? '天' : 'd'} · {dest.gb}GB
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xs text-gray-400">{T.dest.from}</span>
                <span className="text-lg font-bold text-indigo-600">{T.dest.currency}{dest.price}</span>
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs font-medium text-indigo-500 group-hover:gap-2 transition-all">
                {lang === 'zh' ? '查看方案' : 'View plans'} <ArrowRight size={12} />
              </div>
            </button>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/shop"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full border-2 border-indigo-600 text-indigo-600 font-semibold text-sm hover:bg-indigo-600 hover:text-white transition-colors">
            {T.dest.viewAll} <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section id="how" className="py-20 px-4 sm:px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">{T.how.title}</h2>
            <p className="text-gray-500">{T.how.sub}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {T.how.steps.map((step, i) => (
              <div key={i} className="relative">
                {/* Connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-indigo-200 to-purple-200 z-0 -translate-x-4" />
                )}
                <div className="relative z-10 text-center">
                  <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                    <span className="text-xl font-bold text-white">{step.num}</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                  <p className="text-gray-500 leading-relaxed text-sm">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why choose us ────────────────────────────────────────────── */}
      <section id="about" className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">{T.why.title}</h2>
            <p className="text-gray-500">{T.why.sub}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {T.why.features.map((feat, i) => (
              <div key={i}
                className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md hover:border-indigo-100 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
                  <FeatureIcon icon={feat.icon} />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{feat.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">{T.testimonials.title}</h2>
            <p className="text-gray-500">{T.testimonials.sub}</p>
            <div className="flex justify-center items-center gap-1 mt-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} className="fill-amber-400 text-amber-400" />
              ))}
              <span className="ml-2 text-sm font-semibold text-gray-700">4.9</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(t.stars)].map((_, j) => (
                    <Star key={j} size={14} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">&ldquo;{t.text[lang]}&rdquo;</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{t.name}</div>
                    <div className="text-xs text-gray-400">{t.country[lang]}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section id="support" className="py-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">{T.faq.title}</h2>
            <p className="text-gray-500">{T.faq.sub}</p>
          </div>

          <div className="space-y-3">
            {T.faq.items.map((item, i) => (
              <div key={i}
                className={clsx(
                  'border rounded-xl overflow-hidden transition-all',
                  openFaq === i ? 'border-indigo-200 bg-indigo-50/40' : 'border-gray-200 bg-white'
                )}>
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-semibold text-gray-900 pr-4">{item.q}</span>
                  {openFaq === i
                    ? <ChevronUp size={16} className="text-indigo-500 flex-shrink-0" />
                    : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed">{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── App download ─────────────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-3xl bg-gradient-to-br from-[#1a2d6b] via-[#2d1b6b] to-[#3b1b7e] px-8 sm:px-14 py-14 flex flex-col lg:flex-row items-center gap-10 overflow-hidden relative">
            {/* Blobs */}
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-blue-400/10 blur-3xl" />
            <div className="absolute -bottom-10 left-20 w-48 h-48 rounded-full bg-purple-400/15 blur-2xl" />

            <div className="flex-1 relative z-10 text-center lg:text-left">
              <h2 className="text-3xl font-bold text-white mb-3">{T.app.title}</h2>
              <p className="text-blue-200/80 mb-8 leading-relaxed">{T.app.sub}</p>
              <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3">
                <Link href="#"
                  className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl px-5 py-3 hover:bg-white/20 transition-colors">
                  <Smartphone size={20} className="text-white" />
                  <div className="text-left">
                    <div className="text-xs text-white/60">Apple</div>
                    <div className="text-sm font-semibold text-white">{T.app.ios}</div>
                  </div>
                </Link>
                <Link href="#"
                  className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl px-5 py-3 hover:bg-white/20 transition-colors">
                  <Smartphone size={20} className="text-white" />
                  <div className="text-left">
                    <div className="text-xs text-white/60">Android</div>
                    <div className="text-sm font-semibold text-white">{T.app.android}</div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Phone mockup */}
            <div className="relative z-10 flex-shrink-0">
              <div className="w-44 h-72 bg-white/10 border-2 border-white/20 rounded-[2.5rem] flex items-center justify-center shadow-2xl">
                <div className="text-center">
                  <Logo size="sm" />
                  <div className="mt-3 w-16 h-1 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 mx-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-gray-950 text-gray-400 py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2">
              <Logo />
              <p className="mt-4 text-sm leading-relaxed max-w-xs">{T.footer.tagline}</p>
              <div className="flex gap-3 mt-5">
                {['f', 'x', 'ig', 'yt'].map((s, i) => (
                  <a key={i} href="#"
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-xs font-bold text-gray-400 hover:text-white">
                    {s}
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            {[
              { title: T.footer.resources, links: T.footer.resourcesLinks },
              { title: T.footer.partner,   links: T.footer.partnerLinks },
              { title: T.footer.company,   links: T.footer.companyLinks },
            ].map((col, i) => (
              <div key={i}>
                <h4 className="text-white text-sm font-semibold mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((link, j) => (
                    <li key={j}>
                      <a href="#" className="text-sm hover:text-white transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
            <span>{T.footer.rights}</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors">{T.footer.privacy}</a>
              <a href="#" className="hover:text-white transition-colors">{T.footer.terms}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>

    {destModal && (
      <CountryModal
        iso={destModal.iso}
        nameZh={destModal.zh}
        nameEn={destModal.en}
        lang={lang}
        onClose={() => setDestModal(null)}
      />
    )}
    </>
  )
}
