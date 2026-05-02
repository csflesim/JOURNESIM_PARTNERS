'use client'

import { useRef, useState, useEffect } from 'react'
import { Bell, User, Sun, Moon, ChevronDown } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { useLanguage, LANG_OPTIONS } from '@/components/language-provider'

interface HeaderProps {
  breadcrumb?: string[]
  balance?: string
}

export function Header({ breadcrumb = [], balance }: HeaderProps) {
  const { theme, toggle } = useTheme()
  const { lang, setLang } = useLanguage()
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  // 點外部關閉
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const currentLabel = LANG_OPTIONS.find(o => o.value === lang)?.label ?? '繁體中文'

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      {/* 麵包屑 */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        {breadcrumb.map((item, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-gray-300 dark:text-gray-600">›</span>}
            <span className={i === breadcrumb.length - 1 ? 'text-gray-800 dark:text-gray-100 font-medium' : ''}>
              {item}
            </span>
          </span>
        ))}
      </div>

      {/* 右側工具列 */}
      <div className="flex items-center gap-4">
        {/* 帳戶餘額 */}
        {balance !== undefined && (
          <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5">
            餘額：<span className="font-semibold text-gray-800 dark:text-gray-100">{balance}</span>
          </div>
        )}

        {/* 語言切換下拉 */}
        <div ref={langRef} className="relative">
          <button
            onClick={() => setLangOpen(v => !v)}
            className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            {currentLabel}
            <ChevronDown size={14} className={langOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>

          {langOpen && (
            <div className="absolute right-0 top-full mt-2 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden z-50">
              {LANG_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setLang(opt.value); setLangOpen(false) }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    lang === opt.value
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 深色/淺色切換 */}
        <button
          onClick={toggle}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
          title={theme === 'dark' ? '切換淺色模式' : '切換深色模式'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* 通知 */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* 帳號 */}
        <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <div className="w-7 h-7 bg-indigo-600 dark:bg-indigo-500 rounded-full flex items-center justify-center">
            <User size={14} className="text-white" />
          </div>
        </button>
      </div>
    </header>
  )
}
