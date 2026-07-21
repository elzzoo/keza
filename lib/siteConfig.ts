import { FALLBACK_SITE_URL } from "./brand";

/**
 * Single source of truth for the production URL.
 *
 * The old fallback ("https://keza.app") pointed at a domain owned by an
 * unrelated third party — see lib/brand.ts. Falls back to the real, live
 * Vercel URL until xalifly.com is purchased and NEXT_PUBLIC_APP_URL is set
 * in Vercel to point at it.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? FALLBACK_SITE_URL;
