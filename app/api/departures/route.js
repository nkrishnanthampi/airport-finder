export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const iata = searchParams.get("iata") ?? "";
  const airlineIata = searchParams.get("airlineIata") ?? "";
  const destIata = searchParams.get("destIata") ?? "";

  if (!iata || !airlineIata || !destIata) {
    return Response.json({ error: "iata, airlineIata, destIata are required" }, { status: 400 });
  }

  const key = process.env.RAPIDAPI_KEY;
  if (!key) return Response.json({ error: "Flight data service not configured" }, { status: 500 });

  const now = new Date();
  const later = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

  const from = fmt(now);
  const to = fmt(later);
  const url = `https://aerodatabox.p.rapidapi.com/flights/airports/iata/${iata}/${from}/${to}?withLeg=true&direction=Departure&withCancelled=true&withCodeshared=true&withCargo=false&withPrivate=false`;

  let res;
  try {
    res = await fetch(url, {
      headers: {
        "x-rapidapi-host": "aerodatabox.p.rapidapi.com",
        "x-rapidapi-key": key,
      },
      next: { revalidate: 300 },
    });
  } catch {
    return Response.json({ error: "Could not reach flight data service. Please try again." }, { status: 502 });
  }

  if (res.status === 404) {
    return Response.json({ notFound: true, flights: [] });
  }

  if (!res.ok) {
    return Response.json({ error: `Flight data service error (${res.status})` }, { status: 502 });
  }

  const data = await res.json();
  const flights = (data.departures ?? []).filter(
    (f) =>
      f.airline?.iata === airlineIata &&
      f.arrival?.airport?.iata === destIata
  );

  return Response.json({ flights });
}
