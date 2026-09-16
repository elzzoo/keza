-- CreateTable
CREATE TABLE "PriceAlertRecord" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "routeFrom" TEXT NOT NULL,
    "routeTo" TEXT NOT NULL,
    "cabin" TEXT NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "targetPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "lastCheckedAt" TIMESTAMP(3),
    "lastPrice" DOUBLE PRECISION,
    "notifCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notifFrequency" TEXT NOT NULL DEFAULT 'instant',
    "milesProgram" TEXT,
    "milesTargetCpp" DOUBLE PRECISION,
    "milesBaseCpp" DOUBLE PRECISION,
    "rawJson" JSONB NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceAlertRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceAlertRecord_email_idx" ON "PriceAlertRecord"("email");

-- CreateIndex
CREATE INDEX "PriceAlertRecord_routeFrom_routeTo_idx" ON "PriceAlertRecord"("routeFrom", "routeTo");

-- CreateIndex
CREATE INDEX "PriceAlertRecord_active_idx" ON "PriceAlertRecord"("active");

-- CreateIndex
CREATE INDEX "PriceAlertRecord_createdAt_idx" ON "PriceAlertRecord"("createdAt");
