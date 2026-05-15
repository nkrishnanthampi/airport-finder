import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }) {
  const { iata } = await params;
  return { title: `${iata.toUpperCase()} Departures` };
}

export default async function DeparturesPage({ params, searchParams }) {
  const { iata } = await params;
  const sp = await searchParams;
  const sourceIata = iata.toUpperCase();
  const airlineIata = sp?.airline ?? "";
  const destinationCity = sp?.to ?? "";

  const [airportRows, airlineRows] = await Promise.all([
    sql`
      SELECT airport_name, airport_city
      FROM airport_master
      WHERE iata_code = ${sourceIata}
      LIMIT 1
    `,
    airlineIata
      ? sql`SELECT airline_name FROM airline_master WHERE iata_code = ${airlineIata} LIMIT 1`
      : sql`SELECT NULL AS airline_name LIMIT 0`,
  ]);

  const airport = airportRows[0];
  const airline = airlineRows[0];

  const heading = [
    airline?.airline_name ?? airlineIata,
    "departures from",
    airport ? `${airport.airport_city}/${airport.airport_name}` : sourceIata,
    destinationCity ? `to ${destinationCity}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-blue-900 text-white px-6 py-4 shadow-lg">
        <a href="/" className="text-sky-300 hover:text-white text-sm transition-colors block mb-2">← Airport Finder</a>
        <div className="flex items-center gap-2">
          <span className="text-xl">✈</span>
          <h1 className="font-semibold text-lg">{heading}</h1>
        </div>
      </header>

      <div className="p-6 max-w-lg">
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left">
                <th className="px-4 py-3 font-semibold text-slate-600 w-28">Departure</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Destination</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-slate-400">
                  No departure data available.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
