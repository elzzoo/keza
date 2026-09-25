export function AdminQuickLinks({ pushSubscriptions }: { pushSubscriptions: number }) {
  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2 text-xs">
        <a
          href="/api/admin/export/redis"
          download
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-600 hover:bg-gray-50"
        >
          Backup JSON Redis
        </a>
        <form method="POST" action="/api/admin/backfill/price-alerts">
          <button
            type="submit"
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-600 hover:bg-gray-50"
          >
            Dry-run backfill alertes
          </button>
        </form>
        <a
          href="/api/admin/backfill/price-alerts"
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-semibold text-gray-600 hover:bg-gray-50"
        >
          Statut Redis/Postgres alertes
        </a>
        <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-700">
          Actions cron désactivées depuis le navigateur: utiliser Authorization: Bearer CRON_SECRET.
        </span>
      </div>
      {pushSubscriptions > 0 && (
        <p className="mt-3 text-xs text-gray-400">
          Pour envoyer un push test, POST sur{" "}
          <code className="font-mono bg-gray-100 px-1 rounded">
            /api/push/test
          </code>{" "}
          avec le header Authorization: Bearer CRON_SECRET.
        </p>
      )}
    </>
  );
}
