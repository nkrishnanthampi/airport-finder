export const dynamic = "force-dynamic";

async function fetchDepartures(iata, airlineIata, destIata) {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new Error("RAPIDAPI_KEY is not set");

  // Build a 12-hour window from now
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

  if (res.status === 404) {
    return { notFound: true };
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AeroDataBox error ${res.status}: ${text || "(empty response)"} — URL: ${url.replace(key, "***")}`);
  }

  const data = await res.json();
  const departures = data.departures ?? [];

  return departures.filter(
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
  const city = params?.city ?? "";
  const airport = params?.airport ?? "";
  const iata = params?.iata ?? "";

  let flights = [];
  let error = null;
  let notFound = false;

  if (iata && airlineIata && destIata) {
    try {
      const result = await fetchDepartures(iata, airlineIata, destIata);
      if (result?.notFound) {
        notFound = true;
      } else {
        flights = result;
      }
    } catch (e) {
      error = e.message;
    }
  }

  return (
    <main className="p-8 bg-white min-h-screen font-sans">
      <h1 className="text-xl font-semibold text-slate-800 leading-relaxed mb-6">
        Departure times for all{" "}
        <span className="text-blue-700">{airline}</span> flights to{" "}
        <span className="text-blue-700">{destination}</span> from{" "}
        <span className="text-blue-700">{city}</span>{" "}
        <span className="text-blue-700">{airport}</span> are as below.
      </h1>

      {error ? (
        <p className="text-red-600 text-sm">{error}</p>
      ) : notFound ? (
        <p className="text-slate-500 text-sm">
          Flight data is not available for <strong>{iata}</strong> — this airport may not be covered by AeroDataBox.
        </p>
      ) : flights.length === 0 ? (
        <p className="text-slate-500 text-sm">No departures found in the next 12 hours.</p>
      ) : (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="px-4 py-3 font-semibold text-slate-600">Flight</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Departure time</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Destination</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Terminal</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Gate</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {flights.map((f, i) => {
                const localTime = f.departure?.scheduledTime?.local ?? "";
                const displayTime = localTime ? localTime.slice(11, 16) : "—";
                return (
                  <tr
                    key={f.number ?? i}
                    className={`${i > 0 ? "border-t border-slate-100" : ""}`}
                  >
                    <td className="px-4 py-3 font-mono text-slate-700">{f.number ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{displayTime}</td>
                    <td className="px-4 py-3 text-slate-600">{f.arrival?.airport?.name ?? destination}</td>
                    <td className="px-4 py-3 text-slate-500">{f.departure?.terminal ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{f.departure?.gate ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{f.status ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
