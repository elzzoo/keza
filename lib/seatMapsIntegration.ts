export interface SeatMapData {
  aircraft: string;
  airline: string;
  route: {
    from: string;
    to: string;
  };
  cabin: "economy" | "premium" | "business" | "first";

  // Seat availability breakdown
  available: number;
  occupied: number;
  blocked: number;
  total: number;

  // Percentage available
  percentAvailable: number;

  // Health status: "good" (>50%), "warning" (20-50%), "critical" (<20%)
  status: "good" | "warning" | "critical";

  // Thumbnail URL for preview
  thumbnailUrl?: string;

  // Full map URL (for link-out)
  mapUrl?: string;

  // Last updated timestamp
  updatedAt: number;

  // Fallback indicator
  isFallback?: boolean;
}
