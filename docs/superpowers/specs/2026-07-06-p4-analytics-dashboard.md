# KEZA P4: Analytics Dashboard MVP

**Goal:** Track user behavior, search patterns, conversion funnel, ROI metrics.

**Tech Stack:** TypeScript, Next.js 15, Prisma, PostgreSQL, Recharts.

---

## Analytics Tracked

### Core Metrics
- Total searches (daily, weekly, monthly)
- Conversion rate (search → alert set)
- Top 10 routes searched
- Top 10 programs selected
- Currency distribution
- Average search time
- Cache hit rate

### User Behavior
- New vs returning users
- Geographic distribution (geo-detection)
- Device type (mobile vs desktop)
- Search patterns by time of day
- Miles alert creation rate
- Alert hit rate (when threshold met)

### Business Metrics
- User retention (Day 1, 7, 30)
- ARPU (average revenue per user) if monetized
- Search volume trends
- Corridor popularity
- Program popularity

---

## Dashboard Pages

**1. Overview** (`/dashboard`)
- KPI cards: Total searches, conversions, alerts created
- Trending routes chart (top 5 by volume)
- Geographic heatmap
- Daily active users

**2. Routes** (`/dashboard/routes`)
- Route table: Volume, top program, cache hit %
- Chart: Volume over time for top 10 routes
- Filter by date range

**3. Users** (`/dashboard/users`)
- User count trends (DAU, WAU, MAU)
- Retention cohort analysis
- Device breakdown (mobile vs desktop)
- Geographic distribution

**4. Alerts** (`/dashboard/alerts`)
- Total alerts created
- Alert hit rate (% that fired)
- Top programs by alert volume
- Alert effectiveness (conversions)

---

## Implementation

**Database Schema:**
- `analytics_search` — Search event (route, program, date, device)
- `analytics_alert` — Alert creation/fire event
- `analytics_user` — User session data

**Backend:**
- `/api/analytics/*` — Event endpoints for tracking
- `/api/dashboard/*` — Data retrieval for dashboard

**Frontend:**
- `/dashboard` — Analytics pages with Recharts

**Success Criteria:**
- ✅ All core metrics tracked
- ✅ Dashboard pages working
- ✅ Performance: dashboard loads <2s
- ✅ Tests passing
- ✅ Deployed to production
