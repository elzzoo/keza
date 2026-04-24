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

/** User clicks a deal in the DealsStrip */
export function trackDealClick(params: { from: string; to: string; program: string }) {
  track("Deal Click", { from: params.from, to: params.to, route: `${params.from}-${params.to}`, program: params.program });
}

/** User clicks a destination in a deals component */
export function trackDestinationClick(params: { city: string; iata: string }) {
  track("Destination Click", { city: params.city, iata: params.iata });
}

/** User clicks a program in ProgramsWidget or ProgramsTable */
export function trackProgramClick(params: { id: string; name: string }) {
  track("Program Click", { program_id: params.id, program_name: params.name });
}

/** User deletes a price alert from /alertes */
export function trackAlertDeleted(params: { from: string; to: string; cabin: string }) {
  track("Alert Deleted", {
    from: params.from,
    to: params.to,
    route: `${params.from}-${params.to}`,
    cabin: params.cabin,
  });
}

/** User changes the filter tab on /deals */
export function trackDealsFilter(filter: string) {
  track("Deals Filter", { filter });
}
