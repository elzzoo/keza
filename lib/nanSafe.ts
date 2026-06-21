/**
 * NaN safety helpers — defensive guards for division and calculations
 * that could produce NaN under edge cases (0 divisor, negative inputs, etc.)
 */

/**
 * Safe division that returns 0 instead of NaN when divisor is 0 or invalid
 */
export function safeDivide(numerator: number, denominator: number, fallback: number = 0): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return fallback;
  }
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : fallback;
}

/**
 * Safe percent calculation: (value / total) × 100
 * Returns 0 if total is 0 or invalid
 */
export function safePercent(value: number, total: number): number {
  return safeDivide(value * 100, total, 0);
}

/**
 * Safe ratio calculation with minimum threshold
 * Returns fallback if ratio would be invalid or below threshold
 */
export function safeRatio(value: number, divisor: number, minValue: number = 0.01): number {
  const result = safeDivide(value, divisor, minValue);
  return result < minValue ? minValue : result;
}

/**
 * Validate a calculated value is finite (not NaN, Infinity, -Infinity)
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Clamp a value between min and max, returning fallback if not a valid number
 */
export function safeClamp(value: number, min: number, max: number, fallback: number = min): number {
  if (!isValidNumber(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}
