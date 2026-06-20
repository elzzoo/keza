// lib/redisKeys.ts
// Centralized Redis key constants — import from here, not from route files.

export const DEALS_KEY          = "keza:deals:live";
export const TOTAL_SAVINGS_KEY  = "keza:stats:total_savings_usd";
export const ALERTS_ROUTES_KEY  = "keza:alerts:routes";

// Seat Alerts
export const SEAT_ALERT_KEY = (email: string, route: string, cabin: string) =>
  `keza:seatalert:${email}:${route}:${cabin}`;

export const SEAT_ALERT_INDEX = (email: string) =>
  `keza:setalerts:${email}`;

export const SEAT_ALERT_ROUTE_INDEX = (route: string, cabin: string) =>
  `keza:setalerts:route:${route}:${cabin}`;

export const SEAT_ALERT_DEAL_CACHE = (route: string, cabin: string) =>
  `keza:seatdeals:${route}:${cabin}`;
