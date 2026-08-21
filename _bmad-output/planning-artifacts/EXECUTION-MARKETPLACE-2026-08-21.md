---
title: "Afrofade — Marketplace Implementation Execution Plan"
status: ready-to-execute-after-merge
created: 2026-08-21
branch_origin: agent/bmad-marketplace-booking-careers-vision
---

# Afrofade — Marketplace Implementation Execution Plan

## 0. Purpose

This is the handoff contract for a development agent after these planning artifacts are merged to `main`.

The agent must not reinterpret the product from scratch. It must execute the approved PRD, architecture and Stories 12–17 while preserving existing 3D work.

## 1. Source-of-truth order

When documents conflict, use this priority:

1. current user instructions in the implementation conversation;
2. this 2026-08-21 marketplace PRD;
3. 2026-08-21 marketplace architecture;
4. `epics-marketplace-2026-08-21.md` acceptance criteria;
5. 2026-08-21 product decision logs;
6. previous 2026-08-19 PRD/epics for unaffected 3D/security/commerce behavior;
7. historical docs.

Do not revert already-completed security/3D stories merely because older architecture documents differ.

## 2. Required agent execution behavior

For each Story:

1. sync from latest `main`;
2. create a dedicated story branch, e.g. `agent/bmad-12-1-marketplace-identity`;
3. inspect current implementation before changing paths/contracts;
4. create BMAD implementation spec for exact Story AC;
5. implement only the story plus necessary compatibility fixes;
6. add migrations/tests/validation scripts;
7. run targeted tests;
8. run relevant existing CI-equivalent validators;
9. run frontend typecheck/build when web is touched;
10. run production Compose smoke if repository policy/CI requires it;
11. create BMAD review artifact with AC evidence;
12. mark Story done only when all AC pass;
13. open Draft PR by default;
14. never merge without explicit authorization.

Do not combine multiple large stories into one uncontrolled change unless explicitly requested.

## 3. Implementation track order

### Phase M1 — Foundation

Implement strictly:

```text
12.1 Marketplace identity schema
12.2 Legacy salon backfill
12.3 ProfessionalProfile + onboarding
12.4 Salon/membership/multi-location
12.5 Capability/entitlement resolver
12.6 Marketplace plan catalog compatibility
13.1 Hair/service taxonomy bridge
13.2 Bookable services + professional eligibility
13.3 Professional portfolio
13.4 PostGIS location/privacy
13.5 Public profiles
13.6 Nearby search/ranking
13.7 Discovery UI
```

**M1 release gate:** consumer can discover eligible nearby salons/professionals and multi-location ownership works, but booking may still be unavailable.

### Phase M2 — Booking

```text
14.1 Scheduling schema
14.2 Availability engine
14.3 Concurrency-safe booking transaction
14.4 Customer booking journey
14.5 Provider booking operations
14.6 Notification outbox
14.7 TryOn visual brief
14.8 Booking E2E
```

**M2 release gate:** real booking works end-to-end with pay-at-provider, no double booking and durable notifications.

### Phase M3 — Trust

```text
15.1 Verification/listing state
15.2 Verified reviews
15.3 Review UI/aggregates
15.4 Reporting/admin moderation
15.5 Trust-aware ranking
```

### Phase M4 — Careers

```text
16.1 Jobs/applications schema
16.2 Salon recruitment UX
16.3 Professional jobs/apply UX
16.4 Application pipeline
16.5 Hire -> membership handoff
16.6 Careers trust/moderation
```

### Phase M5 — Growth/monetization hardening

```text
17.1 Funnel telemetry
17.2 Professional/salon subscription UX
17.3 Multi-location entitlement limits/aggregate dashboard
17.4 Marketplace payment abstraction (feature-gated)
17.5 Sponsored listing guardrails (feature-gated)
```

Do not enable 17.4 live money routing until a compliant PSP/product decision is explicitly validated.

## 4. Existing 3D work continues

The following work is **not replaced**:

- Story 8.4 TRELLIS.2 + Afrofade LoRA provider;
- Story 8.5 Hunyuan3D Multi-View provider;
- Epic 9 HairFitter / catalog swap / line-up/export;
- consumer credit journey;
- existing admin/production hardening.

Marketplace integration with 3D must use existing canonical contracts and never call generation providers during ordinary search/booking.

## 5. Planned database migrations

Marketplace migration numbering starts after current migration 11:

```text
12_marketplace_identity_foundation.sql
13_marketplace_taxonomy_services.sql
14_marketplace_entitlements.sql
15_marketplace_geospatial_discovery.sql
16_marketplace_booking.sql
17_marketplace_trust_reviews.sql
18_marketplace_careers.sql
```

If `main` gains a migration with one of these numbers before implementation, the agent must renumber safely rather than overwrite a different migration.

### Migration rules

- additive first;
- explicit foreign keys/checks/indexes;
- RLS enabled on exposed tables;
- explicit grants/revokes;
- SECURITY DEFINER functions use safe `search_path`;
- migration/backfill does not depend on browser/client logic;
- include validation query/script;
- no destructive legacy role cleanup until new reads/writes are proven.

