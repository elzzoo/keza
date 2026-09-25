import type { AdminStats, BackupStatus } from "../data";
import { formatDate, formatTtl } from "../format";
import { StatCard } from "./StatCard";

export function AdminOverviewSection({
  stats,
  backupStatus,
}: {
  stats: AdminStats;
  backupStatus: BackupStatus | null;
}) {
  return (
    <>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Alertes actives"
          value={stats.activeAlerts}
          sub={`${stats.activeRoutes} route${stats.activeRoutes !== 1 ? "s" : ""}`}
          color="blue"
        />
        <StatCard
          label="Push legacy"
          value={stats.pushSubscriptions}
          sub="clé globale dépréciée"
          color="purple"
        />
        <StatCard
          label="Deals en cache"
          value={stats.dealsCached ? "✅" : "❌"}
          sub={stats.dealsCached ? formatTtl(stats.dealsTtlSeconds) : "aucun cache"}
          color={stats.dealsCached ? "green" : "amber"}
        />
        <StatCard
          label="Dernier cron"
          value={stats.lastCronAt ? "✅" : "—"}
          sub={formatDate(stats.lastCronAt)}
          color={stats.lastCronAt ? "green" : "amber"}
        />
      </div>

      {backupStatus && (
        <div className="mt-4">
          <StatCard
            label="Backup Redis"
            value={backupStatus.lastAt ? (backupStatus.meta?.emailed ? "Envoyé" : "Snapshot") : "—"}
            sub={
              backupStatus.lastAt
                ? `${formatDate(backupStatus.lastAt)}${backupStatus.meta?.warning ? " · email non configuré" : ""}`
                : "aucun backup enregistré"
            }
            color={backupStatus.lastAt ? (backupStatus.meta?.emailed ? "green" : "amber") : "purple"}
          />
        </div>
      )}
    </>
  );
}
