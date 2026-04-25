// lib/abtest.ts
// Cookie-based A/B test assignment — client-side only

export type ABVariant = "A" | "B";

const COOKIE_KEY = "keza_ab_cta";
const COOKIE_DAYS = 30;

/** Get or assign A/B variant (deterministic per user, 50/50 split) */
export function getOrAssignVariant(): ABVariant {
  if (typeof document === "undefined") return "A"; // SSR fallback

  // Read existing assignment
  const match = document.cookie.match(/(?:^|;\s*)keza_ab_cta=([AB])/);
  if (match) return match[1] as ABVariant;

  // Assign new variant
  const variant: ABVariant = Math.random() < 0.5 ? "A" : "B";
  const expires = new Date(Date.now() + COOKIE_DAYS * 86400000).toUTCString();
  document.cookie = `${COOKIE_KEY}=${variant}; path=/; expires=${expires}; SameSite=Lax`;
  return variant;
}

/** CTA copy for each variant */
export const CTA_COPY = {
  A: {
    fr: "Voir & réserver ce vol",
    en: "View & book this flight",
  },
  B: {
    fr: "Réserver maintenant →",
    en: "Book now →",
  },
} as const;
