import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

console.log('DB URL loaded:', process.env.DATABASE_URL ? 'yes' : 'no');

import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const DATA_URL =
  'https://raw.githubusercontent.com/Jonty/airline-route-data/main/airline_routes.json';
const CACHE_PATH = path.join(process.cwd(), 'scripts', 'airline_routes.json');

// ---------- Step A: Download (or use cached copy) ----------
async function getData() {
  if (fs.existsSync(CACHE_PATH)) {
    const stats = fs.statSync(CACHE_PATH);
    const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
    console.log(`Using cached data (${ageHours.toFixed(1)}h old)`);
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
  }
  console.log('Downloading airline route data...');
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  const text = await response.text();
  fs.writeFileSync(CACHE_PATH, text);
  console.log(`Downloaded ${(text.length / 1024 / 1024).toFixed(1)} MB`);
  return JSON.parse(text);
}

// ---------- Step B: Helpers ----------
async function batchInsert(client, sql, values, batchSize = 1000) {
  // values is an array of arrays. We chunk it and run with parameterised
  // placeholders. The `sql` template should contain "VALUES %L" as a marker.
  let inserted = 0;
  for (let i = 0; i < values.length; i += batchSize) {
    const chunk = values.slice(i, i + batchSize);
    const placeholders = chunk
      .map(
        (row, rowIdx) =>
          `(${row.map((_, colIdx) => `$${rowIdx * row.length + colIdx + 1}`).join(',')})`
      )
      .join(',');
    const flatParams = chunk.flat();
    await client.query(sql.replace('%L', placeholders), flatParams);
    inserted += chunk.length;
    if (inserted % 5000 === 0 || inserted === values.length) {
      process.stdout.write(`\r  ...${inserted}/${values.length}`);
    }
  }
  process.stdout.write('\n');
}

