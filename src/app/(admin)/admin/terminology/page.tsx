'use client'

import { useEffect, useState, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import { useLanguage, LANG_OPTIONS, type Lang, type TranslationRow } from '@/components/language-provider'
import { STATIC_TRANSLATIONS } from '@/lib/translations'
import { CheckCircle, Loader2 } from 'lucide-react'

// Derive category from key prefix (e.g. "nav.dashboard" → "nav")
function getCategory(key: string) {
  return key.split('.')[0]
}

const ALL_CATEGORIES = Array.from(
  new Set(Object.keys(STATIC_TRANSLATIONS).map(getCategory))
).sort()

type SaveState = 'idle' | 'saving' | 'saved'

export default function TerminologyPage() {
  const { t } = useLanguage()
  const [rows, setRows] = useState<TranslationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({})

  async function fetchRows() {
    const res = await fetch('/api/admin/translations')
    const data = await res.json()
    if (data.translations) {
      setRows(data.translations)
    }
    setLoading(false)
  }

  useEffect(() => { fetchRows() }, [])

  async function handleSeed() {
    setSeeding(true)
    await fetch('/api/admin/translations/seed', { method: 'POST' })
    await fetchRows()
    setSeeding(false)
  }

  async function handleBlur(key: string, lang: Lang, value: string) {
    const stateKey = `${key}:${lang}`
    setSaveStates(prev => ({ ...prev, [stateKey]: 'saving' }))
    await fetch('/api/admin/translations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, lang, value }),
    })
    setSaveStates(prev => ({ ...prev, [stateKey]: 'saved' }))
    setTimeout(() => {
      setSaveStates(prev => ({ ...prev, [stateKey]: 'idle' }))
    }, 2000)
    // Update local row
    setRows(prev => prev.map(r => {
      if (r.key !== key) return r
      const col = lang.replace('-', '_').toLowerCase() as keyof TranslationRow
      return { ...r, [col]: value }
    }))
  }

  const filtered = useMemo(() => {
    let list = rows.length > 0
      ? rows
      : Object.entries(STATIC_TRANSLATIONS).map(([key, val]) => ({
          key,
          zh_tw: val['zh-TW'] ?? '',
          zh_cn: val['zh-CN'] ?? '',
          en: val['en'] ?? '',
          ja: val['ja'] ?? '',
          ko: val['ko'] ?? '',
        }))

    if (category !== 'all') {
      list = list.filter(r => getCategory(r.key) === category)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.key.toLowerCase().includes(q) ||
        r.zh_tw.toLowerCase().includes(q) ||
        r.en.toLowerCase().includes(q)
      )
    }
    return list
  }, [rows, category, search])

  const langColMap: { lang: Lang; col: keyof TranslationRow; label: string }[] = [
    { lang: 'zh-TW', col: 'zh_tw', label: '繁體中文' },
    { lang: 'zh-CN', col: 'zh_cn', label: '简体中文' },
    { lang: 'en',    col: 'en',    label: 'English' },
    { lang: 'ja',    col: 'ja',    label: '日本語' },
    { lang: 'ko',    col: 'ko',    label: '한국어' },
  ]

  return (
    <>
      <Header breadcrumb={[t('nav.terminology')]} />
      <div className="p-6 space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{t('term.title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{t('term.desc')}</p>
          </div>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="shrink-0 flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
          >
            {seeding && <Loader2 size={14} className="animate-spin" />}
            {seeding ? '...' : t('term.seedBtn')}
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-1.5">
          {['all', ...ALL_CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                category === cat
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-indigo-400'
              }`}
            >
              {cat === 'all' ? t('term.all') : cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('term.search')}
          className="w-full max-w-sm px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        {/* Table */}
        {loading ? (
          <div className="text-sm text-gray-400">{t('common.loading')}</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 uppercase">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium w-44">{t('term.key')}</th>
                  {langColMap.map(({ lang, label }) => (
                    <th key={lang} className="px-3 py-2.5 text-left font-medium">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
                {filtered.map(row => (
                  <tr key={row.key} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-2 font-mono text-xs text-gray-500 dark:text-gray-400 align-top pt-3 w-44">
                      {row.key}
                    </td>
                    {langColMap.map(({ lang, col }) => {
                      const stateKey = `${row.key}:${lang}`
                      const state = saveStates[stateKey] ?? 'idle'
                      return (
                        <td key={lang} className="px-3 py-1.5 align-top">
                          <div className="relative">
                            <textarea
                              defaultValue={row[col] as string}
                              onBlur={e => handleBlur(row.key, lang, e.target.value)}
                              rows={1}
                              className="w-full min-w-[140px] resize-y px-2 py-1.5 text-sm text-gray-800 dark:text-gray-200 bg-transparent border border-transparent rounded hover:border-gray-300 dark:hover:border-gray-600 focus:border-indigo-400 focus:outline-none focus:bg-white dark:focus:bg-gray-800 transition-colors"
                            />
                            {state === 'saving' && (
                              <Loader2 size={12} className="absolute top-2 right-1.5 text-gray-400 animate-spin" />
                            )}
                            {state === 'saved' && (
                              <CheckCircle size={12} className="absolute top-2 right-1.5 text-green-500" />
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