## 6. Proposed server/domain modules

Adapt to current repository structure after inspection; do not create duplicates of existing helpers.

Suggested modules:

```text
web/src/lib/authorization/
  capability-resolver.ts
  salon-membership.ts

web/src/lib/marketplace/
  professional-service.ts
  salon-service.ts
  taxonomy.ts
  search.ts

web/src/lib/geo/
  nearby.ts

web/src/lib/bookings/
  availability.ts
  booking-service.ts
  booking-state.ts

web/src/lib/entitlements/
  catalog.ts
  resolver.ts

web/src/lib/careers/
  jobs.ts
  applications.ts

web/src/lib/notifications/
  outbox.ts
  adapters.ts
```

Route handlers/API must use server-authenticated identity and these domain services rather than embedding business rules in React components.

## 7. Proposed web routes

Final naming may follow existing conventions, but capability coverage must exist:

```text
/discover
/salons/[slug]
/professionals/[slug]
/bookings
/bookings/[reference]
/professional/profile
/professional/portfolio
/professional/calendar
/careers
/careers/[jobId]
/careers/applications
/dashboard/salons/[salonId]
/dashboard/salons/[salonId]/services
/dashboard/salons/[salonId]/team
/dashboard/salons/[salonId]/bookings
/dashboard/salons/[salonId]/careers
```

Existing customer/salon/admin routes should be migrated incrementally, not duplicated blindly.

## 8. Security checklist required on every story

- session token validated server-side;
- no authorization from client role string;
- no authorization from localStorage;
- entity ownership/membership validated;
- plan entitlement resolved server-side;
- RLS policies tested with unauthorized identity;
- service-role never shipped client-side;
- public projection excludes private contact/location fields;
- object storage path ownership validated;
- no arbitrary `salon_id`, `professional_id`, `booking_id`, `try_on_asset_id` accepted without authorization;
- idempotency on retryable writes;
- audit event on sensitive state transition.

## 9. Booking invariants required before release

1. Two racing clients cannot both acquire the same exclusive professional slot.
2. “First available” selects only active members eligible for the selected service.
3. Salon closed/time-off/conflicting booking produces no bookable slot.
4. Booking stores service price/duration snapshot.
5. Booking transition history remains auditable.
6. Customer cannot attach another user's private try-on.
7. Provider cannot access booking from unrelated salon.
8. Cancellation/rejection frees capacity according to policy.
9. Notification failure cannot invalidate a committed booking.
10. Booking works without online service payment.

## 10. Search/privacy invariants

- PostGIS spatial index;
- hidden private professional coordinates never in public response;
- consumer exact GPS not persisted merely for search;
- unentitled/unpublished/suspended entities excluded server-side;
- deterministic ranking version documented;
- style match uses canonical taxonomy IDs;
- public search pagination required.

## 11. Careers invariants

- only hair/beard industry scope;
- only eligible salon actors publish jobs;
- application requires owned ProfessionalProfile;
- one application per professional/job;
- applicant private data visible only to authorized recruiting salon;
- application transitions validated;
- hire does not auto-grant membership;
- no AI automated hiring/rejection.

## 12. External providers

### Required for MVP

No new paid external provider is required for core marketplace implementation.

### Optional adapters

- email;
- SMS/WhatsApp;
- map tiles/geocoding if a future UI requires it;
- marketplace/split-payment PSP.

Adapters must be feature-gated/fail-closed when credentials/config are missing. CI must use fakes/mocks.

## 13. PostGIS operational prerequisite

Supabase PostGIS must be enabled before applying geospatial migration in an environment that does not already have it. Migration/readiness documentation must detect/report missing extension clearly.

## 14. Commercial configuration

Do not freeze speculative launch prices into schema.

Use stable product IDs + centralized server configuration. Existing salon plan pricing remains valid until explicitly changed. `PROFESSIONAL_PRO` and multi-location capabilities can be introduced with configurable price/limits.

## 15. Readiness gates

### Gate M1

PASS when:

- identity migration/backfill tested;
- professional/salon pages exist;
- multi-salon works;
- entitlements fail closed;
- PostGIS nearby discovery works;
- no cross-tenant leak;
- CI green.

### Gate M2

PASS when:

- availability reliable;
- booking race test passes;
- customer/provider booking UX complete;
- notifications durable;
- TryOn attachment authorized;
- CI green.

### Gate M3

PASS when verified reviews/moderation are live and ranking consumes trustworthy signals.

### Gate M4

PASS when job post -> application -> hire -> membership invitation works end-to-end.

### Gate M5

PASS when funnel metrics and commercial entitlement UX are production-grade. Marketplace payment remains optional.

## 16. Implementation command intent

When the user tells an agent to “execute the marketplace plan”, interpret that as:

> Start with the first unfinished Story in `epics-marketplace-2026-08-21.md`, follow BMAD spec -> implementation -> tests -> review -> Draft PR workflow, preserve the order/dependencies in this file, and continue story-by-story only within the authorization granted in that conversation.

It does **not** authorize automatic merges or live paid-provider/payment activation.
