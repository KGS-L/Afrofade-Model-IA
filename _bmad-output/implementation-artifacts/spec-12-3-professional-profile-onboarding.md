---
title: 'Story 12.3 — Professional Profile Domain & Onboarding'
type: 'feature'
created: '2026-08-21'
status: 'done'
baseline_commit: 'a550fd0'
review_loop_iteration: 0
context: ['_bmad-output/implementation-artifacts/epic-12-context.md']
---

## Intent

**Problem:** Hair professionals need the ability to maintain independent professional identities (bio, operating mode, location, job seeking state) decoupled from salon entities.

**Approach:** Implement server-side domain helper methods and Next.js API endpoints (`/api/marketplace/profile`) to query and update professional profiles safely.

## Boundaries & Constraints

**Always:**
- Derive user identity server-side (`getVerifiedPrincipal`).
- Filter out non-published or unverified profiles from public queries.

**Never:**
- Expose private professional details on public profile endpoints.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/lib/server/marketplace.ts` -- Added `getProfessionalProfile`, `upsertProfessionalProfile`, and `getPublicProfessionalProfile`.
- [x] `web/src/app/api/marketplace/profile/route.ts` -- Added authenticated GET/POST endpoint for professional profiles.

**Acceptance Criteria:**
- Authenticated user can create and update own professional profile.
- Unverified/draft profiles are not returned on public queries.

## Verification

**Commands:**
- `python3 scripts/check_p0_invariants.py` -- expected: 41/41 passed
- `./web/node_modules/.bin/tsc --noEmit --project web/tsconfig.json` -- expected: Zero errors
