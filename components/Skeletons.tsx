"use client";

/**
 * Suspense Fallback Skeletons
 * Components used as Suspense fallbacks for lazy-loaded routes
 * Part of P0 Phase 4: Code Splitting
 *
 * Provides loading placeholders for:
 * - CalendarSkeleton: For /prix route (PriceHeatmap/Calendar)
 * - MapSkeleton: For /carte route (Map component)
 * - ProgramListSkeleton: For /programmes route (ProgramList)
 */

/**
 * CalendarSkeleton — Loading placeholder for calendar/heatmap
 * Displays a 7-column grid matching CheapestDatesCalendar structure
 * Used as Suspense fallback when lazy-loading PriceHeatmap component
 */
export function CalendarSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-surface rounded-2xl border border-border p-5 space-y-4">
        {/* Header with navigation buttons */}
        <div className="flex items-center justify-between">
          <div className="h-4 bg-muted rounded w-40" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-muted rounded-lg" />
            <div className="h-4 bg-muted rounded w-24" />
            <div className="w-7 h-7 bg-muted rounded-lg" />
          </div>
        </div>

        {/* Day names (weekday labels) */}
        <div className="grid grid-cols-7 gap-1">
          {Array(7)
            .fill(null)
            .map((_, i) => (
              <div
                key={`day-header-${i}`}
                className="h-3 bg-muted rounded w-6 mx-auto"
              />
            ))}
        </div>

        {/* Calendar grid (5 weeks × 7 days = 35 cells) */}
        <div className="grid grid-cols-7 gap-1">
          {Array(35)
            .fill(null)
            .map((_, i) => (
              <div
                key={`calendar-cell-${i}`}
                className="h-10 bg-muted rounded-lg"
              />
            ))}
        </div>

        {/* Footer legend */}
        <div className="flex items-center gap-4 text-xs pt-1 border-t border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-muted rounded-sm" />
            <div className="h-3 bg-muted rounded w-20" />
          </div>
          <div className="h-3 bg-muted rounded w-1" />
          <div className="h-3 bg-muted rounded w-20" />
        </div>
      </div>
    </div>
  );
}

/**
 * MapSkeleton — Loading placeholder for map component
 * Displays a large rectangular placeholder matching map viewport dimensions
 * Used as Suspense fallback when lazy-loading Map component for /carte route
 */
export function MapSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-surface rounded-2xl border border-border p-5 min-h-96 flex flex-col gap-4">
        {/* Map container (main visual area) */}
        <div className="flex-1 bg-muted rounded-lg min-h-80" />

        {/* Map controls placeholder (zoom buttons, etc.) */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <div className="w-10 h-10 bg-muted rounded-lg" />
            <div className="w-10 h-10 bg-muted rounded-lg" />
          </div>
          <div className="h-4 bg-muted rounded w-32" />
        </div>

        {/* Legend or info bar at bottom */}
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <div className="w-12 h-8 bg-muted rounded" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-muted rounded w-32" />
            <div className="h-3 bg-muted rounded w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ProgramListSkeleton — Loading placeholder for programs/loyalty list
 * Displays multiple skeleton cards matching the ProgramList item structure
 * Used as Suspense fallback when lazy-loading ProgramList component for /programmes route
 */
export function ProgramListSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="space-y-3">
        {/* 5 skeleton program cards */}
        {Array(5)
          .fill(null)
          .map((_, i) => (
            <div
              key={`program-${i}`}
              className="rounded-2xl border border-border bg-surface p-5 space-y-3"
            >
              {/* Program name + logo */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded-lg flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-40" />
                </div>
              </div>

              {/* Program description/details */}
              <div className="space-y-2 pl-11">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-5/6" />
              </div>

              {/* Program stats/badges row */}
              <div className="flex gap-2 pt-2">
                <div className="h-6 bg-muted rounded-full w-16" />
                <div className="h-6 bg-muted rounded-full w-20" />
                <div className="h-6 bg-muted rounded-full w-24" />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
