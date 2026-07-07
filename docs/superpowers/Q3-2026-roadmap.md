# KEZA Q3 2026 Roadmap

**Current State (End of Q2):**
- ✅ 7 features shipped (P0 Phases 1-3, P1-P3, P5)
- ✅ 1,841+ tests passing
- ✅ Production deployment verified (SHA 9c59697)
- 📋 P4 Analytics Dashboard ready for implementation
- 📋 P0.4 Code Splitting ready for implementation
- 📋 P6 Mobile App spec ready (Q3-Q4 initiative)
- 📋 P7 B2B Integrations spec ready (Q4 initiative)

---

## Q3 Priorities

### Tier 1: High Impact, Ready to Ship (Weeks 1-6)

#### P4: Analytics Dashboard MVP ⭐⭐⭐
- **Status:** Implementation plan ready (22 tasks)
- **Effort:** 1.5-2 weeks (subagent-driven development)
- **Value:** Internal observability, product metrics, conversion tracking
- **Blockers:** None
- **Success:** 40+ tests, all dashboard pages working, production deployment
- **Start:** ASAP (in progress)

#### P0.4: Code Splitting ⭐⭐
- **Status:** Implementation plan ready (11 tasks)
- **Effort:** 3-5 days
- **Value:** Main bundle -40%, FCP improvement, better homepage experience
- **Blockers:** None
- **Success:** Main bundle <100KB, Lighthouse FCP improved
- **Start:** After P4 phase 1 (week 2)

---

### Tier 2: Strategic Growth (Weeks 7-12)

#### P6: Mobile App (React Native or Flutter) ⭐⭐⭐⭐
- **Status:** Spec complete, architecture documented
- **Effort:** 3-4 sprints (3-4 weeks each)
- **Value:** iOS + Android presence, ~10k+ downloads potential
- **Requirements:**
  - Feature parity with web app
  - Native push notifications
  - Offline mode (Realm DB)
  - Deep linking for sharing
- **Recommended Stack:** React Native (leverages existing JS/TS team)
- **Decision Point:** Choose Expo vs. bare React Native (Expo = faster, bare = more control)
- **Start:** Week 7-8 (after P4 + P0.4)

#### P5.2: Advanced Pricing (Enhancements to P5) ⭐
- **Status:** Foundation laid (99 tests, value scoring working)
- **Effort:** 1-2 weeks
- **Value:** ML-powered booking recommendations, A/B testing framework
- **Features:**
  - Implement A/B testing framework (two ranking strategies vs. baseline)
  - Add ML inference for "best booking window" predictions
  - Expand recommendation engine (10+ signals instead of current 3)
  - Price drop alerts with configurable thresholds
- **Start:** Week 4-5 (parallel with P0.4)

---

### Tier 3: Platform & Scale (Q4 2026)

#### P7: B2B Integrations & White-Label ⭐⭐⭐⭐⭐
- **Status:** Spec complete, architecture designed
- **Effort:** 2-3 sprints
- **Value:** $50k+ MRR potential, 10+ partners
- **Components:**
  - Public API (`/api/search`, `/api/programs`, `/api/pricing`)
  - Rate limiting + API key management
  - White-label deployment (multi-tenant Vercel)
  - Stripe revenue split implementation
  - Partner admin dashboard
- **Blockers:** None (P4 analytics can feed B2B dashboard)
- **Start:** Q4 (after P6 proof-of-concept)

#### P8: Performance Optimization Cycle ⭐⭐
- **Status:** P0 phases (performance) complete, monitoring ready
- **Effort:** Ongoing (2-3 days/week)
- **Value:** Sub-2s first results, sub-5s full results
- **Activities:**
  - Monitor production Lighthouse scores
  - Implement Server-Sent Events for more routes
  - Consider edge caching for static data
  - Profile and optimize slow queries
- **Start:** After P4 analytics provide visibility

---

## Dependencies & Sequencing

```
Q2 Completion (Current)
├─ P4 Analytics (Tier 1)  ← SHIPPING THIS WEEK
├─ P0.4 Code Splitting (Tier 1) ← SHIPPING WEEK 2
│
├─ P5.2 Advanced Pricing (Tier 2, parallel to P0.4) ← WEEK 4
├─ P6 Mobile App Discovery (Tier 2, starts week 7) ← WEEK 7
│   └─ Depends on: P4 analytics for backend insights
│
├─ P7 B2B APIs (Tier 3, Q4) ← MONTH 3
│   └─ Depends on: P4 analytics, API rate limiting
│
└─ P8 Performance Ops (Tier 3, ongoing)
    └─ Depends on: P4 analytics monitoring
```

---

## Decision Points Required

