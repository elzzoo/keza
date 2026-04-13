export interface Promotion {
  airline: string;
  discount: number;
  validUntil?: string;
  routes?: string[];
}

/**
 * Parse a raw JSON array into typed Promotion objects.
 * Skips malformed entries rather than throwing.
 */
export function parseJsonPromos(raw: unknown[]): Promotion[] {
  const result: Promotion[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === "object" &&
      "airline" in item &&
      "discount" in item &&
      typeof (item as Record<string, unknown>).airline === "string" &&
      typeof (item as Record<string, unknown>).discount === "number"
    ) {
      const p = item as Record<string, unknown>;
      result.push({
        airline: p.airline as string,
        discount: p.discount as number,
        validUntil: typeof p.validUntil === "string" ? p.validUntil : undefined,
        routes: Array.isArray(p.routes)
          ? (p.routes as unknown[]).filter((r): r is string => typeof r === "string")
          : undefined,
      });
    }
  }
  return result;
}
