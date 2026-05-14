"use client";

import { useState, useEffect } from "react";
import Modal from "./modal";

function StatusBadge({ status }) {
  if (!status) return <span className="text-slate-300 text-xs">—</span>;

  const lower = status.toLowerCase();
  let cls = "px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ";

  if (lower.includes("on time") || lower.includes("departed") || lower.includes("arrived")) {
    cls += "bg-green-100 text-green-700";
  } else if (lower.includes("delay") || lower.includes("expect") || lower.includes("boarding")) {
    cls += "bg-amber-100 text-amber-700";
  } else if (lower.includes("cancel")) {
    cls += "bg-red-100 text-red-700";
  } else {
    cls += "bg-slate-100 text-slate-600";
  }

  return <span className={cls}>{status}</span>;
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
          <div className="skeleton h-4 w-14" />
          <div className="skeleton h-4 w-10" />
          <div className="flex-1 skeleton h-4" />
          <div className="skeleton h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function DeparturesModal({
  city, airport, iata, airline, airlineIata, destination, destIata, onClose,
}) {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams({ iata, airlineIata, destIata });
    fetch(`/api/departures?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else if (data.notFound) setNotFound(true);
        else setFlights(data.flights ?? []);
      })
      .catch(() => setError("Could not load departure data. Please try again."))
      .finally(() => setLoading(false));
  }, [iata, airlineIata, destIata]);

  return (
    <Modal
      onClose={onClose}
      title={
        <div>
          <p className="text-xs font-semibold text-sky-600 uppercase tracking-wider mb-0.5">Next 12 hours</p>
          <h2 className="text-lg font-bold font-display text-slate-800 leading-tight">
            {airline}
            <span className="text-slate-400 font-normal mx-1.5">→</span>
            {destination}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            departing {airport}
            <span className="ml-1.5 font-mono text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{iata}</span>
          </p>
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

      {notFound && (
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-700 flex items-start gap-2">
          <span className="text-base shrink-0">ℹ️</span>
          <span>
            Live flight data is not available for <strong>{iata}</strong> — this airport may not be covered by our data provider.
          </span>
        </div>
      )}

      {!loading && !error && !notFound && flights.length === 0 && (
        <div className="text-center py-10 text-slate-500">
          <span className="text-4xl">🛬</span>
          <p className="mt-3 font-medium">No departures in the next 12 hours</p>
          <p className="text-sm text-slate-400 mt-1">Check back closer to your travel date.</p>
        </div>
      )}

      {!loading && !error && !notFound && flights.length > 0 && (
        <div className="space-y-2">
          {flights.map((f, i) => {
            const localTime = f.departure?.scheduledTime?.local ?? "";
            const displayTime = localTime ? localTime.slice(11, 16) : "—";
            return (
              <div
                key={f.number ?? i}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <span className="font-mono font-bold text-slate-800 text-sm w-16 shrink-0">
                  {f.number ?? "—"}
                </span>
                <span className="text-sky-700 font-bold text-sm w-12 shrink-0">{displayTime}</span>
                <span className="text-slate-600 text-sm flex-1 min-w-[120px]">
                  {f.arrival?.airport?.name ?? destination}
                </span>
                <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
                  {f.departure?.terminal && (
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded">T{f.departure.terminal}</span>
                  )}
                  {f.departure?.gate && (
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded">Gate {f.departure.gate}</span>
                  )}
                </div>
                <StatusBadge status={f.status} />
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
