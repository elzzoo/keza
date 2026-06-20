import "server-only";
import { redis } from "@/lib/redis";
import { logError } from "@/lib/logger";

export interface AirlineCredentials {
  username: string;
  password: string;
}

export interface BalanceResult {
  program: string;
  airline: string;
  miles: number;
  lastSynced: Date;
  expiresAt?: Date;
  tier?: string;
}

const BALANCE_CACHE_TTL = 12 * 60 * 60; // 12 hours

const AIRLINE_APIS: Record<
  string,
  (creds: AirlineCredentials) => Promise<BalanceResult | null>
> = {
  SINGAPORE: fetchSingaporeBalance,
  ANA: fetchANABalance,
  JAL: fetchJALBalance,
  UNITED: fetchUnitedBalance,
  CATHAY: fetchCathayBalance,
  EMIRATES: fetchEmiratesBalance,
};

// Individual airline fetch functions
async function fetchSingaporeBalance(
  creds: AirlineCredentials
): Promise<BalanceResult | null> {
  try {
    // Call Singapore Airlines API
    // Example: https://api.singaporeair.com/krisflyerbalance
    const res = await fetch("https://api.singaporeair.com/krisflyerbalance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: creds.username,
        password: creds.password,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    return {
      program: "Singapore KrisFlyer",
      airline: "Singapore Airlines",
      miles: data.miles,
      lastSynced: new Date(),
      expiresAt: new Date(data.expireDate),
      tier: data.tier,
    };
  } catch (err) {
    logError("Failed to fetch Singapore balance", err);
    return null;
  }
}

async function fetchANABalance(
  creds: AirlineCredentials
): Promise<BalanceResult | null> {
  try {
    const res = await fetch("https://api.ana.co.jp/mileageclub/balance", {
      method: "POST",
      body: JSON.stringify({
        memberNumber: creds.username,
        password: creds.password,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    return {
      program: "ANA Mileage Club",
      airline: "All Nippon Airways",
      miles: data.premiummiles + data.basicmiles,
      lastSynced: new Date(),
      tier: data.membershipStatus,
    };
  } catch (err) {
    logError("Failed to fetch ANA balance", err);
    return null;
  }
}

async function fetchJALBalance(
  _creds: AirlineCredentials
): Promise<BalanceResult | null> {
  // JAL Mileage Bank API
  return null; // Placeholder
}

async function fetchUnitedBalance(
  _creds: AirlineCredentials
): Promise<BalanceResult | null> {
  // United MileagePlus API
  return null;
}

async function fetchCathayBalance(
  _creds: AirlineCredentials
): Promise<BalanceResult | null> {
  // Cathay Pacific Asia Miles API
  return null;
}

async function fetchEmiratesBalance(
  _creds: AirlineCredentials
): Promise<BalanceResult | null> {
  // Emirates Skywards API
  return null;
}

export async function fetchAirlineBalance(
  airline: string,
  creds: AirlineCredentials
): Promise<BalanceResult | null> {
  const fetcher = AIRLINE_APIS[airline];
  if (!fetcher) {
    logError(`Unknown airline: ${airline}`, null);
    return null;
  }

  return fetcher(creds);
}

export async function syncUserBalances(
  email: string,
  programs: Record<string, AirlineCredentials>
): Promise<BalanceResult[]> {
  const results: BalanceResult[] = [];

  for (const [airline, creds] of Object.entries(programs)) {
    try {
      const balance = await fetchAirlineBalance(airline, creds);
      if (balance) {
        results.push(balance);

        // Cache in Redis
        const cacheKey = `keza:balance:${email}:${airline}`;
        await redis.set(cacheKey, JSON.stringify(balance), {
          ex: BALANCE_CACHE_TTL,
        });
      }
    } catch (err) {
      logError(`Failed to sync ${airline} for ${email}`, err);
    }
  }

  // Record sync timestamp
  await redis.set(
    `keza:balance:${email}:lastSync`,
    new Date().toISOString(),
    { ex: 24 * 60 * 60 } // 24-hour TTL
  );

  return results;
}

export async function getCachedBalances(
  email: string
): Promise<BalanceResult[]> {
  const airlines = ["SINGAPORE", "ANA", "JAL", "UNITED", "CATHAY", "EMIRATES"];
  const results: BalanceResult[] = [];

  for (const airline of airlines) {
    const cacheKey = `keza:balance:${email}:${airline}`;
    const cached = await redis.get<string>(cacheKey);
    if (cached) {
      results.push(JSON.parse(cached));
    }
  }

  return results;
}

export async function getLastSyncTime(email: string): Promise<Date | null> {
  const cached = await redis.get<string>(`keza:balance:${email}:lastSync`);
  return cached ? new Date(cached) : null;
}

export async function isStaleBalance(email: string): Promise<boolean> {
  const lastSync = await getLastSyncTime(email);
  if (!lastSync) return true;
  const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
  return hoursSinceSync > 24;
}
