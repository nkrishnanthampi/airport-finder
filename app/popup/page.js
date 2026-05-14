export const dynamic = "force-dynamic";

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

async function fetchDepartures(iata, airlineIata, destIata) {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new Error("RAPIDAPI_KEY is not set");

  const now = new Date();
  const later = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

  const from = fmt(now);
  const to = fmt(later);
  const url = `https://aerodatabox.p.rapidapi.com/flights/airports/iata/${iata}/${from}/${to}?withLeg=true&direction=Departure&withCancelled=true&withCodeshared=true&withCargo=false&withPrivate=false`;

  const res = await fetch(url, {
    headers: {
      "x-rapidapi-host": "aerodatabox.p.rapidapi.com",
      "x-rapidapi-key": key,
    },
    next: { revalidate: 300 },
  });

  if (res.status === 404) return { notFound: true };

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AeroDataBox error ${res.status}: ${text || "(empty response)"}`);
  }

  const data = await res.json();
  return (data.departures ?? []).filter(
    (f) =>
      f.airline?.iata === airlineIata &&
      f.arrival?.airport?.iata === destIata
  );
}

export default async function PopupPage({ searchParams }) {
  const params = await searchParams;
  const airline = params?.airline ?? "";
  const airlineIata = params?.airlineIata ?? "";
  const destination = params?.destination ?? "";
  const destIata = params?.destIata ?? "";
  const airport = params?.airport ?? "";
  const iata = params?.iata ?? "";

  let flights = [];
  let error = null;
  let notFound = false;

  if (iata && airlineIata && destIata) {
    try {
      const result = await fetchDepartures(iata, airlineIata, destIata);
      if (result?.notFound) notFound = true;
      else flights = result;
    } catch (e) {
      error = e.message;
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <p className="text-xs font-semibold text-sky-600 uppercase tracking-wider mb-1">Next 12 hours</p>
          <h1 className="text-2xl font-extrabold font-display text-slate-800 leading-tight">
            {airline}
            <span className="text-slate-400 font-normal mx-2">→</span>
            {destination}
          </h1>
          <p className="text-slate-500 mt-1">
            departing {airport}
            {iata && (
              <span className="ml-2 font-mono text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">{iata}</span>
            )}
          </p>
        </div>

        {error ? (
          <div className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-600 flex items-start gap-2">
            <span className="text-base shrink-0">⚠️</span>
            <span>{error}</span>
          </div>
        ) : notFound ? (
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-700 flex items-start gap-2">
            <span className="text-base shrink-0">ℹ️</span>
            <span>
              Live flight data is not available for <strong>{iata}</strong> — this airport may not be covered by AeroDataBox.
            </span>
          </div>
        ) : flights.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <span className="text-4xl">🛬</span>
            <p className="mt-3 font-medium">No departures found in the next 12 hours</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Flight</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Departs</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Destination</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Terminal</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Gate</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {flights.map((f, i) => {
                  const localTime = f.departure?.scheduledTime?.local ?? "";
                  const displayTime = localTime ? localTime.slice(11, 16) : "—";
                  return (
                    <tr
                      key={f.number ?? i}
                      className={`hover:bg-slate-50 transition-colors${i > 0 ? " border-t border-slate-100" : ""}`}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">{f.number ?? "—"}</td>
                      <td className="px-4 py-3 text-sky-700 font-bold">{displayTime}</td>
                      <td className="px-4 py-3 text-slate-600">{f.arrival?.airport?.name ?? destination}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {f.departure?.terminal
                          ? <span className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">T{f.departure.terminal}</span>
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {f.departure?.gate
                          ? <span className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">{f.departure.gate}</span>
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={f.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
