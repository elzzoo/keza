import type { FlightResult } from "@/lib/engine";

export function isSyntheticFlight(result: Pick<FlightResult, "isSupplemental" | "source">): boolean {
  return Boolean(result.isSupplemental) || result.source === "SYNTHETIC";
}
