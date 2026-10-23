describe("Prisma initialization", () => {
  it("does not require a database URL when the module is imported", async () => {
    const previousUrls = {
      POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL,
      POSTGRES_URL: process.env.POSTGRES_URL,
      DATABASE_URL: process.env.DATABASE_URL,
    };
    const prismaGlobal = global as typeof global & { prisma?: unknown };
    const previousClient = prismaGlobal.prisma;

    delete process.env.POSTGRES_PRISMA_URL;
    delete process.env.POSTGRES_URL;
    delete process.env.DATABASE_URL;
    delete prismaGlobal.prisma;

    try {
      const { getPrismaClient } = await import("@/lib/db");
      expect(() => getPrismaClient()).toThrow(
        "DATABASE_URL or POSTGRES_PRISMA_URL is required to initialize Prisma."
      );
    } finally {
      for (const [name, value] of Object.entries(previousUrls)) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
      if (previousClient === undefined) delete prismaGlobal.prisma;
      else prismaGlobal.prisma = previousClient;
    }
  });
});
