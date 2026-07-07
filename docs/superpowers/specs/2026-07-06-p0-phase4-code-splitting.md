# KEZA P0 Phase 4: Route-Level Code Splitting

**Goal:** Reduce main bundle, lazy-load route-specific code.

**Strategy:**
- Separate `/prix` (calendar) code from main chunk
- Separate `/carte` (map) code from main chunk
- Separate `/programmes` (programs list) code
- Main bundle: ~100KB (search only)
- Each route bundle: 50-150KB (on-demand)

**Impact:** Main chunk -40%, FCP improved on homepage.

**Status:** Spec only, defer to next sprint.
