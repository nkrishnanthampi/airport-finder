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
    <select name="city" value={selectedCity} onChange={handleChange}>
      <option value="">-- choose a city --</option>
      {cities.map((c) => (
        <option key={c.airport_city} value={c.airport_city}>
          {c.airport_city}
        </option>
      ))}
    </select>
  )
}
