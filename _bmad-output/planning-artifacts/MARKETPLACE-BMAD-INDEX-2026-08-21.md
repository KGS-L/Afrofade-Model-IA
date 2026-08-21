---
title: "Afrofade Marketplace — BMAD Planning Index"
status: ready-to-execute-after-merge
created: 2026-08-21
updated: 2026-08-21
---

# Afrofade Marketplace — BMAD Planning Index

Use this file as the entry point for the 2026-08-21 product expansion.

## Read in this order

1. `change-proposal-2026-08-21-marketplace-network.md`
   - why the product is changing;
   - what is preserved;
   - approved Correct Course.

2. `competitive-research-2026-08-21-afrofade-marketplace-booking-careers.md`
   - deep competitive research: Burkina, West Africa, Africa and concept analogs.

3. `competitive-landscape-2026-08-21-africa.md`
   - concise strategic synthesis;
   - current status note on GlamAfric;
   - Afrofade differentiation thesis.

4. `brainstorming-decisions-2026-08-21-marketplace-booking-careers.md`
   - decisions D01-D07.

5. `brainstorming-decision-D08-geolocation-2026-08-21.md`
   - canonical D08: geolocation/local discovery/privacy.

6. `product-decisions-d09-d15-2026-08-21-marketplace.md`
   - decisions D09-D15;
   - monetization, ranking, careers, notifications, trust, booking and phased scope.

7. `prds/prd-Afrofade-2026-08-21-marketplace/prd.md`
   - canonical marketplace-aware product requirements.

8. `architecture/ARCHITECTURE-AFROFADE-MARKETPLACE-2026-08-21.md`
   - domain/data/security/API architecture;
   - migrations 12-18;
   - booking concurrency/RLS invariants.

9. `ux-designs/UX-AFROFADE-MARKETPLACE-2026-08-21.md`
   - navigation and screen behavior;
   - onboarding, discover, booking, professional and salon workspaces, careers.

10. `epics-marketplace-2026-08-21.md`
    - Epics 12-17;
    - implementation stories and acceptance criteria.

11. `EXECUTION-MARKETPLACE-2026-08-21.md`
    - exact story order;
    - branch/spec/test/review workflow;
    - implementation gates and no-merge rule.

12. `_bmad-output/implementation-artifacts/readiness-2026-08-21-marketplace.md`
    - implementation readiness result.

13. `_bmad-output/implementation-artifacts/marketplace-sprint-status.yaml`
    - live marketplace story status during implementation.

## Deprecated redirect

`product-decisions-d08-d15-2026-08-21-marketplace.md` is intentionally retained only as a redirect because D08 had already been assigned to geolocation. Do not use it as decision authority.

## Existing artifacts that remain authoritative for unaffected areas

- 2026-08-19 post-P0 PRD for unchanged security/commerce/3D requirements;
- existing Epics 6-11;
- Story 7 durable head infrastructure;
- Story 8 Hair Asset Factory;
- Epic 9 Hair Fitting/Studio;
- existing payment/credit/security implementation and CI contracts.

## Execution start

After this planning set is merged to `main`, marketplace coding begins at:

> **Story 12.1 — Marketplace identity schema**

unless a more recent explicitly approved BMAD artifact changes the order.

## Important non-authorizations

This planning set does not authorize:

- automatic PR merge;
- live paid provider calls in CI;
- live marketplace split payments;
- third-party fiat custody;
- destructive removal of legacy roles before migration validation;
- social feed/unrestricted messaging scope.
