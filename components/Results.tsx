import type { FlightResult } from "@/lib/engine";
import { FlightCard } from "./FlightCard";

interface ResultsProps {
  results: FlightResult[];
  loading: boolean;
  lang?: "fr" | "en";
}

export function Results({ results, loading, lang = "en" }: ResultsProps) {
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
        <p className="text-sm">
          {lang === "fr"
            ? "Entrez un itinéraire pour trouver la meilleure offre."
            : "Enter a route above to find the best deal."}
        </p>
      </div>
    );
  }

  // Sort by value per mile descending (best value first), then totalPrice ascending
  const sorted = [...results].sort((a, b) =>
    b.value !== a.value ? b.value - a.value : (a.totalPrice ?? a.price) - (b.totalPrice ?? b.price)
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {results.length} {lang === "fr"
            ? `option${results.length !== 1 ? "s" : ""} trouvée${results.length !== 1 ? "s" : ""}`
            : `option${results.length !== 1 ? "s" : ""} found`}
        </p>
        <p className="text-xs text-muted/60">
          {lang === "fr" ? "Trié par valeur" : "Sorted by value"}
        </p>
      </div>
      {sorted.map((flight) => (
        <FlightCard
          key={`${flight.from}-${flight.to}-${flight.airlines[0] ?? ""}-${flight.price}`}
          flight={flight}
          lang={lang}
        />
      ))}
    </div>
  );
}
