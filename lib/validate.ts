// Shared input validators for API endpoints

const VALID_CABINS = new Set(["economy", "premium", "business", "first"]);

export function isValidIata(code: unknown): code is string {
  return typeof code === "string" && /^[A-Z]{3}$/.test(code.toUpperCase()) && code.length === 3;
}

export function isValidEmail(email: unknown): email is string {
  return (
    typeof email === "string" &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
  );
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
