export function AdminErrorBanner({ message }: { message: string }) {
  return (
    <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <strong>Erreur Redis :</strong> {message}
    </div>
  );
}
