'use client'

import { useRouter } from 'next/navigation'

export default function CitySelect({ cities, selectedCity }) {
  const router = useRouter()

  function handleChange(e) {
    const city = e.target.value
    if (city) {
      router.push(`?city=${encodeURIComponent(city)}`)
    } else {
      router.push('/')
    }
  }

  return (
    <select
      value={selectedCity}
      onChange={handleChange}
      className="bg-blue-800 text-white border border-blue-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
    >
      <option value="">-- choose a city --</option>
      {cities.map((c) => (
        <option key={c.airport_city} value={c.airport_city}>
          {c.airport_city}
        </option>
      ))}
    </select>
  )
}
