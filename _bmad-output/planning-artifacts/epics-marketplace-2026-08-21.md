---
title: "Afrofade — Marketplace, Booking & Careers Epics/Stories"
status: ready-for-implementation
created: 2026-08-21
continues_after: "Epic 11 in _bmad-output/planning-artifacts/epics.md"
track: "Marketplace M1-M5"
---

# Afrofade — Marketplace, Booking & Careers Backlog

## Continuity rule

Existing Epics 6–11 and active 3D Stories remain valid. New marketplace work begins at **Epic 12** to preserve BMAD traceability.

Marketplace foundation can progress in parallel with existing Hair Asset / Hair Fitting work. Stories that attach a `TryOnAsset` must remain nullable/degraded-safe until the corresponding 3D flow is available.

Every story must preserve existing CI/CD, auth hardening, payment idempotency, 3D contracts and tenant isolation.

---

# Epic 12 — Identity, Professional Profiles, Salons & Entitlements

**Goal:** replace the unsafe conceptual `user == salon` assumption with durable people/business/membership relationships while preserving existing users and production data.

**Exit condition:** a user can be a consumer, have an optional professional profile, own/manage/work at multiple salons, and receive capabilities from personal or salon entitlements without breaking current admin/customer behavior.

## Story 12.1 — Marketplace identity schema

**Priority:** M1-1

### Acceptance criteria

- migration `12_marketplace_identity_foundation.sql` creates `professional_profiles`, `salons`, `salon_memberships` and required enums/checks/indexes;
- `professional_profiles.user_id` is unique and references authenticated user identity;
- salon ownership is represented through membership, not a single authoritative `owner_user_id`/`user_profiles.salon_id` assumption;
- membership supports `owner`, `manager`, `professional` and explicit state;
- one user can have active memberships in multiple salons;
- one salon can have multiple authorized members;
- RLS denies unauthorized cross-tenant reads/writes;
- public fields are not exposed through broad private-table SELECT policies;
- migration contains validation queries/comments and is safe on existing data.

## Story 12.2 — Legacy salon backfill & compatibility

**Priority:** M1-2

### Acceptance criteria

- existing `customer`, `salon`, `admin` records are analyzed/backfilled deterministically;
- existing salon business data maps to `salons` without duplicating rows on rerun;
- current authoritative salon account receives correct owner membership;
- existing `salon_id` references are mapped where present;
- no existing admin loses admin access;
- no destructive column drop occurs in this story;
- validation reports counts: legacy salons, created salons, memberships, unmatched records;
- rollback/repair notes documented.

## Story 12.3 — ProfessionalProfile domain + onboarding

**Priority:** M1-3

### Acceptance criteria

- authenticated user can create/update own professional profile;
- profile supports professional name, bio/headline, operating mode, job-seeking state, city/neighborhood/service radius and verification/listing state;
- salon membership is not required;
- independent public listing requires eligible entitlement and publishable profile state;
- private/non-public fields are never returned by public profile endpoint;
- onboarding UI offers consumer / hair professional / salon owner-manager intent without making those choices irreversible global roles;
- tests cover owner-only mutation and public/private projection.

## Story 12.4 — Salon entity, memberships & multi-location dashboard context

**Priority:** M1-4

### Acceptance criteria

- authorized user can create salon; creator receives owner membership transactionally;
- owner can create multiple salon locations subject to entitlement limits;
- owner/authorized manager can invite members;
- invited membership must be accepted/activated explicitly where invitation flow is used;
- manager cannot grant owner rights unless product permission explicitly allows;
- professional membership does not grant salon billing/admin rights;
- dashboard exposes a salon/location switcher based on authorized memberships;
- every server mutation includes explicit `salonId` context and authorization check;
- tests prove no data leak between two salons owned by different users.

## Story 12.5 — Capability / entitlement resolver

**Priority:** M1-5

### Acceptance criteria

- stable capability identifiers are defined server-side;
- resolver combines admin grants, personal professional entitlement, active membership and salon entitlement;
- salon-affiliated professional can perform allowed salon work without personal subscription;
- independent discoverability/direct booking is denied when required personal entitlement is inactive;
- expired/inactive salon entitlement fails closed for gated commercial actions;
- existing B2C credit wallet remains separate from commercial entitlements;
- client-supplied role/plan/price cannot grant capability;
- unit/integration tests cover capability matrix.

