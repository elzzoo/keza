"use client";

/**
 * SearchSkeleton — Loading placeholder for search results.
 * Displays 8 skeleton flight cards while actual results are loading.
 * Used with React Suspense for progressive result loading.
 *
 * Optimized for P0 Phase 2: shows instant visual feedback during data fetch.
 */
export function SearchSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {/* 8 skeleton flight cards matching FlightCard structure */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={`skeleton-${i}`}
          className="rounded-2xl border border-border bg-surface p-5 space-y-3 min-h-32"
        >
          {/* Airline + departure time row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-muted rounded-full" />
              <div className="h-4 bg-muted rounded w-32" />
            </div>
            <div className="h-4 bg-muted rounded w-16" />
          </div>

          {/* Flight route + duration */}
          <div className="flex items-center gap-4 justify-between">
            <div className="h-3 bg-muted rounded w-20" />
            <div className="h-2 bg-muted rounded flex-1 mx-2" />
            <div className="h-3 bg-muted rounded w-20" />
          </div>

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Price options grid (2 columns: cash vs miles) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/20 rounded-lg p-3 space-y-2">
              <div className="h-3 bg-muted rounded w-16" />
              <div className="h-4 bg-muted rounded w-24" />
            </div>
            <div className="bg-muted/20 rounded-lg p-3 space-y-2">
              <div className="h-3 bg-muted rounded w-16" />
              <div className="h-4 bg-muted rounded w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
