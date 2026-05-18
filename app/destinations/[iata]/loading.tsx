export default function Loading() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
        <div className="h-4 w-48 bg-surface rounded-full" />
        <div className="h-8 w-64 bg-surface rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({length: 6}).map((_, i) => (
            <div key={i} className="bg-surface border border-border rounded-2xl p-5 space-y-3">
              <div className="h-5 w-32 bg-border rounded-lg" />
              <div className="h-8 w-24 bg-border rounded-xl" />
              <div className="h-3 w-20 bg-border rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