## Story 12.6 — Marketplace plan catalog compatibility

**Priority:** M1-6

### Acceptance criteria

- server plan catalog supports `PROFESSIONAL_PRO` and existing salon plan IDs plus multi-location/business capability;
- price/limits/capabilities are centralized and server-authoritative;
- current checkout/finalization can map purchased product to correct entitlement without client price authority;
- no third-party fiat wallet is introduced;
- existing consumer credits/payment tests stay green;
- public pricing UI reads display metadata from approved catalog/source-of-truth.

---

# Epic 13 — Hair Taxonomy, Services, Portfolio & Local Discovery

**Goal:** make salons/professionals searchable by what they can actually do and where they operate, while connecting marketplace intent to Afrofade's hairstyle assets.

## Story 13.1 — Canonical hair/service taxonomy bridge

**Priority:** M1-7

### Acceptance criteria

- migration `13_marketplace_taxonomy_services.sql` creates normalized hair/beard taxonomy and skill/service link tables;
- taxonomy has stable IDs/slugs independent of translated display labels;
- existing `hair_asset_versions.style_id` can map to taxonomy without rewriting immutable asset provenance;
- professional skills use normalized IDs, not only free text;
- salon/independent services can link to one or more styles/skills;
- aliases/search terms can support French/local naming later;
- seed data is idempotent and versioned/documented.

## Story 13.2 — Bookable services & professional eligibility

**Priority:** M1-8

### Acceptance criteria

- service belongs to exactly one provider context (salon or independent professional);
- service stores name, duration, buffers, price/currency, active/booking-enabled state;
- salon service can declare eligible professional memberships;
- unauthorized member cannot modify service catalog;
- old bookings will later be protected by snapshots instead of live service values;
- service API/UI supports CRUD with validation;
- tests cover provider-context CHECK constraints.

## Story 13.3 — Professional portfolio

**Priority:** M1-9

### Acceptance criteria

- portfolio media metadata uses owned Storage paths and server-verified professional ownership;
- items support style/skill tags and moderation/publication state;
- public profile returns only published/approved portfolio items;
- upload MIME/size rules are enforced;
- deletion cannot delete another professional's object by forged path/id;
- portfolio is visible on professional public page;
- no paid image/AI provider required in CI.

## Story 13.4 — PostGIS provider location & privacy

**Priority:** M1-10

### Acceptance criteria

- migration `15_marketplace_geospatial_discovery.sql` enables/documents PostGIS prerequisite and adds geography fields/indexes;
- salon has precise public business point where provided;
- independent professional may publish point or service area without private home address;
- GiST indexes exist;
- public projections/RPCs do not expose hidden coordinates;
- consumer GPS is accepted as search input without mandatory persistence;
- manual city/neighborhood fallback works;
- test fixtures verify nearby ordering/radius boundary.

## Story 13.5 — Public salon & professional profiles

**Priority:** M1-11

### Acceptance criteria

- public salon route displays approved business identity, services, hours, team, portfolio/media and rating placeholder/aggregate when available;
- public professional route displays approved identity, skills, portfolio, current public affiliations and operating mode;
- unpublished/suspended entities return non-discoverable behavior;
- private email, hidden location and internal membership data are absent from public payload;
- SEO-friendly stable slugs and metadata exist;
- mobile layout works without authentication.

## Story 13.6 — Nearby search & deterministic ranking V1

**Priority:** M1-12

### Acceptance criteria

- search endpoint/RPC paginates eligible salons and independent professionals;
- filters include provider type, distance/radius, style/service and other fields actually indexed/available;
- style-aware search uses taxonomy links;
- ranking V1 is deterministic and documented;
- inactive/unentitled/unpublished providers are excluded server-side;
- distance is computed server-side;
- search accepts no GPS via permanent profile mutation;
- basic performance test proves spatial index usage or avoids obvious full-table distance sort at target fixture scale.

## Story 13.7 — Discovery UI

**Priority:** M1-13

### Acceptance criteria

