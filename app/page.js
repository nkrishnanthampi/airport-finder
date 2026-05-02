import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }) {
  const params = await searchParams;
  const selectedCity = params?.city ?? "";
  const selectedAirport = params?.airport ?? "";

  // City dropdown — UK only
  const cities = await sql`
    SELECT DISTINCT airport_city
    FROM airport_master
    WHERE airport_country_code = 'GBR'
    ORDER BY airport_city
  `;

  // Airports in the selected city
  let airportsInCity = [];
  if (selectedCity) {
    airportsInCity = await sql`
      SELECT iata_code, airport_name
      FROM airport_master
      WHERE airport_city = ${selectedCity}
        AND airport_country_code = 'GBR'
      ORDER BY airport_name
    `;
  }

  // Active airport: explicit choice, or auto-pick if city has only one
  let activeAirport = null;
  if (selectedAirport) {
    activeAirport = airportsInCity.find((a) => a.iata_code === selectedAirport) ?? null;
  } else if (airportsInCity.length === 1) {
    activeAirport = airportsInCity[0];
  }

  // Real query: airlines flying out of the active airport
  let airlines = [];
  if (activeAirport) {
    airlines = await sql`
      SELECT DISTINCT al.iata_code, al.airline_name
      FROM routes r
      JOIN airline_master al ON r.airline_id = al.id
      WHERE r.source_iata = ${activeAirport.iata_code}
      ORDER BY al.airline_name
    `;
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui", maxWidth: "800px" }}>
      <h1>Airlines from UK airports</h1>

      <form method="get" style={{ marginBottom: "2rem" }}>
        <label>
          City:{" "}
          <select name="city" defaultValue={selectedCity}>
            <option value="">-- choose a city --</option>
            {cities.map((c) => (
              <option key={c.airport_city} value={c.airport_city}>
                {c.airport_city}
              </option>
            ))}
          </select>
        </label>{" "}
        <button type="submit">Go</button>
      </form>

      {selectedCity && airportsInCity.length > 1 && !activeAirport && (
        <section style={{ marginBottom: "2rem" }}>
          <h2>{selectedCity} has multiple airports — pick one</h2>
          <ul>
            {airportsInCity.map((a) => (
              <li key={a.iata_code}>
                <a href={`?city=${encodeURIComponent(selectedCity)}&airport=${a.iata_code}`}>
                  {a.airport_name} ({a.iata_code})
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeAirport && (
        <section>
          <h2>
            Airlines flying from {activeAirport.airport_name} ({activeAirport.iata_code})
          </h2>
          {airportsInCity.length > 1 && (
            <p>
              <a href={`?city=${encodeURIComponent(selectedCity)}`}>
                ← back to {selectedCity} airports
              </a>
            </p>
          )}
          {airlines.length === 0 ? (
            <p>No airlines found for this airport.</p>
          ) : (
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th style={th}>Airline</th>
                  <th style={th}>IATA</th>
                </tr>
              </thead>
              <tbody>
                {airlines.map((a) => (
                  <tr key={a.iata_code}>
                    <td style={td}>{a.airline_name}</td>
                    <td style={td}>{a.iata_code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </main>
  );
}

const th = { textAlign: "left", borderBottom: "2px solid #333", padding: "0.5rem" };
const td = { borderBottom: "1px solid #ccc", padding: "0.5rem" };
