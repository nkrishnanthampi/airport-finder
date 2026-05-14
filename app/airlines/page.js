import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

async function fetchFaresByAirline(sourceIata, destIata) {
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) return {};

  const url = `https://api.travelpayouts.com/v1/prices/calendar?origin=${sourceIata}&destination=${destIata}&currency=gbp&calendar_type=departure_date`;
  let res;
  try {
    res = await fetch(url, {
      headers: { "x-access-token": token },
      next: { revalidate: 3600 },
    });
  } catch {
    return {};
  }

  if (!res.ok) return {};

  const data = await res.json();
  if (!data.success || !data.data) return {};

  const faresByAirline = {};
  Object.values(data.data).forEach((entry) => {
    const al = entry.airline;
    if (!al) return;
    if (faresByAirline[al] === undefined || entry.price < faresByAirline[al]) {
      faresByAirline[al] = entry.price;
    }
  });

  return faresByAirline;
}

export default async function AirlinesPage({ searchParams }) {
  const params = await searchParams;
  const city = params?.city ?? "";
  const destIata = params?.destIata ?? "";
  const destCity = params?.destCity ?? "";
  const destAirport = params?.destAirport ?? "";

  let airlines = [];
  if (city && destIata) {
    airlines = await sql`
      SELECT DISTINCT al.iata_code, al.airline_name, src.airport_name AS source_airport, src.iata_code AS source_iata
      FROM routes r
      JOIN airport_master src ON r.source_iata = src.iata_code
      JOIN airline_master al ON r.airline_id = al.id
      WHERE src.airport_city = ${city}
        AND src.airport_country_code = 'GBR'
        AND r.destination_iata = ${destIata}
      ORDER BY al.airline_name, src.airport_name
    `;
  }

  const uniqueSourceIatas = [...new Set(airlines.map((a) => a.source_iata))];
  const fareResults = await Promise.all(
    uniqueSourceIatas.map(async (iata) => ({
      sourceIata: iata,
      fares: await fetchFaresByAirline(iata, destIata),
    }))
  );

  const fareMap = {};
  fareResults.forEach(({ sourceIata, fares }) => {
    Object.entries(fares).forEach(([airlineIata, price]) => {
      fareMap[`${sourceIata}-${airlineIata}`] = price;
    });
  });

  return (
    <main className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <p className="text-xs font-semibold text-sky-600 uppercase tracking-wider mb-1">Airlines flying to</p>
          <h1 className="text-2xl font-extrabold font-display text-slate-800 leading-tight">
            {destCity || "Destination"}
            {destAirport && (
              <span className="text-slate-500 font-normal text-lg ml-2">{destAirport}</span>
            )}
          </h1>
          {city && <p className="text-slate-500 mt-1">from {city}</p>}
        </div>

        {airlines.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <span className="text-4xl">🛫</span>
            <p className="mt-3 font-medium">No airlines found for this route</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              {airlines.map((a, i) => {
                const price = fareMap[`${a.source_iata}-${a.iata_code}`];
                return (
                  <div
                    key={`${a.iata_code}-${a.source_iata}`}
                    className={`flex items-center gap-3 px-4 py-4${i > 0 ? " border-t border-slate-100" : ""}`}
                  >
                    <img
                      src={`https://pics.avs.io/64/64/${a.iata_code}.png`}
                      alt={a.airline_name}
                      className="w-10 h-10 rounded-full object-contain bg-white border border-slate-100 shrink-0"
                      onError="this.style.display='none'"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800">{a.airline_name}</p>
                      <p className="text-sm text-slate-500 truncate">{a.source_airport}</p>
                    </div>
                    {price !== undefined ? (
                      <div className="text-right shrink-0">
                        <p className="text-green-700 font-bold text-lg">£{price}</p>
                        <p className="text-xs text-slate-400">one-way</p>
                      </div>
                    ) : (
                      <span className="text-slate-300 text-sm shrink-0">No price data</span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 text-center mt-3">
              Lowest fares across the next 30 days · per person, one-way
            </p>
          </>
        )}
      </div>
    </main>
  );
}
