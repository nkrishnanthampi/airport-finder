import { sql } from "@/lib/db";
import CitySelect from "./city-select";
import DestinationTable from "./destination-table";
import AllDestinationsTable from "./all-destinations-table";
import AirlineLogo from "./airline-logo";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }) {
  const params = await searchParams;
  const selectedCity = params?.city ?? "";
  const selectedAirport = params?.airport ?? "";
  const selectedAirline = params?.airline ?? "";
  const mode = params?.mode ?? "";

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

  let allDestinations = [];
  if (selectedCity && mode === "all") {
    allDestinations = await sql`
      SELECT DISTINCT am.iata_code, am.airport_name, am.airport_city, am.airport_country_code
      FROM routes r
      JOIN airport_master src ON r.source_iata = src.iata_code
      JOIN airport_master am ON r.destination_iata = am.iata_code
      WHERE src.airport_city = ${selectedCity}
        AND src.airport_country_code = 'GBR'
      ORDER BY am.airport_city, am.airport_name
    `;
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden">

      {/* Header */}
      <header className="shrink-0 bg-gradient-to-r from-sky-800 to-indigo-900 text-white px-4 sm:px-6 py-3 flex items-center gap-4 shadow-lg">
        <a href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center shadow-sm shrink-0">
            <span className="text-sm">✈</span>
          </div>
          <div className="leading-tight hidden sm:block">
            <span className="font-bold tracking-tight text-sm block font-display">Airport Finder</span>
            <span className="text-sky-300 text-xs">UK departures</span>
          </div>
        </a>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <span className="text-sky-300 text-xs hidden sm:block">Flying from</span>
          <CitySelect cities={cities} selectedCity={selectedCity} />
        </div>
      </header>

      {/* Breadcrumb */}
      {selectedCity && (
        <nav className="shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-2 text-sm text-slate-500 flex items-center gap-1 overflow-x-auto">
          <a href={`?city=${encodeURIComponent(selectedCity)}`} className="hover:text-sky-600 transition-colors whitespace-nowrap">
            {selectedCity}
          </a>
          {mode === "all" && (
            <>
              <span className="mx-1 text-slate-300">›</span>
              <span className="text-slate-700 font-medium whitespace-nowrap">All destinations</span>
            </>
          )}
          {activeAirport && mode !== "all" && (
            <>
              <span className="mx-1 text-slate-300">›</span>
              <a
                href={`?city=${encodeURIComponent(selectedCity)}&airport=${activeAirport.iata_code}`}
                className="hover:text-sky-600 transition-colors whitespace-nowrap"
              >
                {activeAirport.airport_name}
              </a>
            </>
          )}
          {activeAirline && (
            <>
              <span className="mx-1 text-slate-300">›</span>
              <span className="text-slate-700 font-medium whitespace-nowrap">{activeAirline.airline_name}</span>
            </>
          )}
        </nav>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">

        {/* Empty state hero */}
        {!selectedCity && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-6 px-4 animate-fade-in">
            <div className="text-6xl animate-bounce">✈️</div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-slate-800 mb-2 leading-tight">
                Where are you flying from?
              </h1>
              <p className="text-slate-500 text-base max-w-sm mx-auto">
                Explore every airline, route, and live departure time from any UK airport.
              </p>
            </div>
            <div className="w-full max-w-xs">
              <CitySelect cities={cities} selectedCity={selectedCity} size="lg" />
            </div>
            <p className="text-xs text-slate-400">Covering all major UK departure airports</p>
          </div>
        )}

        {/* City landing */}
        {selectedCity && !mode && !selectedAirport && !activeAirline && (
          <div className="max-w-xl animate-slide-up">
            <h2 className="text-xl font-bold font-display text-slate-800 mb-4">
              Flying from {selectedCity}
            </h2>
            <div className="flex flex-col gap-3">
              <a
                href={`?city=${encodeURIComponent(selectedCity)}&mode=all`}
                className="bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-xl px-5 py-4 hover:from-sky-700 hover:to-indigo-700 transition-all flex items-center gap-3 shadow-md hover:shadow-lg"
              >
                <span className="text-2xl shrink-0">🌍</span>
                <div className="flex-1">
                  <div className="font-bold text-base">See all destinations</div>
                  <div className="text-sky-200 text-sm">Every city reachable, across all airports and airlines</div>
                </div>
                <span className="text-sky-300 text-xl shrink-0">›</span>
              </a>
              <a
                href={airportsInCity.length === 1
                  ? `?city=${encodeURIComponent(selectedCity)}&airport=${airportsInCity[0]?.iata_code}`
                  : `?city=${encodeURIComponent(selectedCity)}&browse=1`}
                className="bg-white rounded-xl border-2 border-slate-200 px-5 py-4 hover:border-sky-400 hover:shadow-md transition-all flex items-center gap-3"
              >
                <span className="text-2xl shrink-0">✈️</span>
                <div className="flex-1">
                  <div className="font-bold text-slate-800">Browse by airline</div>
                  <div className="text-slate-400 text-sm">Choose an airport and airline to see their routes</div>
                </div>
                <span className="text-slate-300 text-xl shrink-0">›</span>
              </a>
            </div>
          </div>
        )}

        {/* Multiple airports — pick one */}
        {selectedCity && params?.browse === "1" && airportsInCity.length > 1 && !activeAirport && (
          <div className="max-w-xl animate-slide-up">
            <h2 className="text-xl font-bold font-display text-slate-800 mb-1">
              Choose an airport
            </h2>
            <p className="text-slate-500 text-sm mb-4">Select which airport you're departing from</p>
            <div className="flex flex-col gap-2">
              {airportsInCity.map((a) => (
                <a
                  key={a.iata_code}
                  href={`?city=${encodeURIComponent(selectedCity)}&airport=${a.iata_code}`}
                  className="bg-white rounded-xl border-2 border-slate-200 px-4 py-3.5 hover:border-sky-400 hover:shadow-sm transition-all flex items-center gap-3 group"
                >
                  <span className="bg-sky-100 text-sky-700 font-mono font-bold text-sm px-2.5 py-1 rounded-lg shrink-0">
                    {a.iata_code}
                  </span>
                  <span className="text-slate-700 font-medium flex-1">{a.airport_name}</span>
                  <span className="text-slate-300 group-hover:text-sky-500 transition-colors text-xl">›</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* All destinations from city */}
        {selectedCity && mode === "all" && (
          <div className="animate-slide-up">
            <div className="flex items-baseline gap-2 mb-4">
              <h2 className="text-xl font-bold font-display text-slate-800">All destinations</h2>
              <span className="text-slate-500 text-sm">
                {allDestinations.length} {allDestinations.length !== 1 ? "cities" : "city"} from {selectedCity}
              </span>
            </div>
            {allDestinations.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <span className="text-3xl">🔍</span>
                <p className="mt-2">No destinations found for {selectedCity}.</p>
              </div>
            ) : (
              <AllDestinationsTable destinations={allDestinations} sourceCity={selectedCity} />
            )}
          </div>
        )}

        {/* Airlines list */}
        {activeAirport && selectedAirport && !activeAirline && mode !== "all" && (
          <div className="max-w-xl animate-slide-up">
            <div className="flex items-baseline gap-2 mb-4">
              <h2 className="text-xl font-bold font-display text-slate-800">Airlines</h2>
              <span className="text-slate-500 text-sm">flying from {activeAirport.airport_name}</span>
            </div>
            {airlines.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <span className="text-3xl">✈</span>
                <p className="mt-2">No airlines found for this airport.</p>
              </div>
            ) : (
              <>
                <p className="text-slate-500 text-sm mb-3">Click an airline to see where they fly</p>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  {airlines.map((a, i) => (
                    <a
                      key={a.iata_code}
                      href={`?city=${encodeURIComponent(selectedCity)}&airport=${activeAirport.iata_code}&airline=${a.iata_code}`}
                      className={`flex items-center gap-3 px-4 py-3.5 hover:bg-sky-50 transition-colors group${i > 0 ? " border-t border-slate-100" : ""}`}
                    >
                      <AirlineLogo iata={a.iata_code} name={a.airline_name} className="w-8 h-8" />
                      <span className="bg-slate-100 text-slate-500 font-mono text-xs px-2 py-0.5 rounded-md shrink-0">
                        {a.iata_code}
                      </span>
                      <span className="text-slate-700 font-medium flex-1">{a.airline_name}</span>
                      <span className="text-slate-300 group-hover:text-sky-500 transition-colors text-xl">›</span>
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Destinations */}
        {activeAirport && activeAirline && (
          <div className="animate-slide-up">
            <div className="flex items-baseline gap-2 mb-4">
              <h2 className="text-xl font-bold font-display text-slate-800">Destinations</h2>
              <span className="text-slate-500 text-sm">
                {destinations.length} {destinations.length !== 1 ? "routes" : "route"} · {activeAirline.airline_name} from {activeAirport.iata_code}
              </span>
            </div>
            {destinations.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <span className="text-3xl">🔍</span>
                <p className="mt-2">No destinations found.</p>
              </div>
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
