const DAY_MS = 24 * 60 * 60 * 1000;

function parseUtcDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value) return null;
  return timestamp;
}

export function isMilesReviewStale(lastUpdated: string, asOfDate = new Date().toISOString().slice(0, 10)): boolean {
  const reviewed = parseUtcDay(lastUpdated);
  const asOf = parseUtcDay(asOfDate);
  if (reviewed === null || asOf === null) return true;
  const ageDays = (asOf - reviewed) / DAY_MS;
  return ageDays < 0 || ageDays > 90;
}
