import "server-only";
import type { AirlineCredentials } from "@/lib/balanceSync";
import { logWarn } from "@/lib/logger";

/**
 * Get all user emails that have saved portfolios.
 * This is a placeholder that returns an empty array.
 * Implement this based on your database schema.
 */
export async function getAllUserPortfolios(): Promise<string[]> {
  // TODO: Fetch all user emails from database that have portfolios
  return [];
}

/**
 * Get airline credentials for a specific user.
 * This is a placeholder that returns an empty object.
 * Implement this based on your database schema.
 */
export async function getUserCredentials(
  email: string
): Promise<Record<string, AirlineCredentials>> {
  // TODO: Fetch user's saved airline credentials from database
  logWarn("[portfolio] Getting credentials for email", { email });
  return {};
}
