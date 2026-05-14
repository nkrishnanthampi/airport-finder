'use client'

import { useRouter } from 'next/navigation'

export default function CitySelect({ cities, selectedCity, size = "sm" }) {
  const router = useRouter()

  function handleChange(e) {
    const city = e.target.value
    if (city) {
      router.push(`?city=${encodeURIComponent(city)}`)
    } else {
      router.push('/')
    }
  }

  if (size === "lg") {
    return (
      <select
        value={selectedCity}
        onChange={handleChange}
        className="w-full bg-white text-slate-800 border-2 border-slate-200 rounded-xl px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 cursor-pointer shadow-sm hover:border-slate-300 transition-colors"
      >
        <option value="">Choose a city…</option>
        {cities.map((c) => (
          <option key={c.airport_city} value={c.airport_city}>
            {c.airport_city}
          </option>
        ))}
      </select>
    )
  }

  return (
    <select
      value={selectedCity}
      onChange={handleChange}
      className="bg-white/10 text-white border border-white/20 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer hover:bg-white/20 transition-colors backdrop-blur-sm"
    >
      <option value="" className="text-slate-800 bg-white">All cities</option>
      {cities.map((c) => (
        <option key={c.airport_city} value={c.airport_city} className="text-slate-800 bg-white">
          {c.airport_city}
        </option>
      ))}
    </select>
  )
}