- `/discover` provides location permission path and manual fallback;
- results can show salon and independent professional distinctly;
- filters update search without losing selected style context;
- user can navigate from a 3D/catalog style to discovery with `styleId`;
- empty/degraded states are explicit;
- no map SDK is required for first release if list-based nearby discovery is complete;
- accessibility/mobile behavior tested.

---

# Epic 14 — Availability, Booking, Visual Brief & Notifications

**Goal:** convert marketplace intent into reliable appointments without double-booking and without requiring online service payment.

## Story 14.1 — Scheduling schema

**Priority:** M2-1

### Acceptance criteria

- migration `16_marketplace_booking.sql` creates salon hours, professional working hours, time off/blocks, bookings and booking events;
- schedule data has explicit timezone semantics;
- recurring working rules and exceptions are representable;
- ownership/RLS follows salon membership or professional ownership;
- no arbitrary public user can read private schedule details beyond exposed availability.

## Story 14.2 — Availability engine

**Priority:** M2-2

### Acceptance criteria

- availability takes provider context + service + bounded date window;
- service duration and buffers are respected;
- salon hours, professional hours, blocks/time off and existing bookings are intersected;
- specific professional and first-available salon modes supported;
- only eligible active members can satisfy salon service;
- output is deterministic and pagination/window-bounded;
- tests cover edge overlap, closed salon, time off and timezone/date boundary.

## Story 14.3 — Concurrency-safe booking transaction/RPC

**Priority:** M2-3

### Acceptance criteria

- booking create endpoint requires idempotency key;
- server revalidates ownership/eligibility/service/slot immediately before commit;
- competing requests for same exclusive professional slot cannot both confirm;
- transaction stores service name/duration/price/currency snapshot;
- provider-context CHECK invariants enforced;
- booking event is written in same transaction;
- notification outbox event is written atomically;
- retry with same idempotency key returns same booking result;
- concurrency integration test exists.

## Story 14.4 — Customer booking journey

**Priority:** M2-4

### Acceptance criteria

- customer can book from salon/professional public profile;
- salon supports specific professional or first available when configured;
- customer sees authoritative slot before final submission and clear conflict message if lost to another booking;
- booking confirmation page shows provider, service, professional/assignment, date/time, quoted price and status;
- pay-at-provider is supported without payment checkout;
- customer can view upcoming/past bookings;
- cancellation rules are server enforced.

## Story 14.5 — Provider booking operations

**Priority:** M2-5

### Acceptance criteria

- salon owner/manager sees salon bookings for authorized location;
- assigned salon professional sees bookings permitted by membership policy;
- independent professional sees own direct bookings;
- provider can confirm/reject/reschedule/complete/mark no-show only through valid transitions;
- every transition writes booking event with actor/timestamp;
- multi-salon dashboard never mixes mutation context accidentally;
- customer sees resulting state.

## Story 14.6 — Notification outbox & in-app notifications

**Priority:** M2-6

### Acceptance criteria

- durable outbox table has dedupe key, status, attempts and retry schedule;
- booking transaction writes outbox without external network call in transaction;
- worker/processor creates in-app notification projection;
- duplicate processing does not duplicate notification;
- failed external adapter delivery can retry without changing booking state;
- provider adapter interfaces exist for email/SMS/WhatsApp but remain feature-gated when credentials are absent;
- no secrets logged.

## Story 14.7 — Saved look / TryOn visual brief integration

**Priority:** M2-7

### Acceptance criteria

- booking may attach an owned/authorized saved look or `TryOnAsset` reference;
- forged try-on ID from another user is rejected;
- booking stores/reference-resolves exact head/hair/style versions or immutable export/brief metadata;
- provider booking view shows visual brief when available;
- booking works identically when visual brief is null;
- normal booking never invokes hair generation provider.

## Story 14.8 — Booking lifecycle E2E

**Priority:** M2-8

### Acceptance criteria

- E2E/integration covers consumer search -> profile -> slot -> confirmed booking -> provider completion;
- first-available and specific-professional paths covered;
- double-book race covered;
- unauthorized salon access rejected;
- cancelled/expired slots become available according to policy;
- notification outbox asserted;
- CI uses no paid provider.

---

# Epic 15 — Trust, Verified Reviews, Verification & Moderation

