---
title: 'Story 12.4 — Salon Entity, Memberships & Multi-Location Context'
type: 'feature'
created: '2026-08-21'
status: 'done'
baseline_commit: 'a550fd0'
review_loop_iteration: 0
context: ['_bmad-output/implementation-artifacts/epic-12-context.md']
---

## Intent

**Problem:** Users need to own, manage, or work at multiple salon entities without data leakage between salon tenants.

**Approach:** Implement `getUserSalonMemberships` and `createSalonWithOwner` server functions and `/api/marketplace/salons` endpoints to handle multi-salon creation and context switching safely.

## Boundaries & Constraints

**Always:**
- Transactionally assign creator `owner` membership when creating a new salon.
- Validate salon access using server-derived user identity.

**Never:**
- Allow cross-salon data leakage or unauthorized role elevation.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/lib/server/marketplace.ts` -- Added `getUserSalonMemberships` and `createSalonWithOwner`.
- [x] `web/src/app/api/marketplace/salons/route.ts` -- Added authenticated GET/POST endpoint for multi-salon management.

**Acceptance Criteria:**
- Authorized user can create salon and receives owner membership.
- User can retrieve all active salon memberships.

## Verification

**Commands:**
- `python3 scripts/check_p0_invariants.py` -- expected: 41/41 passed
- `./web/node_modules/.bin/tsc --noEmit --project web/tsconfig.json` -- expected: Zero errors
