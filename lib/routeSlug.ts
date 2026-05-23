/**
 * Route slug utilities for SEO corridor pages.
 *
 * Slug format: "cdg-jfk" (lowercase IATA codes, hyphen-separated)
 * IATA format: "CDG-JFK" (uppercase, hyphen-separated)
 */

export function slugToIata(slug: string): { from: string; to: string } | null {
  const parts = slug.toLowerCase().split("-");
  if (parts.length !== 2) return null;
  const [a, b] = parts;
  if (!a || !b || a.length !== 3 || b.length !== 3) return null;
  return { from: a.toUpperCase(), to: b.toUpperCase() };
}

export function iataToSlug(from: string, to: string): string {
  return `${from.toLowerCase()}-${to.toLowerCase()}`;
}

export function routeKey(from: string, to: string): string {
  return `${from.toUpperCase()}-${to.toUpperCase()}`;
}
