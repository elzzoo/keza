/**
 * Parse route input like "SIN to LAX", "SIN → LAX", or "SIN LAX"
 * Returns { from, to } or null if invalid
 */
export function parseRoute(input: string): { from: string; to: string } | null {
  const trimmed = input.trim().toUpperCase();

  if (!trimmed) {
    return null;
  }

  // Try splitting by "to" (case-insensitive)
  let parts = trimmed.split(/\s+to\s+/i);
  if (parts.length === 2) {
    const from = parts[0].trim();
    const to = parts[1].trim();
    if (from.length === 3 && to.length === 3 && from !== to) {
      return { from, to };
    }
  }

  // Try splitting by arrow
  parts = trimmed.split(/→|->/).map((p) => p.trim());
  if (parts.length === 2) {
    const from = parts[0].trim();
    const to = parts[1].trim();
    if (from.length === 3 && to.length === 3 && from !== to) {
      return { from, to };
    }
  }

  // Try splitting by space (last resort)
  parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    const from = parts[0].trim();
    const to = parts[parts.length - 1].trim();
    if (from.length === 3 && to.length === 3 && from !== to) {
      return { from, to };
    }
  }

  return null;
}
