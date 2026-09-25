import type { AdminStats, BackupStatus } from "../data";
import { formatDate } from "../format";

export function SystemDetailsSection({
  stats,
  backupStatus,
}: {
  stats: AdminStats;
  backupStatus: BackupStatus | null;
}) {
  const rows = [
    { label: "Alertes actives", value: stats.activeAlerts },
    { label: "Routes surveillées", value: stats.activeRoutes },
    { label: "Abonnements push", value: stats.pushSubscriptions },
    {
      label: "Dernier backup Redis",
      value: backupStatus?.lastAt
        ? `${formatDate(backupStatus.lastAt)} (${backupStatus.meta?.emailed ? "email envoyé" : backupStatus.meta?.warning ?? "snapshot créé"})`
        : "Jamais exécuté",
    },
    { label: "Cache deals", value: stats.dealsCached ? `Actif (TTL ${stats.dealsTtlSeconds}s)` : "Vide" },
    { label: "Dernier cron deals", value: stats.lastCronAt ?? "Jamais exécuté" },
    { label: "Données récupérées le", value: formatDate(stats.fetchedAt) },
  ];

  return (
    <div className="mt-8 rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-gray-700">Détails système</h2>
      </div>
      <table className="w-full text-sm">
        <tbody className="divide-y divide-gray-50">
          {rows.map(({ label, value }) => (
            <tr key={label}>
              <td className="px-6 py-3 font-medium text-gray-500">{label}</td>
              <td className="px-6 py-3 text-gray-900">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
