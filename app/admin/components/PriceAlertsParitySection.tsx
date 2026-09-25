import type { PriceAlertsParityStatus } from "../data";
import { formatMismatchIds } from "../format";
import { StatCard } from "./StatCard";

export function PriceAlertsParitySection({
  status,
}: {
  status: PriceAlertsParityStatus;
}) {
  return (
    <div className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-700">
        Migration alertes Redis/Postgres
      </h2>
      {status.ok ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Parité"
              value={status.data.inSync ? "OK" : "Écart"}
              sub={status.data.inSync ? "Redis et Postgres alignés" : "vérifier les écarts ci-dessous"}
              color={status.data.inSync ? "green" : "amber"}
            />
            <StatCard
              label="Redis actives"
              value={status.data.redis.active}
              sub={`${status.data.redis.valid}/${status.data.redis.scanned} valides`}
              color="blue"
            />
            <StatCard
              label="Postgres actives"
              value={status.data.postgres.active}
              sub={`${status.data.postgres.total} miroir(s)`}
              color="purple"
            />
            <StatCard
              label="Écarts"
              value={
                status.data.missingInPostgres.length +
                status.data.extraInPostgres.length +
                status.data.activeMismatch.length
              }
              sub="missing + extra + active"
              color={status.data.inSync ? "green" : "amber"}
            />
          </div>
          {!status.data.inSync && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-semibold">Écarts de migration à corriger avant bascule de lecture.</p>
              <dl className="mt-3 grid gap-2">
                <div>
                  <dt className="font-medium">Manquantes dans Postgres</dt>
                  <dd className="font-mono text-xs">{formatMismatchIds(status.data.missingInPostgres)}</dd>
                </div>
                <div>
                  <dt className="font-medium">En trop dans Postgres</dt>
                  <dd className="font-mono text-xs">{formatMismatchIds(status.data.extraInPostgres)}</dd>
                </div>
                <div>
                  <dt className="font-medium">État actif différent</dt>
                  <dd className="font-mono text-xs">{formatMismatchIds(status.data.activeMismatch)}</dd>
                </div>
              </dl>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">Statut indisponible.</p>
          <p className="mt-1">{status.error}</p>
        </div>
      )}
    </div>
  );
}
