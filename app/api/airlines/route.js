import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

async function fetchFaresByAirline(sourceIata, destIata) {
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) return {};

  const headers = { "x-access-token": token };

  // Primary: calendar endpoint
  try {
    const url = `https://api.travelpayouts.com/v1/prices/calendar?origin=${sourceIata}&destination=${destIata}&currency=gbp&calendar_type=departure_date`;
    const res = await fetch(url, { headers, next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data && Object.keys(data.data).length > 0) {
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
    }
  } catch {
    // fall through to fallback
  }

  // Fallback: latest prices endpoint (broader route coverage)
  try {
    const url = `https://api.travelpayouts.com/v2/prices/latest?origin=${sourceIata}&destination=${destIata}&currency=gbp&limit=30&sorting=price`;
    const res = await fetch(url, { headers, next: { revalidate: 3600 } });
    if (!res.ok) return {};
    const data = await res.json();
    if (!data.success || !Array.isArray(data.data)) return {};

    const faresByAirline = {};
    data.data.forEach((entry) => {
      const al = entry.airline;
      if (!al) return;
      if (faresByAirline[al] === undefined || entry.price < faresByAirline[al]) {
        faresByAirline[al] = entry.price;
      }
    });
    return faresByAirline;
  } catch {
    return {};
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") ?? "";
  const destIata = searchParams.get("destIata") ?? "";

  if (!city || !destIata) {
    return Response.json({ error: "city and destIata are required" }, { status: 400 });
  }

  let airlines;
  try {
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
  } catch {
    return Response.json({ error: "Database error" }, { status: 500 });
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

  const result = airlines.map((a) => ({
    ...a,
    price: fareMap[`${a.source_iata}-${a.iata_code}`] ?? null,
  }));

  return Response.json({ airlines: result });
}
