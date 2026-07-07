import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

// Lazy initialization to defer Prisma client creation
let _prisma: PrismaClient | undefined;

export function getPrismaClient(): PrismaClient {
  if (_prisma) return _prisma;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaNeon } = require("@prisma/adapter-neon");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require("@neondatabase/serverless");

    _prisma = new PrismaClient({
      adapter: new PrismaNeon(
        new Pool({
          connectionString: process.env.DATABASE_URL,
        })
      ),
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
    });
  } catch {
    // Fall back to standard connection if serverless adapter not available
    _prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
    });
  }

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = _prisma;
  }

  return _prisma;
}

export const prisma = globalForPrisma.prisma ?? getPrismaClient();
