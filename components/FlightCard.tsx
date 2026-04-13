import type { FlightResult } from "@/lib/engine";
import type { OptimizerDecision } from "@/lib/optimizer";
import clsx from "clsx";

interface FlightCardProps {
  flight: FlightResult;
}

// Derive all visual state from the 3-tier recommendation string
const REC_STYLES: Record<FlightResult["recommendation"], {
  label: string;
  bar: string;
  badge: string;
  color: string;
}> = {
  "USE MILES": {
    label: "USE MILES",
    bar: "#0EA5E9",
    badge: "bg-accent/15 text-accent border-accent/30",
    color: "#0EA5E9",
  },
  "CONSIDER": {
    label: "CONSIDER",
    bar: "#10B981",
    badge: "bg-success/15 text-success border-success/30",
    color: "#10B981",
  },
  "USE CASH": {
    label: "USE CASH",
    bar: "#F59E0B",
    badge: "bg-warn/15 text-warn border-warn/30",
    color: "#F59E0B",
  },
};

function OptimizerBadge({ optimization }: { optimization: OptimizerDecision }) {
  if (optimization.type === "DIRECT") {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-success/10 text-success border border-success/20 rounded-full px-2.5 py-0.5">
        <span aria-hidden="true">●</span> Direct — {optimization.program}
      </span>
    );
  }
  if (optimization.type === "ALLIANCE") {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-accent/10 text-accent border border-accent/20 rounded-full px-2.5 py-0.5">
        <span aria-hidden="true">◆</span> {optimization.alliance} via {optimization.viaProgram}
      </span>
    );
  }
  if (optimization.type === "TRANSFER") {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-warn/10 text-warn border border-warn/20 rounded-full px-2.5 py-0.5">
        <span aria-hidden="true">⇄</span> Transfer {optimization.from} <span aria-hidden="true">→</span> {optimization.to}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-muted/10 text-muted border border-border rounded-full px-2.5 py-0.5">
      Use Cash
    </span>
  );
}

export function FlightCard({ flight }: FlightCardProps) {
  const style = REC_STYLES[flight.recommendation] ?? REC_STYLES["USE CASH"];
  const meterWidth = Math.min(100, (flight.value / 3) * 100);

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4 hover:border-accent/40 transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-white">
            <span>{flight.from}</span>
            <span className="text-muted text-sm">→</span>
            <span>{flight.to}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {flight.airlines.map((a) => (
              <span key={a} className="text-xs text-muted bg-surface border border-border rounded px-2 py-0.5">
                {a}
              </span>
            ))}
            {flight.stops !== undefined && (
              <span className="text-xs text-muted">
                {flight.stops === 0 ? "Direct" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}
              </span>
            )}
          </div>
        </div>
        <div className="text-2xl font-bold text-white">${flight.price}</div>
      </div>

      {/* Value meter */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Miles value</span>
          <span className="font-mono font-medium" style={{ color: style.color }}>
            {flight.value.toFixed(2)} c/mile
          </span>
        </div>
        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${meterWidth}%`, backgroundColor: style.bar }}
          />
        </div>
      </div>

      {/* Decision row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <OptimizerBadge optimization={flight.optimization} />
        <span className={clsx(
          "inline-flex items-center text-xs font-bold border rounded-full px-3 py-1 tracking-wide",
          style.badge
        )}>
          {style.label}
        </span>
      </div>

      {/* Savings (optional) */}
      {flight.savings !== undefined && (
        <div className="pt-1 border-t border-border flex items-center justify-between text-xs">
          <span className="text-muted">Estimated savings with miles</span>
          <span className="font-mono font-medium text-success">+${flight.savings.toFixed(0)}</span>
        </div>
      )}
    </div>
  );
}
