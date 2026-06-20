// Shared input validators for API endpoints

const VALID_CABINS = new Set(["economy", "premium", "business", "first"]);

export function isValidIata(code: unknown): code is string {
  return typeof code === "string" && /^[A-Z]{3}$/.test(code.toUpperCase()) && code.length === 3;
}

export function isValidEmail(email: unknown): email is string {
  if (typeof email !== "string") return false;
  if (email.length === 0 || email.length > 254) return false;

  const [localPart, domain] = email.split("@");
  if (!localPart || !domain || localPart.length === 0 || localPart.length > 64) return false;

  // Local part: alphanumeric, dots, hyphens, underscores, plus (no leading/trailing/consecutive dots)
  if (!/^[a-zA-Z0-9._+-]+$/.test(localPart)) return false;
  if (localPart.startsWith(".") || localPart.endsWith(".") || localPart.includes("..")) return false;

  // Domain: at least one dot, valid structure
  if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".")) return false;
  if (domain.includes("..")) return false;

  const domainParts = domain.split(".");
  for (const part of domainParts) {
    if (part.length === 0 || !/^[a-zA-Z0-9-]+$/.test(part)) return false;
    if (part.startsWith("-") || part.endsWith("-")) return false;
  }

  // TLD must be at least 2 chars and contain no hyphens
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) return false;

  return true;
}

export function isValidCabin(cabin: unknown): cabin is string {
  return typeof cabin === "string" && VALID_CABINS.has(cabin);
}

export function isValidPrice(price: unknown): price is number {
  const n = Number(price);
  return Number.isFinite(n) && n > 0 && n <= 50_000;
}

export function isValidHttpsUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}
