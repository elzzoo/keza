'use client'

export function CalendarSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-surface-2 rounded w-32" />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-24 bg-surface-2 rounded" />
        ))}
      </div>
    </div>
  )
}

export function MapSkeleton() {
  return (
    <div className="w-full h-96 bg-surface-2 rounded-lg animate-pulse flex items-center justify-center">
      <div className="text-muted text-sm">Loading map...</div>
    </div>
  )
}

export function ProgramListSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 bg-surface-2 rounded flex items-center gap-3 px-4">
          <div className="w-10 h-10 bg-surface rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-surface rounded w-24" />
            <div className="h-3 bg-surface rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-surface-2 rounded animate-pulse ${className || 'h-4 w-full'}`} />
}
