---
title: 'Story 12.6 — Marketplace Plan Catalog Compatibility'
type: 'feature'
created: '2026-08-21'
status: 'done'
baseline_commit: 'a550fd0'
review_loop_iteration: 0
context: ['_bmad-output/implementation-artifacts/epic-12-context.md']
---

## Intent

**Problem:** The plan catalog must support independent professional offerings e.g. `PROFESSIONAL_PRO` alongside existing salon plans e.g. `PRO`, `VIP`, `EXTRA`.

**Approach:** Update `web/src/lib/plans.ts` to include `PROFESSIONAL_PRO` and export structured plan information while preserving existing credit wallet and payment idempotency.

## Boundaries & Constraints

**Always:**
- Keep plan prices and features centralized server-side.
- Preserve existing consumer credit wallet logic.

**Never:**
- Allow client-supplied prices to dictate checkout.

## Tasks & Acceptance

**Execution:**
- [x] `web/src/lib/plans.ts` -- Updated `PlanName` type and added `PROFESSIONAL_PRO_PLAN` definition.

**Acceptance Criteria:**
- Plan catalog supports `PROFESSIONAL_PRO`.
- Server pricing remains authoritative.

## Verification

**Commands:**
- `python3 scripts/check_p0_invariants.py` -- expected: 41/41 passed
- `./web/node_modules/.bin/tsc --noEmit --project web/tsconfig.json` -- expected: Zero errors
