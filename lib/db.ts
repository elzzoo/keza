import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Prisma } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

let _prisma: PrismaClient | undefined;

function createPrismaOptions(databaseUrl: string): ConstructorParameters<typeof PrismaClient>[0] {
  const log: Array<Prisma.LogLevel | Prisma.LogDefinition> =
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"];

  if (databaseUrl.startsWith("prisma+postgres://")) {
    return {
      accelerateUrl: databaseUrl,
      log,
    };
  }

  const poolConfig: Exclude<ConstructorParameters<typeof PrismaPg>[0], string> = {
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
  };

  if (/supabase\.(co|com)/i.test(databaseUrl) && !/[?&]sslmode=/i.test(databaseUrl)) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  return {
    adapter: new PrismaPg(poolConfig),
    log,
  };
}

export function getPrismaClient(): PrismaClient {
  if (_prisma) return _prisma;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to initialize Prisma.");
  }

  _prisma = new PrismaClient(createPrismaOptions(databaseUrl));

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = _prisma;
  }

  return _prisma;
}

export const prisma = globalForPrisma.prisma ?? getPrismaClient();
