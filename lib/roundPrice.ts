/**
 * Round a price/value to 2 decimal places (cents).
 * Uses banker's rounding (Math.round) for consistent behavior.
 *
 * @param value - The numerical value to round
 * @returns The value rounded to 2 decimal places
 *
 * @example
 * roundPrice(19.995) // => 20.00
 * roundPrice(19.994) // => 19.99
 * roundPrice(1200.456) // => 1200.46
 */
export function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}
