import { sql } from "@/lib/db";
import CitySelect from "./city-select";
import DestinationTable from "./destination-table";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }) {
  const params = await searchParams;
  const selectedCity = params?.city ?? "";
  const selectedAirport = params?.airport ?? "";
  const selectedAirline = params?.airline ?? "";

  const cities = await sql`
    SELECT DISTINCT airport_city
    FROM airport_master
    WHERE airport_country_code = 'GBR'
    ORDER BY airport_city
  `;

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

  let activeAirport = null;
  if (selectedAirport) {
    activeAirport = airportsInCity.find((a) => a.iata_code === selectedAirport) ?? null;
  } else if (airportsInCity.length === 1) {
    activeAirport = airportsInCity[0];
  }

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
    <main className="flex-1 flex flex-col overflow-hidden">

      {/* Header */}
      <header className="shrink-0 bg-blue-900 text-white px-6 py-4 flex items-center gap-6 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-xl">✈</span>
          <span className="font-semibold tracking-wide">Airport Finder</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-blue-300">City</span>
          <CitySelect cities={cities} selectedCity={selectedCity} />
          {!selectedCity && (
            <span className="text-blue-300 italic"> Select a city to see where all you can fly to from here!</span>
          )}
        </div>
      </header>

      {/* Breadcrumb */}
      {selectedCity && (
        <nav className="shrink-0 bg-white border-b border-slate-200 px-6 py-2 text-sm text-slate-500 flex items-center gap-1">
          <a href="/" className="hover:text-blue-600 transition-colors">{selectedCity}</a>
          {activeAirport && (
            <>
              <span className="mx-1">›</span>
              <a
                href={`?city=${encodeURIComponent(selectedCity)}&airport=${activeAirport.iata_code}`}
                className="hover:text-blue-600 transition-colors"
              >
                {activeAirport.airport_name}
              </a>
            </>
          )}
          {activeAirline && (
            <>
              <span className="mx-1">›</span>
              <span className="text-slate-700 font-medium">{activeAirline.airline_name}</span>
            </>
          )}
        </nav>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto bg-slate-100 p-6">

        {/* Empty state */}
        {!selectedCity && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <span className="text-5xl">✈</span>
            <p className="text-slate-500 text-lg">Select a city above to get started</p>
          </div>
        )}

        {/* Multiple airports — pick one */}
        {selectedCity && airportsInCity.length > 1 && !activeAirport && (
          <div className="max-w-xl">
            <h2 className="text-slate-600 font-medium mb-3 text-sm uppercase tracking-wider">
              Select an airport to see all airlines that fly out of here {selectedCity}
            </h2>
            <div className="flex flex-col gap-2">
              {airportsInCity.map((a) => (
                <a
                  key={a.iata_code}
                  href={`?city=${encodeURIComponent(selectedCity)}&airport=${a.iata_code}`}
                  className="bg-white rounded-lg border border-slate-200 px-4 py-3 hover:border-blue-400 hover:shadow-sm transition-all flex items-center gap-3"
                >
                  <span className="bg-blue-100 text-blue-700 font-bold text-sm px-2 py-0.5 rounded shrink-0">
                    {a.iata_code}
                  </span>
                  <span className="text-slate-700">{a.airport_name}</span>
                  <span className="ml-auto text-slate-400">›</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Airlines list */}
        {activeAirport && !activeAirline && (
          <div className="max-w-xl">
            <h2 className="text-slate-600 font-medium mb-3 text-sm uppercase tracking-wider">
              Click on an airline to see where they fly to from here 
            </h2>
            {airlines.length === 0 ? (
              <p className="text-slate-500">No airlines found for this airport.</p>
            ) : (
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                {airlines.map((a, i) => (
                  <a
                    key={a.iata_code}
                    href={`?city=${encodeURIComponent(selectedCity)}&airport=${activeAirport.iata_code}&airline=${a.iata_code}`}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors${i > 0 ? " border-t border-slate-100" : ""}`}
                  >
                    <span className="bg-slate-100 text-slate-500 font-mono text-xs px-2 py-0.5 rounded shrink-0">
                      {a.iata_code}
                    </span>
                    <span className="text-slate-700 font-medium">{a.airline_name}</span>
                    <span className="ml-auto text-slate-400">›</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Destinations */}
        {activeAirport && activeAirline && (
          <div>
            <h2 className="text-slate-600 font-medium mb-3 text-sm uppercase tracking-wider">
              {destinations.length} destination{destinations.length !== 1 ? "s" : ""} · {activeAirline.airline_name} from {activeAirport.iata_code}
            </h2>
            {destinations.length === 0 ? (
              <p className="text-slate-500">No destinations found.</p>
            ) : (
              <DestinationTable
                destinations={destinations}
                city={selectedCity}
                iata={activeAirport.iata_code}
                airportName={activeAirport.airport_name}
                airlineIata={activeAirline.iata_code}
                airline={activeAirline.airline_name}
              />
            )}
          </div>
        )}

      </div>
    </main>
  );
}
