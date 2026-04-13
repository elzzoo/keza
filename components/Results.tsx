import type { FlightResult } from "@/lib/engine";
import { FlightCard } from "./FlightCard";

interface ResultsProps {
  results: FlightResult[];
  loading: boolean;
}

export function Results({ results, loading }: ResultsProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl h-40 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-16 text-muted">
        <div className="text-4xl mb-3">✈️</div>
        <p className="text-sm">Enter a route above to find the best deal.</p>
      </div>
    );
  }

  // Sort by value per mile descending (best value first), then price ascending
  const sorted = [...results].sort((a, b) =>
    b.value !== a.value ? b.value - a.value : a.price - b.price
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {results.length} option{results.length !== 1 ? "s" : ""} found
        </p>
        <p className="text-xs text-muted/60">Sorted by value</p>
      </div>
      {sorted.map((flight, i) => (
        <FlightCard key={i} flight={flight} />
      ))}
    </div>
  );
}
