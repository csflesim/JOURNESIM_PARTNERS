'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createT } from '@/lib/translations'

export type Lang = 'zh-TW' | 'zh-CN' | 'en' | 'ja' | 'ko'

export const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: 'zh-TW', label: '繁體中文' },
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en',    label: 'English' },
  { value: 'ja',    label: '日本語' },
  { value: 'ko',    label: '한국어' },
]

export const LANG_I18N_KEY: Partial<Record<Lang, 'en' | 'ja' | 'ko'>> = {
  en: 'en', ja: 'ja', ko: 'ko',
}

// DB row shape (columns use underscore)
export type TranslationRow = {
  key: string
  zh_tw: string
  zh_cn: string
  en: string
  ja: string
  ko: string
}

// Map from DB column name to Lang key
const COL_TO_LANG: Record<string, Lang> = {
  zh_tw: 'zh-TW', zh_cn: 'zh-CN', en: 'en', ja: 'ja', ko: 'ko',
}

export type TranslationOverrides = Record<string, Partial<Record<Lang, string>>>

interface LangContextType {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string, vars?: Record<string, string | number>) => string
  convert: (text: string | null | undefined) => string
  getI18n: (
    i18nField: Record<string, string | null> | null | undefined,
    zhText: string | null | undefined
  ) => string
  overrides: TranslationOverrides
  setOverride: (key: string, lang: Lang, value: string) => void
}

const LangContext = createContext<LangContextType>({
  lang: 'zh-TW',
  setLang: () => {},
  t: (k) => k,
  convert: (t) => t ?? '',
  getI18n: (_, zh) => zh ?? '',
  overrides: {},
  setOverride: () => {},
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('zh-TW')
  const [overrides, setOverrides] = useState<TranslationOverrides>({})
  const converterRef = useRef<((text: string) => string) | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang | null
    if (saved && LANG_OPTIONS.some(o => o.value === saved)) setLangState(saved)
    import('opencc-js').then((OpenCC) => {
      converterRef.current = OpenCC.Converter({ from: 'cn', to: 'tw' })
    })
    // Load translations from DB
    fetch('/api/admin/translations')
      .then(r => r.json())
      .then((data: { translations?: TranslationRow[] }) => {
        if (!data.translations) return
        const map: TranslationOverrides = {}
        for (const row of data.translations) {
          map[row.key] = {}
          for (const [col, langKey] of Object.entries(COL_TO_LANG)) {
            const val = row[col as keyof TranslationRow]
            if (val) map[row.key][langKey] = val
          }
        }
        setOverrides(map)
      })
      .catch(() => {/* DB not ready yet, fall back to static */})
  }, [])

  function setLang(l: Lang) {
    localStorage.setItem('lang', l)
    setLangState(l)
  }

  function setOverride(key: string, l: Lang, value: string) {
    setOverrides(prev => ({
      ...prev,
      [key]: { ...prev[key], [l]: value },
    }))
  }

  const t = useMemo(() => createT(lang, overrides), [lang, overrides])

  const convert = useCallback((text: string | null | undefined): string => {
    if (!text) return text ?? ''
    if (lang !== 'zh-TW' || !converterRef.current) return text
    return converterRef.current(text)
  }, [lang])

  const getI18n = useCallback((
    i18nField: Record<string, string | null> | null | undefined,
    zhText: string | null | undefined
  ): string => {
    const key = LANG_I18N_KEY[lang]
    if (key && i18nField?.[key]) return i18nField[key]!
    return convert(zhText)
  }, [lang, convert])

  return (
    <LangContext.Provider value={{ lang, setLang, t, convert, getI18n, overrides, setOverride }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LangContext)
}
