# Price Alerts Postgres Runbook

This runbook covers the safe activation path for durable price-alert storage.
Redis remains the source of truth until the `PRICE_ALERTS_POSTGRES_SYNC=1` flag is enabled.

## Current State

- Redis is still the serving path for all price-alert reads and writes.
- `PriceAlertRecord` exists in `prisma/schema.prisma` with migration `20260916104000_price_alert_records`.
- `lib/alertsPostgres.ts` can upsert Redis `PriceAlert` objects into Postgres.
- `lib/alerts.ts` dual-writes only when `PRICE_ALERTS_POSTGRES_SYNC=1`.
- `/api/admin/backfill/price-alerts` exposes a safe GET parity check between Redis and Postgres.
- `/api/admin/backfill/price-alerts?dryRun=false&confirm=BACKFILL_PRICE_ALERTS` can run the Redis-to-Postgres backfill after an authenticated dry run and a fresh Redis backup.
- `/api/admin/export/redis` and `/api/cron/redis-backup` provide a recoverable Redis snapshot before migration work.

## Activation Checklist

1. Confirm Vercel uses a serverless-compatible Postgres URL.
   - Supabase direct URLs such as `postgresql://...@db.<project>.supabase.co:5432/...` can fail from Vercel serverless with Prisma `P1001`.
   - Prefer the Supabase pooler/Supavisor URL in `POSTGRES_PRISMA_URL` or `POSTGRES_URL`.
   - Keep `DATABASE_URL` as a fallback only if it is already a reachable pooled URL.

2. Confirm production backup health in `/admin`.
   - Latest Redis backup should be recent.
   - If `ADMIN_BACKUP_EMAIL` is configured, status should show an emailed backup.

3. Download a manual backup from `/admin` using `Backup JSON Redis`.
   - Manual exports update the recorded backup timestamp used by the write-backfill guard.

4. Apply the Prisma migration to the production database.
   ```bash
   npx prisma migrate deploy
   ```

5. Verify the new table exists.
   ```sql
   SELECT COUNT(*) FROM "PriceAlertRecord";
   ```

6. Enable dual-write only after the migration succeeds.
   ```env
   PRICE_ALERTS_POSTGRES_SYNC=1
   ```

7. Create one test alert in production.

8. Verify it still appears in `/alertes` through the Redis-backed flow.

9. Verify the Postgres mirror row exists.
   ```sql
   SELECT id, email, "routeFrom", "routeTo", active, "notifFrequency"
   FROM "PriceAlertRecord"
   ORDER BY "syncedAt" DESC
   LIMIT 5;
   ```

10. Open `/api/admin/backfill/price-alerts` as admin and verify:
   - `inSync` is `true`
   - `missingInPostgres`, `extraInPostgres`, and `activeMismatch` are empty arrays

## Rollback

If anything looks wrong:

1. Set `PRICE_ALERTS_POSTGRES_SYNC=0` or remove it.
2. Redeploy.
3. Redis continues serving reads and writes.
4. Keep the Postgres table for inspection; do not drop it during an incident.

## Next Migration Step

Once dual-write has been stable for several days:

1. Run `POST /api/admin/backfill/price-alerts?dryRun=false&confirm=BACKFILL_PRICE_ALERTS` once, after a fresh Redis backup.
2. Re-check `/api/admin/backfill/price-alerts` until `inSync` is true.
3. Add read-through verification in admin, not in user-facing traffic.
4. Only then consider moving reads from Redis to Postgres.
