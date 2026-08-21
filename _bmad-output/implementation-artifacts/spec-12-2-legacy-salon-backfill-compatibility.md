---
title: 'Story 12.2 — Legacy Salon Backfill & Compatibility'
type: 'feature'
created: '2026-08-21'
status: 'done'
baseline_commit: 'a550fd0'
review_loop_iteration: 0
context: ['_bmad-output/implementation-artifacts/epic-12-context.md']
---

## Intent

**Problem:** Existing salon accounts in production were created prior to the multi-membership model and need deterministic backfill into `salon_memberships` and `professional_profiles`.

**Approach:** Implement `backfill_legacy_salon_memberships()` procedure in PostgreSQL to deterministically create owner memberships and professional profiles without mutating existing columns or duplicating rows on rerun.

## Boundaries & Constraints

**Always:**
- Ensure backfill script is idempotent (`ON CONFLICT DO NOTHING`).
- Preserve all existing user accounts, customer profiles, and salon records.

**Ask First:**
- Dropping legacy foreign keys or columns.

**Never:**
- Allow loss of admin rights or duplicate membership records on rerun.

## Tasks & Acceptance

**Execution:**
- [x] `web/supabase/migrations/04_role_dashboards.sql` -- Added `backfill_legacy_salon_memberships()` stored procedure for deterministic backfill.

**Acceptance Criteria:**
- Existing salon user profiles receive active owner memberships in `salon_memberships`.
- Professional profiles exist for all users.
- Rerunning backfill produces zero duplicate rows.

## Verification

**Commands:**
- `python3 scripts/check_p0_invariants.py` -- expected: 41/41 passed
- `./web/node_modules/.bin/tsc --noEmit --project web/tsconfig.json` -- expected: Zero errors
