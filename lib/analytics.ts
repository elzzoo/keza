/**
 * KEZA Analytics — Plausible custom events
 * Docs: https://plausible.io/docs/custom-event-goals
 */

// Tell TypeScript about the global plausible() function injected by the script
declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: Record<string, string | number | boolean> }
    ) => void;
  }
}

function track(
  event: string,
  props?: Record<string, string | number | boolean>
) {
  try {
    if (typeof window !== "undefined" && typeof window.plausible === "function") {
      window.plausible(event, props ? { props } : undefined);
    }
  } catch {
    // Never crash the app because of analytics
  }
}

// ── Events ────────────────────────────────────────────────────────────────────

/** User clicks "Réserver ce vol" — primary conversion metric */
export function trackBookClick(params: {
  from: string;
  to: string;
  cabin: string;
  recommendation: string;
  savings: number;
  airline?: string;
}) {
  track("Book Click", {
    from: params.from,
    to: params.to,
    route: `${params.from}-${params.to}`,
    cabin: params.cabin,
    recommendation: params.recommendation,
    savings_usd: Math.round(params.savings),
    airline: params.airline ?? "unknown",
  });
}

/** User launches a search */
export function trackSearch(params: {
  from: string;
  to: string;
  cabin: string;
  tripType: string;
  pax: number;
}) {
  track("Search", {
    from: params.from,
    to: params.to,
    route: `${params.from}-${params.to}`,
    cabin: params.cabin,
    trip_type: params.tripType,
    passengers: params.pax,
  });
}

/** User creates a price alert */
export function trackAlertCreated(params: {
  from: string;
  to: string;
  cabin: string;
  currentPrice: number;
}) {
  track("Alert Created", {
    from: params.from,
    to: params.to,
    route: `${params.from}-${params.to}`,
    cabin: params.cabin,
    price_usd: Math.round(params.currentPrice),
  });
}

/** User copies the share link */
export function trackShare(params: {
  from: string;
  to: string;
}) {
  track("Share", {
    from: params.from,
    to: params.to,
    route: `${params.from}-${params.to}`,
  });
}

/** User clicks a popular route chip */
export function trackPopularRoute(from: string, to: string) {
  track("Popular Route Click", {
    route: `${from}-${to}`,
  });
}

/** User clicks a recent search */
export function trackRecentSearch(from: string, to: string) {
  track("Recent Search Click", {
    route: `${from}-${to}`,
  });
}
