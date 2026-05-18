import { sql } from "@/lib/db";
import AirportSearch from "./airport-search";
import AllDestinationsTable from "./all-destinations-table";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const city = params?.city ?? "";
  const airport = params?.airport ?? "";
  const mode = params?.mode ?? "";

  if (!city) return { title: "Airline Finder" };
  if (mode === "all") return { title: `All destinations from ${city} | Airline Finder` };
  if (airport) return { title: `Destinations from ${airport} | Airline Finder` };
  return { title: `Flying from ${city} | Airline Finder` };
}

export default async function Home({ searchParams }) {
  const params = await searchParams;
  const selectedCity = params?.city ?? "";
  const selectedCountry = params?.country ?? "";
  const selectedAirport = params?.airport ?? "";
  const mode = params?.mode ?? "";

  // Only query city airports when both city and country are known
  let airportsInCity = [];
  if (selectedCity && selectedCountry) {
    airportsInCity = await sql`
      SELECT iata_code, airport_name
      FROM airport_master
      WHERE airport_city = ${selectedCity}
        AND airport_country_code = ${selectedCountry}
      ORDER BY airport_name
    `;
  }

  let activeAirport = null;
  if (selectedAirport) {
    activeAirport = airportsInCity.find((a) => a.iata_code === selectedAirport) ?? null;
  } else if (airportsInCity.length === 1) {
    activeAirport = airportsInCity[0];
  }

  // Destinations reachable from the selected airport
  let airportDestinations = [];
  if (activeAirport && mode !== "all") {
    airportDestinations = await sql`
      SELECT DISTINCT am.iata_code, am.airport_name, am.airport_city, am.airport_country_code
      FROM routes r
      JOIN airport_master am ON r.destination_iata = am.iata_code
      WHERE r.source_iata = ${activeAirport.iata_code}
      ORDER BY am.airport_city, am.airport_name
    `;
  }

  // All destinations reachable from any airport in the selected city
  let allDestinations = [];
  if (selectedCity && selectedCountry && mode === "all") {
    allDestinations = await sql`
      SELECT DISTINCT am.iata_code, am.airport_name, am.airport_city, am.airport_country_code
      FROM routes r
      JOIN airport_master src ON r.source_iata = src.iata_code
      JOIN airport_master am ON r.destination_iata = am.iata_code
      WHERE src.airport_city = ${selectedCity}
        AND src.airport_country_code = ${selectedCountry}
      ORDER BY am.airport_city, am.airport_name
    `;
  }

  const cityParams = selectedCity
    ? `city=${encodeURIComponent(selectedCity)}&country=${selectedCountry}`
    : "";

  return (
    <main className="flex-1 flex flex-col overflow-hidden">

      {/* Header */}
      <header className="shrink-0 bg-gradient-to-r from-sky-800 to-indigo-900 text-white px-4 sm:px-6 py-3 flex items-center gap-4 shadow-lg">
        <a href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center shadow-sm shrink-0">
            <span className="text-sm">✈</span>
          </div>
          <div className="leading-tight hidden sm:block">
            <span className="font-bold tracking-tight text-sm block font-display">Airline Finder</span>
            <span className="text-sky-300 text-xs">Global departures</span>
          </div>
        </a>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <span className="text-sky-300 text-xs hidden sm:inline">Flying from</span>
          <AirportSearch selectedCity={selectedCity} />
        </div>
      </header>

      {/* Breadcrumb */}
      {selectedCity && selectedCountry && (
        <nav className="shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-2 text-sm text-slate-500 flex items-center gap-1 overflow-x-auto">
          <a href="/" className="hover:text-sky-600 transition-colors whitespace-nowrap">Home</a>
          <span className="mx-1 text-slate-300">›</span>
          <a href={`?${cityParams}`} className="hover:text-sky-600 transition-colors whitespace-nowrap">
            {selectedCity}
            <span className="ml-1 text-slate-400 text-xs">{selectedCountry}</span>
          </a>
          {mode === "all" && (
            <>
              <span className="mx-1 text-slate-300">›</span>
              <span className="text-slate-700 font-medium whitespace-nowrap">All destinations</span>
            </>
          )}
          {params?.browse === "1" && !activeAirport && mode !== "all" && (
            <>
              <span className="mx-1 text-slate-300">›</span>
              <span className="text-slate-700 font-medium whitespace-nowrap">Select airport</span>
            </>
          )}
          {activeAirport && mode !== "all" && (
            <>
              <span className="mx-1 text-slate-300">›</span>
              <span className="text-slate-700 font-medium whitespace-nowrap">{activeAirport.airport_name}</span>
            </>
          )}
        </nav>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6">

        {/* Empty state hero */}
        {(!selectedCity || !selectedCountry) && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-6 px-4 animate-fade-in">
            <div className="text-6xl animate-bounce">✈️</div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-slate-800 mb-2 leading-tight">
                Where are you flying from?
              </h1>
              <p className="text-slate-500 text-base max-w-sm mx-auto">
                Explore every airline and route from any airport worldwide.
              </p>
            </div>
            <div className="w-full max-w-xs">
              <AirportSearch selectedCity={selectedCity} size="lg" />
            </div>
            <p className="text-xs text-slate-400">Covering airports worldwide</p>
          </div>
        )}

        {/* City landing */}
        {selectedCity && selectedCountry && !mode && !params?.browse && !selectedAirport && !activeAirport && (
          <div className="max-w-xl animate-slide-up">
            <h2 className="text-xl font-bold font-display text-slate-800 mb-4">
              Flying from {selectedCity}
            </h2>
            <div className="flex flex-col gap-3">
              <a
                href={`?${cityParams}&mode=all`}
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
                  ? `?${cityParams}&airport=${airportsInCity[0]?.iata_code}`
                  : `?${cityParams}&browse=1`}
                className="bg-white rounded-xl border-2 border-slate-200 px-5 py-4 hover:border-sky-400 hover:shadow-md transition-all flex items-center gap-3"
              >
                <span className="text-2xl shrink-0">✈️</span>
                <div className="flex-1">
                  <div className="font-bold text-slate-800">Browse by airport</div>
                  <div className="text-slate-400 text-sm">Choose an airport to see all its destinations</div>
                </div>
                <span className="text-slate-300 text-xl shrink-0">›</span>
              </a>
            </div>
          </div>
        )}

        {/* Multiple airports — pick one */}
        {selectedCity && selectedCountry && params?.browse === "1" && airportsInCity.length > 1 && !activeAirport && (
          <div className="max-w-xl animate-slide-up">
            <h2 className="text-xl font-bold font-display text-slate-800 mb-1">
              Choose an airport
            </h2>
            <p className="text-slate-500 text-sm mb-4">Select which airport you're departing from</p>
            <div className="flex flex-col gap-2">
              {airportsInCity.map((a) => (
                <a
                  key={a.iata_code}
                  href={`?${cityParams}&airport=${a.iata_code}`}
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

        {/* Destinations from selected airport */}
        {activeAirport && mode !== "all" && (
          <div className="animate-slide-up">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-1">
              <h2 className="text-xl font-bold font-display text-slate-800">Destinations</h2>
              <span className="text-slate-500 text-sm">
                {airportDestinations.length} {airportDestinations.length !== 1 ? "destinations" : "destination"} from {activeAirport.airport_name}
              </span>
            </div>
            <a
              href={`?${cityParams}&mode=all`}
              className="inline-block text-xs text-sky-600 hover:underline mb-4"
            >
              See all destinations from {selectedCity} →
            </a>
            {airportDestinations.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <span className="text-3xl">🔍</span>
                <p className="mt-2">No destinations found for {activeAirport.airport_name}.</p>
              </div>
            ) : (
              <AllDestinationsTable
                destinations={airportDestinations}
                sourceCity={selectedCity}
                sourceCountry={selectedCountry}
                sourceIata={activeAirport.iata_code}
              />
            )}
          </div>
        )}

        {/* All destinations from city */}
        {selectedCity && selectedCountry && mode === "all" && (
          <div className="animate-slide-up">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-1">
              <h2 className="text-xl font-bold font-display text-slate-800">All destinations</h2>
              <span className="text-slate-500 text-sm">
                {allDestinations.length} {allDestinations.length !== 1 ? "cities" : "city"} from {selectedCity}
              </span>
            </div>
            <a
              href={`?${cityParams}&browse=1`}
              className="inline-block text-xs text-sky-600 hover:underline mb-4"
            >
              Browse by airport instead →
            </a>
            {allDestinations.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <span className="text-3xl">🔍</span>
                <p className="mt-2">No destinations found for {selectedCity}.</p>
              </div>
            ) : (
              <AllDestinationsTable
                destinations={allDestinations}
                sourceCity={selectedCity}
                sourceCountry={selectedCountry}
              />
            )}
          </div>
        )}

      </div>
    </main>
  );
}