// ---------- Step C: Main ----------
async function main() {
  const data = await getData();
  const airports = Object.values(data);
  console.log(`Loaded ${airports.length} airports from JSON`);

  // Connect to Postgres
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Connected to database');

  // ----- Airports: UPSERT -----
  // Note: country_code in the JSON is 2-letter; we'll store it raw and
  // resolve it via the alpha2_code column on country_master later.
  console.log('\nUpserting airports...');
  const airportRows = airports
    .filter((a) => a.iata && a.country_code)
    .map((a) => [
      a.iata,
      a.name || a.iata,
      a.city_name || '',
      a.country_code, // 2-letter for now; we'll fix below
      a.icao || null,
      a.latitude ? parseFloat(a.latitude) : null,
      a.longitude ? parseFloat(a.longitude) : null,
    ]);

  // Build an interim map: 2-letter -> 3-letter from country_master
  const { rows: countryRows } = await client.query(
    `SELECT alpha2_code, alpha3_code FROM country_master WHERE alpha2_code IS NOT NULL`
  );
  const a2to3 = new Map(countryRows.map((r) => [r.alpha2_code, r.alpha3_code]));
  console.log(`  ${a2to3.size} country mappings available`);

  // Filter to airports we can map; warn about the rest
  const mappableAirports = airportRows
    .map((row) => {
      const a3 = a2to3.get(row[3]);
      return a3 ? [row[0], row[1], row[2], a3, row[4], row[5], row[6]] : null;
    })
    .filter(Boolean);

  const unmappedCountries = new Set(
    airportRows.filter((row) => !a2to3.has(row[3])).map((row) => row[3])
  );
  if (unmappedCountries.size > 0) {
    console.log(
      `  ⚠ Skipping ${airportRows.length - mappableAirports.length} airports in unmapped countries: ${[...unmappedCountries].sort().join(', ')}`
    );
  }

  await batchInsert(
    client,
    `INSERT INTO airport_master
       (iata_code, airport_name, airport_city, airport_country_code,
        icao_code, latitude, longitude)
     VALUES %L
     ON CONFLICT (iata_code) DO UPDATE SET
       airport_name = EXCLUDED.airport_name,
       airport_city = EXCLUDED.airport_city,
       airport_country_code = EXCLUDED.airport_country_code,
       icao_code = COALESCE(EXCLUDED.icao_code, airport_master.icao_code),
       latitude = COALESCE(EXCLUDED.latitude, airport_master.latitude),
       longitude = COALESCE(EXCLUDED.longitude, airport_master.longitude)`,
    mappableAirports
  );
  console.log(`  ${mappableAirports.length} airports upserted`);

  // ----- Airlines: extract unique carriers, UPSERT -----
  console.log('\nUpserting airlines...');
  const airlineMap = new Map(); // iata -> name
  for (const airport of airports) {
    for (const route of airport.routes || []) {
      for (const carrier of route.carriers || []) {
        if (carrier.iata && carrier.name && !airlineMap.has(carrier.iata)) {
          airlineMap.set(carrier.iata, carrier.name);
        }
      }
    }
  }
  const airlineRows = [...airlineMap.entries()].map(([iata, name]) => [iata, name]);
  console.log(`  ${airlineRows.length} unique airlines found in routes`);

  await batchInsert(
    client,
    `INSERT INTO airline_master (iata_code, airline_name)
     VALUES %L
     ON CONFLICT DO NOTHING`,
    airlineRows
  );

  // We use ON CONFLICT DO NOTHING because there's no unique constraint
  // on iata_code (you'd need to add one to UPSERT properly). Existing
  // airlines (your curated 28) won't get re-inserted; new ones will.
  // If you want to refresh names for existing airlines, add a UNIQUE
  // constraint on airline_master.iata_code first.

  // ----- Build airline IATA -> id map for the routes load -----
  const { rows: allAirlines } = await client.query(
    `SELECT id, iata_code FROM airline_master WHERE iata_code IS NOT NULL`
  );
  const airlineIdMap = new Map(allAirlines.map((a) => [a.iata_code, a.id]));
  console.log(`  ${airlineIdMap.size} airlines ready for route mapping`);

  // ----- Routes: explode (airport, route, carriers[]) into rows -----
  console.log('\nInserting routes...');
  const validIatas = new Set();
  {
    const { rows } = await client.query(`SELECT iata_code FROM airport_master`);
    rows.forEach((r) => validIatas.add(r.iata_code));
  }

  const routeRows = [];
  let skippedNoAirport = 0;
  let skippedNoAirline = 0;
  for (const airport of airports) {
    if (!validIatas.has(airport.iata)) continue;
    for (const route of airport.routes || []) {
      if (!validIatas.has(route.iata)) {
        skippedNoAirport++;
        continue;
      }
      for (const carrier of route.carriers || []) {
        const airlineId = airlineIdMap.get(carrier.iata);
        if (!airlineId) {
          skippedNoAirline++;
          continue;
        }
        routeRows.push([
          airlineId,
          airport.iata,
          route.iata,
          route.km ?? null,
          route.min ?? null,
        ]);
      }
    }
  }
  console.log(`  ${routeRows.length} route rows to insert`);
  if (skippedNoAirport) console.log(`  (skipped ${skippedNoAirport} routes with unknown airports)`);
  if (skippedNoAirline) console.log(`  (skipped ${skippedNoAirline} routes with unknown airlines)`);

  // Clear existing routes before inserting (simpler than UPSERT for now)
  await client.query(`TRUNCATE TABLE routes RESTART IDENTITY`);
  await batchInsert(
    client,
    `INSERT INTO routes
       (airline_id, source_iata, destination_iata, distance_km, duration_min)
     VALUES %L
     ON CONFLICT (airline_id, source_iata, destination_iata) DO NOTHING`,
    routeRows
  );

  // ----- Done -----
  const { rows: counts } = await client.query(`
    SELECT
      (SELECT count(*) FROM airport_master) AS airports,
      (SELECT count(*) FROM airline_master) AS airlines,
      (SELECT count(*) FROM routes) AS routes
  `);
  console.log('\n✓ Load complete:');
  console.log(`  airports: ${counts[0].airports}`);
  console.log(`  airlines: ${counts[0].airlines}`);
  console.log(`  routes:   ${counts[0].routes}`);

  await client.end();
}

main().catch((err) => {
  console.error('\n✗ Load failed:', err);
  process.exit(1);
});