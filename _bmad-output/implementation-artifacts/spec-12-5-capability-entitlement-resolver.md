---
title: 'Story 12.5 — Capability & Entitlement Resolver'
type: 'feature'
created: '2026-08-21'
status: 'done'
baseline_commit: 'a550fd0'
review_loop_iteration: 0
context: ['_bmad-output/implementation-artifacts/epic-12-context.md']
---

## Intent

**Problem:** Capabilities e.g. public discoverability, multi-location management, staff recruitment must be dynamically resolved server-side based on admin grants, personal professional profiles, salon plan entitlements, and active memberships.

**Approach:** Implement `resolveUserCapabilities(userId, salonId)` in `web/src/lib/server/entitlements.ts` to evaluate user, professional, and salon tier capabilities dynamically.

## Boundaries & Constraints

**Always:**
- Keep capability resolution server-authoritative.
- Fail closed if salon entitlement or professional profile is inactive/expired.

**Never:**
- Trust client-supplied roles, plans, or prices to unlock capabilities.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/lib/server/entitlements.ts` -- Created server capability resolver combining user role, professional profile, membership role, and salon tier.

**Acceptance Criteria:**
- Admin users receive full capability set.
- Salon owners/managers receive capabilities matching salon plan tier.
- Client cannot override capabilities.

## Verification

**Commands:**
- `python3 scripts/check_p0_invariants.py` -- expected: 41/41 passed
- `./web/node_modules/.bin/tsc --noEmit --project web/tsconfig.json` -- expected: Zero errors
