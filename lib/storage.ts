// lib/storage.ts
/**
 * localStorage schema and helpers for onboarding state persistence.
 *
 * Keys:
 * - keza:onboarding:programs → JSON array of program names
 * - keza:onboarding:balances → JSON map { program: balance }
 * - keza:onboarding:routes → JSON array of [from, to] pairs
 * - keza:visited → boolean flag (skip onboarding on return visits)
 */

export interface OnboardingState {
  selectedPrograms: string[];
  programBalances: Record<string, number>;
  favoriteRoutes: Array<[string, string]>;
}

const STORAGE_KEYS = {
  PROGRAMS: "keza:onboarding:programs",
  BALANCES: "keza:onboarding:balances",
  ROUTES: "keza:onboarding:routes",
  VISITED: "keza:visited",
} as const;

/**
 * Get current onboarding state from localStorage.
 * Returns empty state if nothing is stored.
 */
export function getOnboardingState(): OnboardingState {
  try {
    // SSR safety: localStorage is unavailable in Node and may be restricted in browsers
    if (typeof localStorage === "undefined") {
      return { selectedPrograms: [], programBalances: {}, favoriteRoutes: [] };
    }

    const programs = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROGRAMS) || "[]");
    const balances = JSON.parse(localStorage.getItem(STORAGE_KEYS.BALANCES) || "{}");
    const routes = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROUTES) || "[]");

    return {
      selectedPrograms: Array.isArray(programs) ? programs : [],
      programBalances: typeof balances === "object" && balances !== null ? balances : {},
      favoriteRoutes: Array.isArray(routes) ? routes : [],
    };
  } catch (error) {
    console.warn("Failed to retrieve onboarding state from localStorage", error);
    return { selectedPrograms: [], programBalances: {}, favoriteRoutes: [] };
  }
}

/**
 * Save full onboarding state to localStorage.
 */
export function setOnboardingState(state: OnboardingState): void {
  try {
    if (typeof localStorage === "undefined") return;

    localStorage.setItem(STORAGE_KEYS.PROGRAMS, JSON.stringify(state.selectedPrograms));
    localStorage.setItem(STORAGE_KEYS.BALANCES, JSON.stringify(state.programBalances));
    localStorage.setItem(STORAGE_KEYS.ROUTES, JSON.stringify(state.favoriteRoutes));
  } catch {
    // localStorage quota exceeded or unavailable
    console.warn("Failed to save onboarding state to localStorage");
  }
}

/**
 * Get visited flag (returns true if user has completed onboarding before).
 */
export function getVisitedFlag(): boolean {
  try {
    if (typeof localStorage === "undefined") return false;

    return localStorage.getItem(STORAGE_KEYS.VISITED) === "true";
  } catch (error) {
    console.warn("Failed to retrieve visited flag from localStorage", error);
    return false;
  }
}

/**
 * Set visited flag (call after onboarding completes).
 */
export function setVisitedFlag(visited: boolean): void {
  try {
    if (typeof localStorage === "undefined") return;

    localStorage.setItem(STORAGE_KEYS.VISITED, visited ? "true" : "false");
  } catch {
    console.warn("Failed to set visited flag in localStorage");
  }
}

/**
 * Clear all onboarding data (for testing or user reset).
 */
export function clearOnboardingData(): void {
  try {
    if (typeof localStorage === "undefined") return;

    localStorage.removeItem(STORAGE_KEYS.PROGRAMS);
    localStorage.removeItem(STORAGE_KEYS.BALANCES);
    localStorage.removeItem(STORAGE_KEYS.ROUTES);
    localStorage.removeItem(STORAGE_KEYS.VISITED);
  } catch {
    console.warn("Failed to clear onboarding data");
  }
}
