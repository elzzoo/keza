-- CreateTable
CREATE TABLE "AnalyticsSearch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "searchId" TEXT NOT NULL,
    "userId" TEXT,
    "route" TEXT NOT NULL,
    "program" TEXT,
    "passengers" INTEGER NOT NULL DEFAULT 1,
    "cabin" TEXT NOT NULL DEFAULT 'economy',
    "tripType" TEXT NOT NULL DEFAULT 'oneway',
    "stops" TEXT NOT NULL DEFAULT 'any',
    "device" TEXT,
    "cacheHit" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "confidence" TEXT,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AnalyticsAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alertId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "program" TEXT,
    "priceThreshold" REAL,
    "firedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conversionValue" REAL,
    "conversionDate" DATETIME,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AnalyticsConversion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "program" TEXT,
    "priceUSD" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "milesBurned" INTEGER,
    "pricingSource" TEXT NOT NULL,
    "bookingReference" TEXT,
    "conversionValue" REAL NOT NULL,
    "source" TEXT NOT NULL,
    "referrer" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AnalyticsUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "firstSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "country" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "sessionCount" INTEGER NOT NULL DEFAULT 1,
    "searchCount" INTEGER NOT NULL DEFAULT 0,
    "alertCount" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" REAL NOT NULL DEFAULT 0,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AnalyticsDailyMetrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "searchCount" INTEGER NOT NULL DEFAULT 0,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "alertsFired" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" REAL NOT NULL DEFAULT 0,
    "avgSearchDuration" INTEGER NOT NULL DEFAULT 0,
    "cacheHitRate" REAL NOT NULL DEFAULT 0,
    "topRoute" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsSearch_searchId_key" ON "AnalyticsSearch"("searchId");

-- CreateIndex
CREATE INDEX "AnalyticsSearch_userId_idx" ON "AnalyticsSearch"("userId");

-- CreateIndex
CREATE INDEX "AnalyticsSearch_route_idx" ON "AnalyticsSearch"("route");

-- CreateIndex
CREATE INDEX "AnalyticsSearch_timestamp_idx" ON "AnalyticsSearch"("timestamp");

-- CreateIndex
CREATE INDEX "AnalyticsSearch_device_idx" ON "AnalyticsSearch"("device");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsAlert_alertId_key" ON "AnalyticsAlert"("alertId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsAlert_userId_key" ON "AnalyticsAlert"("userId");

-- CreateIndex
CREATE INDEX "AnalyticsAlert_userId_idx" ON "AnalyticsAlert"("userId");

-- CreateIndex
CREATE INDEX "AnalyticsAlert_route_idx" ON "AnalyticsAlert"("route");

-- CreateIndex
CREATE INDEX "AnalyticsAlert_firedAt_idx" ON "AnalyticsAlert"("firedAt");

-- CreateIndex
CREATE INDEX "AnalyticsAlert_status_idx" ON "AnalyticsAlert"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsConversion_conversionId_key" ON "AnalyticsConversion"("conversionId");

-- CreateIndex
CREATE INDEX "AnalyticsConversion_userId_idx" ON "AnalyticsConversion"("userId");

-- CreateIndex
CREATE INDEX "AnalyticsConversion_route_idx" ON "AnalyticsConversion"("route");

-- CreateIndex
CREATE INDEX "AnalyticsConversion_timestamp_idx" ON "AnalyticsConversion"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsUser_userId_key" ON "AnalyticsUser"("userId");

-- CreateIndex
CREATE INDEX "AnalyticsUser_lastSeen_idx" ON "AnalyticsUser"("lastSeen");

-- CreateIndex
CREATE INDEX "AnalyticsUser_country_idx" ON "AnalyticsUser"("country");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsDailyMetrics_date_key" ON "AnalyticsDailyMetrics"("date");

-- CreateIndex
CREATE INDEX "AnalyticsDailyMetrics_date_idx" ON "AnalyticsDailyMetrics"("date");
