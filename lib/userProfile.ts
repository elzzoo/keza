/**
 * User profile — persisted in localStorage (no auth needed).
 * Stores miles programs, preferred currency, recent searches, and preferences.
 */

export interface UserProfile {
  /** User's miles programs (e.g., ["Flying Blue", "Chase UR"]) */
  programs: string[];
  /** Preferred display currency */
  currency: "USD" | "EUR" | "GBP" | "XOF";
  /** Preferred language */
  lang: "fr" | "en";
  /** Preferred cabin class */
  cabin: "economy" | "premium" | "business" | "first";
  /** Recent searches (last 10) */
  recentSearches: RecentSearch[];
  /** Favorite routes */
  favoriteRoutes: FavoriteRoute[];
  /** Profile creation date */
  createdAt: string;
  /** Last activity */
  lastActiveAt: string;
}

export interface RecentSearch {
  from: string;
  to: string;
  date: string;
  cabin: string;
  tripType: "oneway" | "roundtrip";
  timestamp: string;
  /** Best savings found */
  bestSavings?: number;
  /** Recommendation */
  recommendation?: "USE_MILES" | "USE_CASH";
}

export interface FavoriteRoute {
  from: string;
  to: string;
  addedAt: string;
}

const STORAGE_KEY = "keza_profile";
const MAX_RECENT = 10;
const MAX_FAVORITES = 20;

function defaultProfile(): UserProfile {
  return {
    programs: [],
    currency: "USD",
    lang: "fr",
    cabin: "economy",
    recentSearches: [],
    favoriteRoutes: [],
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };
}

/** Load profile from localStorage (returns default if none exists) */
export function loadProfile(): UserProfile {
  if (typeof window === "undefined") return defaultProfile();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    // Merge with defaults to handle schema evolution
    return { ...defaultProfile(), ...parsed };
  } catch {
    return defaultProfile();
  }
}

/** Save profile to localStorage */
export function saveProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  try {
    profile.lastActiveAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Storage full or disabled — silently fail
  }
}

/** Update specific fields */
export function updateProfile(updates: Partial<UserProfile>): UserProfile {
  const current = loadProfile();
  const updated = { ...current, ...updates };
  saveProfile(updated);
  return updated;
}

/** Save user's miles programs */
export function savePrograms(programs: string[]): void {
  updateProfile({ programs });
}

/** Add a recent search (keeps last MAX_RECENT) */
export function addRecentSearch(search: Omit<RecentSearch, "timestamp">): void {
  const profile = loadProfile();
  const entry: RecentSearch = { ...search, timestamp: new Date().toISOString() };

  // Remove duplicate (same from/to)
  const filtered = profile.recentSearches.filter(
    s => !(s.from === search.from && s.to === search.to)
  );

  profile.recentSearches = [entry, ...filtered].slice(0, MAX_RECENT);
  saveProfile(profile);
}

/** Toggle a favorite route */
export function toggleFavoriteRoute(from: string, to: string): boolean {
  const profile = loadProfile();
  const idx = profile.favoriteRoutes.findIndex(r => r.from === from && r.to === to);

  if (idx >= 0) {
    profile.favoriteRoutes.splice(idx, 1);
    saveProfile(profile);
    return false; // removed
  } else {
    profile.favoriteRoutes = [
      { from, to, addedAt: new Date().toISOString() },
      ...profile.favoriteRoutes,
    ].slice(0, MAX_FAVORITES);
    saveProfile(profile);
    return true; // added
  }
}

/** Check if route is favorited */
export function isFavoriteRoute(from: string, to: string): boolean {
  const profile = loadProfile();
  return profile.favoriteRoutes.some(r => r.from === from && r.to === to);
}
