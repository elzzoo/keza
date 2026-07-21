/**
 * lib/brand.ts — single source of truth for brand identity during the
 * Keza → Xalifly rebrand.
 *
 * Why this file exists: `keza.app` (used everywhere for canonical URLs,
 * OpenGraph, sitemap, structured data, and outbound email) belongs to an
 * unrelated third-party dating app, not this company. See the due-diligence
 * audit for the full finding. This file centralizes what's safe to flip once
 * xalifly.com is purchased and DNS/email are configured — instead of that
 * cutover requiring another 250-file sweep.
 *
 * STATUS — what's already renamed vs. gated on external setup:
 *  ✅ Display name ("Xalifly") — safe, renamed everywhere now.
 *  ⏳ EMAIL_DOMAIN — still keza.app. Do NOT switch to xalifly.com until:
 *     1. xalifly.com is purchased and DNS is live
 *     2. SPF/DKIM/DMARC records are configured for xalifly.com in Resend
 *     Switching the literal string without doing that first will silently
 *     break email deliverability (bounces / spam-folder placement) for
 *     price alerts and transactional email.
 *  ⏳ SITE_URL — already env-driven (NEXT_PUBLIC_APP_URL), currently
 *     falls back to the live Vercel URL. Set NEXT_PUBLIC_APP_URL=
 *     https://xalifly.com in Vercel once DNS is live — no code change
 *     needed for that part of the cutover.
 *  ⏳ Legal entity name ("Xalifly Inc." below) — PLACEHOLDER. Confirm the
 *     real registered entity name before this reaches mentions-légales /
 *     terms / privacy policy, which are legal documents this file does
 *     NOT touch on its own.
 */

export const BRAND_NAME = "Xalifly";

/** Fallback used only where no NEXT_PUBLIC_APP_URL is set. See lib/siteConfig.ts. */
export const FALLBACK_SITE_URL = "https://keza-taupe.vercel.app";

/** Still the real, working email domain today. Do not change without DNS+SPF/DKIM setup. */
export const EMAIL_DOMAIN = "keza.app";

/**
 * PLACEHOLDER — not yet confirmed as the real registered entity name.
 * Not used by any legal-facing page automatically; those are edited by hand
 * once this is confirmed, on purpose.
 */
export const LEGAL_ENTITY_NAME_PLACEHOLDER = "Xalifly Inc. (à confirmer)";
