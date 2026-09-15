import { recordObservation } from "../autoCalibrate";
import type { Cabin, FlightResult } from "./types";

interface RecordHighConfidenceObservationsOptions {
  from: string;
  to: string;
  cabin: Cabin;
}

export function recordHighConfidenceObservations(
  results: FlightResult[],
  { from, to, cabin }: RecordHighConfidenceObservationsOptions,
): void {
  Promise.allSettled(
    results.map((result) => {
      if (!result.bestOption || result.cashCost <= 0) return Promise.resolve();
      if (result.priceConfidence !== "HIGH") return Promise.resolve();

      return recordObservation(
        result.bestOption.program,
        result.cashCost,
        result.bestOption.taxes,
        result.bestOption.milesRequired,
        `${from}-${to}`,
        cabin,
      );
    }),
  ).catch(() => null);
}