**Goal:** create trustworthy marketplace reputation tied to real service activity.

## Story 15.1 — Verification and listing state machine

**Priority:** M3-1

### Acceptance criteria

- professional and salon expose explicit verification/listing states;
- publishability is server-authoritative;
- suspended/rejected listing is removed from discovery/bookability;
- admin transitions are authorization-protected and auditable;
- UI clearly distinguishes unverified/pending/verified where product policy requires;
- schema permits future verification evidence without exposing private documents publicly.

## Story 15.2 — Verified reviews schema & eligibility

**Priority:** M3-2

### Acceptance criteria

- migration `17_marketplace_trust_reviews.sql` creates reviews and moderation/report structures;
- one review per eligible completed booking;
- review targets are derived from booking, not arbitrary client IDs;
- salon and assigned professional rating fields are separate;
- only booking customer can create/update permitted review content;
- provider cannot edit customer review;
- RLS/tests cover forged booking/target IDs.

## Story 15.3 — Review UI & aggregates

**Priority:** M3-3

### Acceptance criteria

- completed booking prompts eligible customer to review;
- public profile displays verified-service indicator;
- salon/professional aggregates are computed separately;
- hidden/moderated review does not remain in public aggregate according to policy;
- zero/low review counts are displayed honestly;
- no imported testimonial is labeled verified booking.

## Story 15.4 — Reporting & admin moderation

**Priority:** M3-4

### Acceptance criteria

- user can report profile/listing/portfolio/review/job post;
- report includes target, reason, reporter and state;
- admin moderation dashboard can inspect and resolve;
- suspension/hide actions are audited;
- users cannot enumerate private reports not belonging to them;
- moderation action invalidates public caches/projections appropriately.

## Story 15.5 — Trust-aware marketplace ranking

**Priority:** M3-5

### Acceptance criteria

- discovery ranking incorporates verified rating/count and verification state only after eligibility filters;
- ranking formula/version is documented in code/config;
- low-count perfect rating is not automatically equivalent to high-confidence reputation if confidence weighting is implemented;
- paid boost, if absent, cannot silently exist;
- tests use deterministic fixtures.

---

# Epic 16 — Hair Careers & Recruitment Network

**Goal:** let salons recruit through the same professional identity/skills used by customer marketplace.

## Story 16.1 — Job posting & application schema

**Priority:** M4-1

### Acceptance criteria

- migration `18_marketplace_careers.sql` creates job postings, required skills, applications and application events;
- only authorized eligible salon owner/manager can create/publish job;
- jobs belong to concrete salon location;
- professional can apply once per job;
- application includes profile snapshot;
- RLS prevents unrelated salons from reading applicant data;
- job/application state enums/checks defined.

## Story 16.2 — Salon recruitment UX

**Priority:** M4-2

### Acceptance criteria

- salon can create draft, publish, pause/close job;
- form captures title, description, required normalized skills, experience, work mode and optional compensation range;
- salon sees applications grouped/status-filtered;
- manager permissions respected per location;
- expired/closed job rejects new application server-side.

## Story 16.3 — Professional jobs discovery & application

**Priority:** M4-3

### Acceptance criteria

- professional can browse/search active hair-industry jobs;
- filters include location and normalized skills where available;
- job-seeking state controls discoverability by recruiters, not ability to manually browse unless policy says otherwise;
- apply uses existing ProfessionalProfile/portfolio, no mandatory PDF CV;
- duplicate submit is idempotent/rejected cleanly;
- professional sees own application history/status.

## Story 16.4 — Application pipeline

**Priority:** M4-4

### Acceptance criteria

- allowed states: submitted/viewed/shortlisted/interview/offered/hired/rejected/withdrawn/closed or documented equivalent;
- only authorized salon actors advance employer-owned states;
- professional can withdraw own active application;
- transitions are validated server-side and event logged;
- notification outbox emits relevant status changes;
- historical application snapshot remains unchanged by later profile edits.

## Story 16.5 — Hire -> membership handoff

**Priority:** M4-5

### Acceptance criteria

- marking application hired does not silently grant salon access;
- salon can initiate membership invitation from hired applicant;
- professional accepts membership separately;
- membership references same user/professional identity;
- duplicate active membership guarded;
- end-to-end test covers application -> hired -> invite -> active professional membership.

