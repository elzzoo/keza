export default function Loading() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
        {/* Breadcrumb skeleton */}
        <div className="h-4 w-48 bg-surface rounded-full" />
        {/* Title skeleton */}
        <div className="space-y-3">
          <div className="h-8 w-96 bg-surface rounded-xl" />
          <div className="h-5 w-64 bg-surface rounded-lg" />
        </div>
        {/* Price card skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-surface border border-border rounded-2xl p-6 space-y-3">
              <div className="h-4 w-20 bg-border rounded-full" />
              <div className="h-10 w-32 bg-border rounded-xl" />
              <div className="h-3 w-24 bg-border rounded-full" />
            </div>
          ))}
        </div>
        {/* Calendar skeleton */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <div className="h-4 w-40 bg-border rounded-full mb-4" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({length: 28}).map((_, i) => (
              <div key={i} className="h-10 bg-border rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
