import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

async function fetchFaresByAirline(sourceIata, destIata) {
  const token = process.env.TRAVELPAYOUTS_TOKEN;
  if (!token) return {};

  const headers = { "x-access-token": token };

  // Primary: calendar endpoint (no link field — construct one from departure date)
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
          const existing = faresByAirline[al];
          if (existing === undefined || entry.price < existing.price) {
            let link = null;
            if (entry.departure_at) {
              const d = new Date(entry.departure_at);
              const yy = String(d.getFullYear()).slice(2);
              const mm = String(d.getMonth() + 1).padStart(2, "0");
              const dd = String(d.getDate()).padStart(2, "0");
              link = `https://www.skyscanner.net/transport/flights/${sourceIata}/${destIata}/${yy}${mm}${dd}/`;
            }
            faresByAirline[al] = { price: entry.price, link, duration: entry.duration ?? null };
          }
        });
        return faresByAirline;
      }
    }
  } catch {
    // fall through to fallback
  }

  // Fallback: latest prices endpoint — includes a link field
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
      const existing = faresByAirline[al];
      if (existing === undefined || entry.price < existing.price) {
        let link = null;
        if (entry.departure_at) {
          const d = new Date(entry.departure_at);
          const yy = String(d.getFullYear()).slice(2);
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          link = `https://www.skyscanner.net/transport/flights/${sourceIata}/${destIata}/${yy}${mm}${dd}/`;
        }
        faresByAirline[al] = { price: entry.price, link, duration: entry.duration ?? null };
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
  const country = searchParams.get("country") ?? "";
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
        AND (${country} = '' OR src.airport_country_code = ${country})
        AND r.destination_iata = ${destIata}
      ORDER BY al.airline_name, src.airport_name
    `;
  } catch {
    return Response.json({ error: "Database error" }, { status: 500 });
  }

  const uniqueSourceIatas = [...new Set(airlines.map((a) => a.source_iata))];
  const [fareResults, coordRows] = await Promise.all([
    Promise.all(
      uniqueSourceIatas.map(async (iata) => ({
        sourceIata: iata,
        fares: await fetchFaresByAirline(iata, destIata),
      }))
    ),
    sql`
      SELECT iata_code, latitude, longitude FROM airport_master
      WHERE iata_code = ANY(${[destIata, ...uniqueSourceIatas]})
    `,
  ]);

  const fareMap = {};
  fareResults.forEach(({ sourceIata, fares }) => {
    Object.entries(fares).forEach(([airlineIata, fare]) => {
      fareMap[`${sourceIata}-${airlineIata}`] = fare;
    });
  });

  const coordMap = new Map(coordRows.map((r) => [r.iata_code, r]));

  function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function estimateDuration(srcIata) {
    const src = coordMap.get(srcIata);
    const dst = coordMap.get(destIata);
    if (!src?.latitude || !dst?.latitude) return null;
    const km = haversineKm(+src.latitude, +src.longitude, +dst.latitude, +dst.longitude);
    // ~800 km/h cruise + ~30 min for taxi/climb/descent
    return Math.round((km / 800) * 60 + 30);
  }

  const fallbackDate = new Date();
  fallbackDate.setDate(fallbackDate.getDate() + 30);
  const fbYy = String(fallbackDate.getFullYear()).slice(2);
  const fbMm = String(fallbackDate.getMonth() + 1).padStart(2, "0");
  const fbDd = String(fallbackDate.getDate()).padStart(2, "0");

  const result = airlines.map((a) => {
    const fare = fareMap[`${a.source_iata}-${a.iata_code}`];
    const fallbackLink = `https://www.skyscanner.net/transport/flights/${a.source_iata}/${destIata}/${fbYy}${fbMm}${fbDd}/`;
    const apiDuration = fare?.duration ?? null;
    return {
      ...a,
      price: fare?.price ?? null,
      booking_link: fare?.link ?? fallbackLink,
      duration: apiDuration ?? estimateDuration(a.source_iata),
      durationEstimated: apiDuration === null,
    };
  });

  return Response.json({ airlines: result });
}