## Story 16.6 — Careers trust & moderation

**Priority:** M4-6

### Acceptance criteria

- job posts are reportable/moderatable;
- suspended salon cannot publish new jobs;
- applicant private fields are not public;
- no automated AI rejection/hiring is implemented;
- admin can audit abusive job-post activity.

---

# Epic 17 — Marketplace Analytics, Growth & Payment Readiness

**Goal:** measure product-market fit and prepare optional growth monetization without turning payment infrastructure into an MVP blocker.

## Story 17.1 — Marketplace funnel telemetry

**Priority:** M5-1

### Acceptance criteria

- events capture search -> profile -> booking start -> confirmed -> completed;
- events capture `style_id` / presence of saved look where privacy-safe;
- no biometric image/mesh URLs or exact consumer GPS appear in analytics payloads;
- salon dashboard can attribute Afrofade-origin bookings;
- admin sees core aggregate funnel metrics;
- event names/schema version documented.

## Story 17.2 — Professional/salon subscription UX

**Priority:** M5-2

### Acceptance criteria

- professional can view/activate eligible personal plan through existing provider-neutral checkout;
- salon/multi-location owner sees plan entitlements/limits;
- server calculates amount from product ID;
- payment finalization is existing verified/idempotent pattern;
- cancellation/expiry changes entitlement server-side;
- no client localStorage authority.

## Story 17.3 — Multi-location entitlement limits & aggregate dashboard

**Priority:** M5-3

### Acceptance criteria

- plan can limit included active salon locations;
- additional-location/business rules are configuration-driven;
- owner cannot bypass location limit through direct API;
- dashboard provides authorized aggregate metrics across owned/managed locations;
- individual location data remains separately addressable.

## Story 17.4 — Marketplace payment abstraction (non-custodial readiness)

**Priority:** M5-4 / optional until provider validated

### Acceptance criteria

- domain contracts can represent booking payment/deposit state without user/salon fiat wallet;
- external PSP provider account/settlement references are representable;
- Afrofade commission/platform fee and provider amount are separate accounting fields;
- implementation remains feature-gated/off by default unless a supported marketplace/split-payment provider is selected;
- pay-at-provider booking remains functional;
- no fake/live money movement in CI.

## Story 17.5 — Sponsored listing experiment guardrails

**Priority:** M5-5 / backlog

### Acceptance criteria

- any sponsored placement is explicitly labeled;
- only eligible providers can sponsor;
- organic relevance remains available;
- ranking code distinguishes sponsored and organic components;
- feature is disabled by default until commercial validation.

---

# Cross-story Definition of Done

A marketplace story is not `done` unless:

1. migration/schema change has RLS/grants reviewed;
2. server-side authorization is tested negatively;
3. client-supplied IDs are ownership/context validated;
4. TypeScript passes;
5. Next production build passes;
6. existing Python/3D validation remains green unless story intentionally touches it;
7. production Docker Compose smoke remains green;
8. no paid provider is required by CI;
9. BMAD spec/review artifact records AC evidence;
10. sprint status updated only after tests/CI pass.

# Recommended implementation order

```text
12.1 -> 12.2 -> 12.3 -> 12.4 -> 12.5 -> 12.6
 -> 13.1 -> 13.2 -> 13.3 -> 13.4 -> 13.5 -> 13.6 -> 13.7
 -> 14.1 -> 14.2 -> 14.3 -> 14.4 -> 14.5 -> 14.6 -> 14.7 -> 14.8
 -> 15.1 -> 15.2 -> 15.3 -> 15.4 -> 15.5
 -> 16.1 -> 16.2 -> 16.3 -> 16.4 -> 16.5 -> 16.6
 -> 17.1 -> 17.2 -> 17.3
 -> 17.4/17.5 only when explicitly enabled/validated
```

Parallel-safe exceptions:

- 3D Stories 8.4/8.5/9.x may continue independently;
- after 12.5, taxonomy/portfolio and some subscription UX can be developed on separate branches;
- Careers schema can start after Identity + Taxonomy, but user-facing careers should not bypass verification/entitlement decisions.
