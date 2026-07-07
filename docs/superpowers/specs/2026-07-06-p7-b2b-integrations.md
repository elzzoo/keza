# KEZA P7: B2B Integrations & White-Label

**Goal:** APIs for partners, white-label KEZA for travel agencies.

**Products:**

### 1. Public API
- `/api/search` — Flight search endpoint
- `/api/programs` — Loyalty programs lookup
- `/api/pricing` — Dynamic pricing for flights
- Rate limits: 1000 req/day free tier
- Pricing: $0.01 per 100 requests

### 2. White-Label
- Standalone KEZA instance with partner branding
- Custom domain (partner.keza.app or partner.com)
- Custom logo, colors, currency
- Split revenue: 70% partner, 30% KEZA

### 3. Travel Agency Integration
- Embed KEZA widget in partner's booking page
- Auto-fill passenger details
- Referral links & commission tracking
- Admin dashboard for partners

**Architecture:**
- Multi-tenant Vercel deployment
- Separate database per tenant
- API rate limiting + auth
- Stripe integration for payments

**Effort:** Very High (2-3 sprints)

**Status:** Spec only, defer to next quarter.

**Success Criteria:**
- ✅ 10 partners signed up
- ✅ $50k MRR from API + white-label
- ✅ Admin dashboard working