### 1. P6 Mobile: Expo vs. Bare React Native? (Week 7)
- **Expo:** Faster to market (2 weeks → production), managed build service, no ejection needed
- **Bare RN:** Full native control, better performance, more setup (~3-4 weeks)
- **Recommendation:** Start with Expo for MVP, migrate to bare if performance becomes critical
- **User Impact:** Expo can handle 10k+ downloads, re-evaluate at scale

### 2. P7 B2B: Self-Hosted vs. Multi-Tenant SaaS? (Week 10)
- **Multi-tenant (Recommended):** Single database, tenant isolation via row-level security, simpler ops
- **Self-hosted:** Each partner gets their own instance, more control, higher cost
- **Recommendation:** Multi-tenant for MVPwith migration path to self-hosted if partners request

### 3. A/B Testing Framework: In-House vs. Third-Party? (Week 4)
- **In-House:** Full control, integrate with analytics, cheaper at scale
- **Third-party (LaunchDarkly, Optimizely):** Faster setup, built-in experimentation
- **Recommendation:** In-house lightweight framework (targeting/rollout only), third-party only if UX testing needed

---

## Success Metrics by Tier

### Tier 1 (P4 + P0.4)
- ✅ P4: Dashboard deployed, all 4 pages live, 40+ tests
- ✅ P0.4: Main bundle <100KB, FCP improved 20%+
- **Timeline:** Complete by end of week 2

### Tier 2 (P5.2 + P6 start)
- ✅ P5.2: A/B testing framework deployed, 3+ ranking variants tested
- ✅ P6: Mobile app MVP (iOS + Android) available for beta testing
- **Timeline:** Complete P5.2 by week 5, P6 alpha by week 10

### Tier 3 (P7 + P8)
- ✅ P7: Public API live, 5+ partners onboarded, $10k+ MRR
- ✅ P8: Lighthouse scores maintained (green), <5s p95 search latency
- **Timeline:** P7 MVP by Q4 week 1, ongoing P8

---

## Resource Allocation

**Q3 Suggested Allocation:**
- **Development:** 80% (P4, P0.4, P5.2, P6 start)
- **Operations:** 10% (deployment, monitoring, incident response)
- **Planning:** 10% (Q4 prep, user research for mobile)

**Recommended Team Structure:**
- **Agent Lead:** Coordinates all 22 tasks (P4), reviews pull requests, manages dependencies
- **Support Agent:** Handles testing, documentation, deployment verification
- **Optional:** External contractor for mobile app if accelerating P6 timeline

---

## Q3 KPIs to Track (via P4 Analytics)

1. **Search Volume:** Target 5,000+ searches/week by end of Q3
2. **Conversion Rate:** Target 3%+ (miles alert → booking)
3. **Mobile Traffic:** Target 25%+ by end of Q3 (post-P6 launch)
4. **API Usage:** Track B2B API calls pre-launch (validate demand)
5. **Performance:** Main bundle size, FCP, search latency p95
6. **User Retention:** DAU, WAU, MAU trends (via P4 analytics)

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| P4 analytics over-complexity | Medium | High | Use existing Recharts patterns, keep API simple |
| P6 mobile fragmentation (iOS/Android differences) | High | Medium | Standardize on Expo, use native modules sparingly |
| P7 B2B tenant isolation security issues | Medium | Critical | Use Postgres RLS for isolation, security audit |
| Performance regression in P0.4 code splitting | Low | Medium | E2E tests + Lighthouse CI |
| User confusion with A/B tests (P5.2) | Low | Low | Clear communication of ranking changes |

---

## Next Steps

**This Week:**
1. ✅ Deploy P5 Pricing to production
2. 🔄 Execute P4 Analytics (22 tasks via subagents)
3. 📋 Prepare P0.4 Code Splitting launch

**Next Week:**
1. ✅ Verify P4 analytics in production
2. 🔄 Launch P0.4 code splitting
3. 📋 Kickoff P5.2 A/B testing research

**Week 3-4:**
1. ✅ P4 + P0.4 monitoring & tuning
2. 🔄 P5.2 implementation
3. 📋 P6 mobile tech decision + team kickoff

---

## Long-Term Vision (Q4 2026 - Q1 2027)

By end of Q4:
- KEZA is the #1 loyalty miles flight comparator globally
- iOS + Android apps at 50k+ downloads
- B2B API serving 20+ travel partner integrations
- $100k+ MRR (30% from B2B, 70% from other channels)
- Sub-2s first results, sub-5s full search
- Real-time price alerts converting 10%+ of searchers

---

**Owner:** Product Lead / CTO  
**Last Updated:** 2026-07-07  
**Next Review:** 2026-08-01
