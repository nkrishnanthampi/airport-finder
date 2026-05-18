"use client";

import { useState, useEffect } from "react";
import AirlinesModal from "./airlines-modal";

export default function AllDestinationsTable({ destinations, sourceCity, sourceCountry, sourceIata }) {
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(null);

  // Auto-open modal on page load if ?dest= is in the URL (deep link support)
  useEffect(() => {
    const destIata = new URLSearchParams(window.location.search).get("dest");
    if (destIata) {
      const dest = destinations.find((d) => d.iata_code === destIata);
      if (dest) setSelected(dest);
    }
  }, [destinations]);

  // Close modal when browser back button removes the ?dest= param
  useEffect(() => {
    const handlePop = () => {
      const destIata = new URLSearchParams(window.location.search).get("dest");
      if (!destIata) setSelected(null);
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  function openModal(dest) {
    setSelected(dest);
    const url = new URL(window.location.href);
    url.searchParams.set("dest", dest.iata_code);
    window.history.pushState({}, "", url.toString());
  }

  function closeModal() {
    setSelected(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("dest");
    window.history.replaceState({}, "", url.toString());
  }

  const filtered = destinations.filter(
    (d) =>
      d.airport_city.toLowerCase().includes(filter.toLowerCase()) ||
      d.airport_name.toLowerCase().includes(filter.toLowerCase()) ||
      d.iata_code.toLowerCase().includes(filter.toLowerCase()) ||
      d.airport_country_code.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <>
      {selected && (
        <AirlinesModal
          sourceCity={sourceCity}
          sourceCountry={sourceCountry}
          sourceIata={sourceIata}
          destCity={selected.airport_city}
          destIata={selected.iata_code}
          destAirport={selected.airport_name}
          onClose={closeModal}
        />
      )}

      <div className="mb-3 relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">🔍</span>
        <input
          type="text"
          placeholder="Filter by city, airport or country…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-all"
        />
        {filter && (
          <button
            onClick={() => setFilter("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>

      {filtered.length === 0 && filter && (
        <p className="text-center text-slate-500 text-sm py-10">
          No destinations match &ldquo;{filter}&rdquo;
        </p>
      )}

      {filtered.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hidden sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">City</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Airport</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">IATA</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Country</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => (
                  <tr
                    key={d.iata_code}
                    onClick={() => openModal(d)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openModal(d)}
                    tabIndex={0}
                    role="button"
                    aria-label={`See airlines flying from ${sourceCity} to ${d.airport_city}`}
                    title={`Click to see all airlines flying from ${sourceCity} to ${d.airport_city}`}
                    className={`cursor-pointer hover:bg-sky-50 transition-colors group focus:outline-none focus:bg-sky-50${i > 0 ? " border-t border-slate-100" : ""}${i % 2 === 1 ? " bg-slate-50/40" : ""}`}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-800">{d.airport_city}</td>
                    <td className="px-4 py-3 text-slate-600">{d.airport_name}</td>
                    <td className="px-4 py-3">
                      <span className="bg-sky-100 text-sky-700 font-mono font-bold text-xs px-2 py-0.5 rounded-md">
                        {d.iata_code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-md">
                        {d.airport_country_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300 group-hover:text-sky-500 transition-colors text-base">
                      ›
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden flex flex-col gap-2">
            {filtered.map((d) => (
              <button
                key={d.iata_code}
                onClick={() => openModal(d)}
                className="w-full text-left bg-white rounded-xl border border-slate-200 px-4 py-3 hover:border-sky-300 hover:shadow-sm transition-all flex items-center gap-3"
              >
                <span className="bg-sky-100 text-sky-700 font-mono font-bold text-xs px-2 py-1 rounded-md shrink-0">
                  {d.iata_code}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{d.airport_city}</p>
                  <p className="text-xs text-slate-500 truncate">{d.airport_name}</p>
                </div>
                <span className="text-slate-400 text-xs shrink-0">{d.airport_country_code}</span>
                <span className="text-slate-300 ml-1">›</span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
