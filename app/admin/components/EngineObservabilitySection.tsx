import type { AdminStats } from "../data";
import { StatCard } from "./StatCard";

type EngineStats = AdminStats["engineStats"];

function getHitRatePercent(row: EngineStats[number] | undefined): number | null {
  const total = (row?.cacheHits ?? 0) + (row?.cacheMisses ?? 0);
  return total > 0 && row ? Math.round((row.cacheHits / total) * 100) : null;
}

export function EngineObservabilitySection({ engineStats }: { engineStats: EngineStats }) {
  const today = engineStats[0];
  const todayHitRate = getHitRatePercent(today);

  return (
    <div className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-700">
        Moteur de recherche — 7 derniers jours
      </h2>

      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Recherches aujourd'hui"
          value={today?.searches ?? 0}
          sub="requêtes /api/search"
          color="blue"
        />
        <StatCard
          label="Cache hit rate"
          value={todayHitRate !== null ? `${todayHitRate}%` : "—"}
          sub="résultats depuis Redis"
          color="green"
        />
        <StatCard
          label="Duffel wins"
          value={today?.duffelWins ?? 0}
          sub="résultats haute confiance"
          color="purple"
        />
        <StatCard
          label="TP wins"
          value={today?.tpWins ?? 0}
          sub="résultats Travelpayouts"
          color="amber"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Recherches</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Cache %</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Duffel</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">TP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {engineStats.map((row) => {
              const hitRate = getHitRatePercent(row);
              return (
                <tr key={row.date} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{row.date}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{row.searches || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {hitRate !== null ? (
                      <span className={`font-semibold ${hitRate >= 50 ? "text-green-600" : "text-amber-600"}`}>
                        {hitRate}%
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-purple-600">{row.duffelWins || "—"}</td>
                  <td className="px-4 py-3 text-right text-amber-600">{row.tpWins || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
