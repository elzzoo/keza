export function LoginForm({ hasError }: { hasError: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Admin Xalifly</h1>
        <p className="mt-1 text-sm text-gray-500">
          Accès restreint. Entrez le secret admin.
        </p>
        {hasError && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Secret incorrect. Réessayez.
          </p>
        )}
        <form method="POST" action="/api/admin/session" className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Secret</span>
            <input
              type="password"
              name="secret"
              autoComplete="off"
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Accéder →
          </button>
        </form>
      </div>
    </div>
  );
}
