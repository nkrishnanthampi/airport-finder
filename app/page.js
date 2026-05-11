import { sql } from "@/lib/db";
import CitySelect from "./city-select";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }) {
  const params = await searchParams;
  const selectedCity = params?.city ?? "";
  const selectedAirport = params?.airport ?? "";
  const selectedAirline = params?.airline ?? "";

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

  // Airlines flying out of the active airport
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

  // Destinations for the selected airline from the active airport
  let activeAirline = null;
  let destinations = [];
  if (activeAirport && selectedAirline) {
    activeAirline = airlines.find((a) => a.iata_code === selectedAirline) ?? null;
    if (activeAirline) {
      destinations = await sql`
        SELECT am.iata_code, am.airport_name, am.airport_city, am.airport_country_code
        FROM routes r
        JOIN airport_master am ON r.destination_iata = am.iata_code
        JOIN airline_master al ON r.airline_id = al.id
        WHERE r.source_iata = ${activeAirport.iata_code}
          AND al.iata_code = ${selectedAirline}
        ORDER BY am.airport_city, am.airport_name
      `;
    }
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui", maxWidth: "800px" }}>
      <h1>Destinations that airlines fly to from a specific city </h1>

      <div style={{ marginBottom: "2rem" }}>
        <label>
          City:{" "}
          <CitySelect cities={cities} selectedCity={selectedCity} />
        </label>
      </div>

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

      {activeAirport && !activeAirline && (
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
                  <tr key={a.iata_code} style={{ cursor: "pointer" }}>
                    <td style={td}>
                      <a
                        href={`?city=${encodeURIComponent(selectedCity)}&airport=${activeAirport.iata_code}&airline=${a.iata_code}`}
                        style={{ textDecoration: "none", color: "#0070f3" }}
                      >
                        {a.airline_name}
                      </a>
                    </td>
                    <td style={td}>{a.iata_code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {activeAirport && activeAirline && (
        <section>
          <h2>
            {activeAirline.airline_name} destinations from {activeAirport.airport_name} ({activeAirport.iata_code})
          </h2>
          <p>
            <a href={`?city=${encodeURIComponent(selectedCity)}&airport=${activeAirport.iata_code}`}>
              ← back to airlines at {activeAirport.airport_name}
            </a>
          </p>
          {destinations.length === 0 ? (
            <p>No destinations found.</p>
          ) : (
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th style={th}>City</th>
                  <th style={th}>Airport</th>
                  <th style={th}>IATA</th>
                  <th style={th}>Country</th>
                </tr>
              </thead>
              <tbody>
                {destinations.map((d) => (
                  <tr key={d.iata_code}>
                    <td style={td}>{d.airport_city}</td>
                    <td style={td}>{d.airport_name}</td>
                    <td style={td}>{d.iata_code}</td>
                    <td style={td}>{d.airport_country_code}</td>
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
