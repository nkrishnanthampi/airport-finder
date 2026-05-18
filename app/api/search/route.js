import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) return Response.json({ results: [] });

  const term = `%${q}%`;

  const rows = await sql`
    SELECT
      airport_city,
      airport_country_code,
      COUNT(*)::int AS airport_count
    FROM airport_master
    WHERE
      airport_city ILIKE ${term}
      OR iata_code ILIKE ${term}
      OR airport_name ILIKE ${term}
    GROUP BY airport_city, airport_country_code
    ORDER BY
      CASE WHEN UPPER(airport_city) = UPPER(${q}) THEN 0 ELSE 1 END,
      COUNT(*) DESC,
      airport_city
    LIMIT 15
  `;

  return Response.json({ results: rows });
}
