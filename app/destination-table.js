"use client";

export default function DestinationTable({ destinations, city, iata, airportName, airlineIata, airline }) {
  function openDepartures(d) {
    const params = new URLSearchParams({
      city,
      airport: airportName,
      iata,
      airline,
      airlineIata,
      destination: d.airport_city,
      destIata: d.iata_code,
    });
    window.open(`/popup?${params}`, "airport_popup", "width=900,height=650,resizable=yes,scrollbars=yes");
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-left">
            <th className="px-4 py-3 font-semibold text-slate-600">City</th>
            <th className="px-4 py-3 font-semibold text-slate-600">Airport</th>
            <th className="px-4 py-3 font-semibold text-slate-600">IATA</th>
            <th className="px-4 py-3 font-semibold text-slate-600">Country</th>
          </tr>
        </thead>
        <tbody>
          {destinations.map((d, i) => (
            <tr
              key={d.iata_code}
              onClick={() => openDepartures(d)}
              title={`Click for live departure timings to ${d.airport_name} in the next 12 hours`}
              className={`cursor-pointer hover:bg-blue-50${i > 0 ? " border-t border-slate-100" : ""}`}
            >
              <td className="px-4 py-3 font-medium text-slate-700">{d.airport_city}</td>
              <td className="px-4 py-3 text-slate-600">{d.airport_name}</td>
              <td className="px-4 py-3">
                <span className="bg-slate-100 text-slate-500 font-mono text-xs px-2 py-0.5 rounded">
                  {d.iata_code}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600">{d.airport_country_code}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
