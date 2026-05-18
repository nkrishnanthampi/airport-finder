'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function AirportSearch({ selectedCity, size = "sm" }) {
  const router = useRouter()
  const [query, setQuery] = useState(selectedCity || '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const debounceRef = useRef(null)
  const fromPropRef = useRef(false)

  useEffect(() => {
    fromPropRef.current = true
    setQuery(selectedCity || '')
    setResults([])
    setOpen(false)
  }, [selectedCity])

  useEffect(() => {
    if (fromPropRef.current) {
      fromPropRef.current = false
      return
    }
    if (query.length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        const list = data.results || []
        setResults(list)
        setOpen(list.length > 0)
        setActiveIdx(-1)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  function select(item) {
    setQuery(item.airport_city)
    setOpen(false)
    router.push(`?city=${encodeURIComponent(item.airport_city)}&country=${item.airport_country_code}`)
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, results.length - 1))
      setOpen(true)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      select(results[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function handleBlur() {
    // Delay to allow mousedown on dropdown item to fire first
    setTimeout(() => setOpen(false), 150)
  }

  const inputClass = size === 'lg'
    ? "w-full bg-white text-slate-800 border-2 border-slate-200 rounded-xl px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 shadow-sm hover:border-slate-300 transition-colors"
    : "w-44 bg-white/10 text-white border border-white/20 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 backdrop-blur-sm placeholder-white/60"

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          if (!e.target.value) router.push('/')
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={handleBlur}
        placeholder="Search city or airport…"
        autoComplete="off"
        className={inputClass}
      />
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-40 pointer-events-none">…</span>
      )}
      {open && results.length > 0 && (
        <ul className="absolute z-50 top-full mt-1 left-0 min-w-[220px] bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden max-h-72 overflow-y-auto">
          {results.map((r, i) => (
            <li
              key={`${r.airport_city}-${r.airport_country_code}`}
              onMouseDown={() => select(r)}
              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm${i > 0 ? ' border-t border-slate-100' : ''}${i === activeIdx ? ' bg-sky-50 text-sky-700' : ' hover:bg-slate-50'}`}
            >
              <span className="flex-1 font-medium text-slate-800">{r.airport_city}</span>
              <span className="text-xs text-slate-400 shrink-0">{r.airport_country_code}</span>
              {r.airport_count > 1 && (
                <span className="text-xs text-slate-300 shrink-0">{r.airport_count}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
