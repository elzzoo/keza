"use server";

import { saveSeatAlert } from "@/lib/seatAlerts";
import type { CabinType } from "@/lib/seatAlerts";

export async function saveAlertAction(
  email: string,
  route: string,
  cabin: CabinType,
  minPrice: number
): Promise<string> {
  return await saveSeatAlert({
    email,
    route,
    cabin,
    minPrice,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  });
}
