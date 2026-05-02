'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, ArrowLeft, X, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { COUNTRIES, flagUrl, groupByLetter } from '@/lib/countries'
import { CountryModal } from '@/components/country-modal'

type Lang = 'zh' | 'en'

const ALPHABET = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const T = {
  zh: { title: '選擇目的地', placeholder: '搜尋目的地…', noResult: '找不到符合的目的地' },
  en: { title: 'Search', placeholder: 'Where to go?', noResult: 'No destinations found' },
}

function FlagImg({ iso, name, size = 40 }: { iso: string; name: string; size?: number }) {
  const [err, setErr] = useState(false)
  if (err) {
    return (
      <div style={{ width: size, height: size }} className="rounded-full bg-gray-100 flex items-center justify-center text-base flex-shrink-0">
        🌐
      </div>
    )
  }
  return (
    <div style={{ width: size, height: size }} className="rounded-full overflow-hidden flex-shrink-0 border border-gray-100 bg-gray-50">
      <Image src={flagUrl(iso)} alt={name} width={size} height={size} className="w-full h-full object-cover" onError={() => setErr(true)} unoptimized />
    </div>
  )
}

export default function ShopPage() {
  const [lang] = useState<Lang>('zh')
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<{ iso: string; zh: string; en: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const listRef = useRef<HTMLDivElement>(null)

  const t = T[lang]

  useEffect(() => { inputRef.current?.focus() }, [])

  const q = query.trim().toLowerCase()
  const filtered = q
    ? COUNTRIES.filter(c => c.en.toLowerCase().includes(q) || c.zh.includes(query.trim()) || c.iso.includes(q))
    : COUNTRIES

  const grouped = groupByLetter(filtered)
  const letters = Array.from(grouped.keys()).sort()

  const jumpTo = useCallback((letter: string) => {
    if (letter === '#') { listRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); return }
    const el = sectionRefs.current[letter]
    if (el && listRef.current) {
      const listTop = listRef.current.getBoundingClientRect().top
      const elTop = el.getBoundingClientRect().top
      listRef.current.scrollBy({ top: elTop - listTop - 8, behavior: 'smooth' })
    }
  }, [])

  return (
    <>
      <div className="flex flex-col h-screen bg-white">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Link href="/" className="p-1.5 -ml-1.5 text-gray-600 hover:text-gray-900">
            <ArrowLeft size={22} />
          </Link>
          <h1 className="text-base font-semibold text-gray-900 flex-1 text-center pr-8">{t.title}</h1>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3 bg-gray-100 rounded-full px-4 py-2.5">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t.placeholder}
              className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder-gray-400"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600">
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          <div ref={listRef} className="flex-1 overflow-y-auto">
            {letters.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-gray-400">{t.noResult}</div>
            ) : (
              <div className="pb-8">
                {letters.map(letter => (
                  <div key={letter} ref={el => { sectionRefs.current[letter] = el }}>
                    <div className="px-5 pt-5 pb-2">
                      <span className="text-sm font-bold text-gray-900">{letter}</span>
                    </div>
                    {grouped.get(letter)!.map(country => (
                      <button
                        key={country.iso}
                        onClick={() => setModal({ iso: country.iso, zh: country.zh, en: country.en })}
                        className="w-full flex items-center gap-4 px-5 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                      >
                        <FlagImg iso={country.iso} name={country.en} />
                        <span className="text-sm font-medium text-gray-900">
                          {lang === 'zh' ? country.zh : country.en}
                        </span>
                        <ChevronRight size={14} className="text-gray-300 ml-auto" />
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* A–Z sidebar */}
          {!query && (
            <div className="flex flex-col items-center justify-center gap-0.5 px-2 py-4 select-none">
              {ALPHABET.map(letter => {
                const available = letters.includes(letter)
                return (
                  <button
                    key={letter}
                    onClick={() => jumpTo(letter)}
                    className={clsx(
                      'w-5 h-5 flex items-center justify-center text-[11px] font-medium rounded transition-colors',
                      available ? 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50' : 'text-gray-200 cursor-default'
                    )}
                    disabled={!available && letter !== '#'}
                  >
                    {letter}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {modal && (
        <CountryModal
          iso={modal.iso}
          nameZh={modal.zh}
          nameEn={modal.en}
          lang={lang}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}
