# Afrofade Marketplace V2 — Cross-Epic Review

Date: 2026-08-21
Branch: `agent/bmad-ui-ux-future-marketplace`
PR: #15
BMAD scope: Epics 12 through 17

## Review conclusion

The Marketplace V2 implementation is functionally present across identity, discovery, booking, trust, careers and growth/readiness. The BMAD tracker intentionally keeps implemented stories in `review`, not `done`.

### Implemented review surfaces

- multi-context identity (`personal`, independent professional, salon memberships, admin);
- professional/salon onboarding and entitlements;
- smartphone-only four-item bottom navigation plus hamburger/full navigation;
- shared hair/beard taxonomy, services, portfolio and privacy-aware PostGIS discovery;
- Marketplace Landing V2, public provider profiles and `/discover`;
- concurrency-safe booking, availability, provider operations, notifications and Visual Brief;
- verification, completed-booking-only reviews, reporting, trust ranking and unified admin moderation;
- Careers jobs/applications/pipeline with explicit hire-to-membership invitation handoff;
- privacy-aware funnel telemetry including authoritative completion events;
- subscription UX, multi-location Business overview;
- service payment and sponsored listing layers disabled by default behind feature gates.

## Validation assets

- `scripts/check_marketplace_v2_contract.py`
- `.github/workflows/marketplace-v2-review.yml`
- PostgreSQL contracts under `web/supabase/tests/`
- BMAD status: `_bmad-output/implementation-artifacts/marketplace-sprint-status.yaml`

## CI evidence status

GitHub connector queries returned no workflow runs/statuses for the latest Marketplace commits. Therefore no Marketplace story is promoted to `done` and release gates remain `review_pending_ci`.

## Main-branch integration blocker

While Marketplace V2 was being implemented, `main` advanced by 13 commits from the branch merge base. Those commits contain a parallel backend/marketplace implementation and infrastructure work.

A direct history-only merge was tested and immediately rolled back because it would have represented newer `main` files as deleted in the PR. The Marketplace branch was restored to its pre-merge content SHA; no Marketplace work was lost.

The integration must use a real three-way merge/rebase and preserve both tracks. Known semantic overlap requiring deliberate resolution includes at least:

- `_bmad-output/implementation-artifacts/marketplace-sprint-status.yaml`
- `web/src/app/api/marketplace/reviews/route.ts`
- `web/src/app/api/marketplace/salons/route.ts`

Main also contains newer infrastructure/auth/server modules that must not be removed, including additions under `api/`, `web/src/lib/server/`, marketplace server helpers, auth changes and additions to `04_role_dashboards.sql`.

## Merge policy

Do not merge PR #15 until all of the following are true:

1. `main` is reconciled into the branch with its newer infrastructure preserved;
2. Marketplace V2 static contract passes;
3. Next/TypeScript typecheck passes;
4. database migration contracts pass on PostgreSQL/Supabase test DB;
5. PR is mergeable and BMAD review evidence is green.

Stories 17.4 (service online/deposit payment readiness) and 17.5 (sponsored listings) remain feature-gated even after code review and require explicit commercial rollout decisions.
