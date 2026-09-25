import { formatDate } from "../format";

export function AdminHeader({ fetchedAt }: { fetchedAt: string | null }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Données en temps réel · {fetchedAt ? formatDate(fetchedAt) : "—"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
          Xalifly
        </span>
        <form method="POST" action="/api/admin/session?_method=DELETE">
          <button
            type="submit"
            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100"
          >
            Déconnexion
          </button>
        </form>
      </div>
    </div>
  );
}
