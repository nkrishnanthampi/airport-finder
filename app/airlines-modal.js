"use client";

import { useState, useEffect } from "react";
import Modal from "./modal";

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
          <div className="skeleton w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-3 w-24" />
          </div>
          <div className="skeleton h-5 w-14 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function AirlinesModal({ sourceCity, destCity, destIata, destAirport, onClose }) {
  const [airlines, setAirlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams({ city: sourceCity, destIata });
    fetch(`/api/airlines?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setAirlines(data.airlines ?? []);
      })
      .catch(() => setError("Could not load airline data. Please try again."))
      .finally(() => setLoading(false));
  }, [sourceCity, destIata]);

  return (
    <Modal
      onClose={onClose}
      title={
        <div>
          <p className="text-xs font-semibold text-sky-600 uppercase tracking-wider mb-0.5">Airlines flying to</p>
          <h2 className="text-lg font-bold font-display text-slate-800 leading-tight">
            {destCity}
            {destAirport && (
              <span className="text-slate-500 font-normal text-sm ml-2">{destAirport}</span>
            )}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">from {sourceCity}</p>
          <a
            href={`/airlines?${new URLSearchParams({ city: sourceCity, destIata, destCity, destAirport })}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-1.5 text-xs text-sky-600 hover:underline"
          >
            Open full page ↗
          </a>
        </div>
      }
    >
      {loading && <Skeleton />}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-600 flex items-start gap-2">
          <span className="text-base shrink-0">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && airlines.length === 0 && (
        <div className="text-center py-10 text-slate-500">
          <span className="text-4xl">🛫</span>
          <p className="mt-3 font-medium">No airlines found for this route</p>
          <p className="text-sm text-slate-400 mt-1">Try a different destination or check back later.</p>
        </div>
      )}

      {!loading && !error && airlines.length > 0 && (
        <div className="space-y-2">
          {airlines.map((a) => (
            <div
              key={`${a.iata_code}-${a.source_iata}`}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-sky-200 hover:bg-sky-50/50 transition-all"
            >
              <img
                src={`https://pics.avs.io/64/64/${a.iata_code}.png`}
                alt={a.airline_name}
                className="w-10 h-10 rounded-full object-contain bg-white border border-slate-100 shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextSibling.style.display = "flex";
                }}
              />
              <span
                style={{ display: "none" }}
                className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center text-slate-500 font-mono font-bold text-xs shrink-0"
              >
                {a.iata_code}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{a.airline_name}</p>
                <p className="text-xs text-slate-500 truncate">{a.source_airport}</p>
              </div>
              {a.price !== null ? (
                <div className="text-right shrink-0">
                  <a
                    href={a.booking_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-700 font-bold text-base hover:underline"
                  >
                    £{a.price}
                  </a>
                  <p className="text-xs text-slate-400">one-way</p>
                </div>
              ) : (
                <a
                  href={a.booking_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-600 text-sm hover:underline shrink-0"
                >
                  Search →
                </a>
              )}
            </div>
          ))}
          <p className="text-xs text-slate-400 text-center pt-2 pb-1">
            Lowest fares across the next 30 days · per person, one-way
          </p>
        </div>
      )}
    </Modal>
  );
}
