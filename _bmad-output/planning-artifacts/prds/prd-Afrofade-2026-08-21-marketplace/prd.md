---
title: "PRD — Afrofade Hair Decision, Marketplace, Booking & Careers"
status: approved-for-implementation
created: 2026-08-21
supersedes: "_bmad-output/planning-artifacts/prds/prd-Afrofade-2026-08-19/prd.md for product scope/identity; preserves valid 3D/commerce/security requirements"
change_source: "BMAD Correct Course 2026-08-21"
---

# PRD: Afrofade — Hair Decision, Marketplace, Booking & Careers Network

## 0. Purpose

Afrofade is a hair + beard platform connecting visual decision, local discovery, booking, salon growth and professional careers.

The platform keeps its existing 3D differentiation while expanding the commercial loop from:

```text
try hairstyle -> save/download
```

to:

```text
discover -> try -> choose -> find qualified nearby provider -> book -> complete -> review
                                                       \
                                                        -> work / hire
```

The system remains focused on hair/beard. It is not a general beauty or social network.

---

# 1. Vision

## 1.1 Consumer value

A consumer can:

- create a personal 3D head;
- try hairstyles/colors/line-up and later beard variants;
- save a desired look;
- find nearby salons or eligible independent hair professionals;
- filter by style/service, distance, price, availability and verified reputation;
- book a service;
- attach the exact saved look to the appointment;
- review a completed service.

Core JTBD:

> “I want to decide confidently how I want to look, find someone nearby who can actually do it, and book without having to re-explain everything.”

## 1.2 Hair-professional value

A hair professional can:

- maintain a durable professional identity independent of employer;
- show portfolio and specialties;
- work through one or more salon memberships;
- operate independently under a paid professional entitlement;
- receive bookings according to business context;
- build verified reputation;
- discover/apply for hair-industry jobs.

Core JTBD:

> “I want my real skills and work to be visible so I can get clients and better job opportunities.”

## 1.3 Salon owner/manager value

A salon can:

- publish a searchable business/location profile;
- manage services, prices and opening hours;
- manage team/memberships and staff availability;
- receive and manage bookings;
- use Afrofade 3D consultation;
- recruit hair professionals;
- operate one or multiple salon locations;
- measure customer acquisition and operational performance.

Core JTBD:

> “I want more customers, organized bookings, a strong team and a tool that helps clients decide before the appointment.”

---

# 2. Actors and identity model

## 2.1 User account

Authentication remains Supabase-backed and server-verified.

A user account is an identity, not a permanent business role.

## 2.2 Consumer

Consumer capability exists for normal users and retains the credit-based B2C 3D journey.

## 2.3 ProfessionalProfile

A user may create one hair-professional profile containing:

- display/professional name;
- bio;
- specialties/skills;
- experience;
- portfolio;
- work history;
- current operating mode;
- service areas;
- job-seeking state;
- verification state;
- reputation aggregates.

A professional profile does not require a salon.

## 2.4 Salon

A salon is a business/location entity, not a user role.

A salon has:

- business identity;
- branding/media;
- public address/location;
- contact information;
- opening hours;
- services/prices/durations;
- team;
- booking configuration;
- verification/status;
- subscription/entitlement relationship;
- reviews and analytics.

## 2.5 SalonMembership

A user/professional may relate to one or more salons via memberships.

Membership roles/capabilities include at least:

- `owner`;
- `manager`;
- `professional`.

Membership state includes invited/active/suspended/ended semantics and dates.

A user can be owner of several salons.

## 2.6 Admin

Admin authorization remains server-authoritative and cannot be self-assigned from browser metadata.

---

# 3. Product pillars

1. **3D Visual Decision** — CanonicalHead + CanonicalHairAsset + HairFitter + saved looks.
2. **Local Discovery** — geospatial salon/professional marketplace.
3. **Booking** — availability, assignment, appointment lifecycle, visual brief.
4. **Professional Identity** — portfolio, skills, experience, reputation.
5. **Careers** — salon job posts and professional applications.
6. **Salon Growth & Operations** — team, services, bookings, acquisition analytics, multi-location.
7. **Trust** — verification, completed-booking reviews, moderation.

---

# 4. Commercial model

## 4.1 Consumer

Existing rechargeable Afrofade credits remain the model for billable AI/export actions.

Credits are non-withdrawable product units, not fiat balances.

Existing product direction may retain:

- head creation/reconstruction: billable credits;
- catalog try-on: free on existing head;
- HD export: billable credit;
- sharing: free.

Final values remain server-authoritative.

## 4.2 Independent professional

Independent commercial discoverability/direct booking requires an active eligible personal professional entitlement.

A professional who only performs salon-authorized work under an eligible salon does not require a separate personal subscription.

## 4.3 Salon

Salon plans continue to support tiered subscription/entitlement logic.

Existing PRO/VIP/EXTRA plan IDs may remain and be enriched with marketplace capabilities.

## 4.4 Multi-location business

The entitlement model must support owners with multiple locations through configurable multi-location/business plans or additional-location rules.

## 4.5 Pricing architecture

Price, feature, quota and location limits are server-authoritative configuration. UI values are display data only.

---

# 5. Primary user journeys

## UJ-1 — Consumer: try -> nearby -> book

1. Consumer authenticates or browses allowed public catalog/discovery pages.
2. Consumer creates/selects owned 3D head.
3. Consumer tries a published hairstyle.
4. Consumer saves a look.
5. Consumer opens “Find someone who can do this”.
6. With location permission, system searches nearby eligible salons/professionals; otherwise consumer selects city/neighborhood.
7. Results prioritize style/service match, distance, availability and verified reputation.
8. Consumer selects salon or independent professional.
9. Consumer chooses service, date/time and optional professional/first available.
10. Booking is created server-side with concurrency protection.
11. Saved look/try-on is attached to booking.
12. Provider confirms automatically or manually according to configuration.
13. Service is completed.
14. Consumer becomes eligible for verified review.

## UJ-2 — Consumer: search without 3D

Marketplace must also work when the user has no 3D head.

1. Search service/style/location.
2. View salon/professional results.
3. Book normally.
4. `try_on_asset_id` remains null.

This prevents 3D cost/availability from blocking marketplace liquidity.

## UJ-3 — Independent professional onboarding

1. User creates ProfessionalProfile.
2. Adds skills, portfolio and service area.
3. Selects independent/mobile/studio operating mode.
4. Activates eligible professional plan.
5. Publishes listing after required verification/profile completeness.
6. Configures services/availability.
7. Receives direct bookings.

## UJ-4 — Salon owner onboarding

1. User creates salon location.
2. Ownership membership created server-side.
3. Adds business details, PostGIS location, hours, services and pricing.
4. Activates salon entitlement.
5. Invites team/professionals.
6. Configures booking behavior.
7. Publishes listing.

## UJ-5 — Multi-salon owner

1. Owner creates/claims second location.
2. New salon has independent team/services/hours/bookings.
3. Owner switches dashboard context between locations.
4. Aggregate business view may combine authorized locations.
5. Entitlement engine validates multi-location allowance.

## UJ-6 — Salon booking: first available

1. Consumer chooses salon/service.
2. Consumer chooses “first available qualified professional”.
3. Availability engine finds eligible membership + skill + schedule.
4. Booking may remain unassigned if salon workflow allows later assignment, otherwise assignment is atomic at confirmation.
5. Salon/assigned professional receives notification.

## UJ-7 — Recruitment

1. Eligible salon publishes job with required skills/location.
2. Matching/open professionals discover job.
3. Professional applies with Afrofade profile/portfolio.
4. Application proceeds through explicit state machine.
5. On hire, salon separately invites/creates membership.

---

# 6. Functional requirements

## Identity / authorization

**FR-1 — Server-verified auth**  
Protected actions require valid Supabase session/token server-side.

**FR-2 — Professional identity**  
A user can create/manage one ProfessionalProfile without requiring a salon.

**FR-3 — Salon entity**  
Salon is a standalone entity with owner memberships; no authoritative `user.salon_id` assumption.

**FR-4 — Multi-salon membership**  
A user can hold memberships in multiple salons with distinct roles/statuses.

**FR-5 — Capability authorization**  
Actions resolve from account/admin status, membership permissions and active entitlements rather than global role alone.

**FR-6 — Legacy compatibility**  
Migration from existing `customer/salon/admin` profiles is additive/backfilled and does not silently orphan current data.

## Professional profile / portfolio

**FR-7 — Skills taxonomy**  
Professionals select normalized hair/beard skills rather than only free text.

**FR-8 — Portfolio**  
Professionals upload media with storage ownership, tags, moderation state and public visibility rules.

**FR-9 — Work history**  
Professional identity can retain historical salon affiliations/experience independently of active memberships.

**FR-10 — Job-seeking state**  
Professional controls job-seeking visibility/state.

## Salon / multi-location

**FR-11 — Salon profile**  
Salon stores identity, media, contact, hours, location, verification and listing state.

**FR-12 — Services**  
Salon/independent provider defines services with normalized category/style links, label, duration, price/currency, active state and booking eligibility.

**FR-13 — Team membership**  
Owners/managers invite/remove/suspend members according to server-authoritative permissions.

**FR-14 — Location switcher**  
Authorized multi-location users can switch business context without leaking unrelated salon data.

## Entitlements

**FR-15 — Server plan catalog**  
Stable plan IDs map to configurable prices, quotas and capabilities.

**FR-16 — Entitlement resolver**  
System resolves personal professional entitlement and salon-derived capabilities per action/context.

**FR-17 — Fail closed**  
Expired/unverified/ineligible commercial entity cannot remain discoverable/bookable because of client state.

## Geospatial discovery

**FR-18 — PostGIS storage/query**  
Public provider locations/service areas support indexed nearby queries.

**FR-19 — Consumer privacy**  
Exact consumer GPS is not persisted by default merely to execute nearby search.

**FR-20 — Manual location fallback**  
City/neighborhood search works without browser geolocation permission.

**FR-21 — Search filters**  
Initial filters include distance, service/style, price range, availability, rating and provider type as data allows.

**FR-22 — Style-aware ranking**  
When style is known, ranking can use normalized skill/service/portfolio match.

## Booking / availability

**FR-23 — Provider context**  
Booking supports salon context or independent-professional context.

**FR-24 — Staff choice**  
Salon may allow specific-professional or first-available booking.

**FR-25 — Availability engine**  
Availability intersects provider hours, professional schedule, service duration/buffer, time off and active bookings.

**FR-26 — Double-booking prevention**  
Booking confirmation/slot ownership is concurrency-safe server-side.

**FR-27 — Snapshot**  
Booking stores service label/duration/quoted price snapshot.

**FR-28 — Lifecycle**  
Booking statuses/events cover requested/confirmed/completed/cancel/reject/no-show/expiry and reschedule history.

**FR-29 — Visual brief**  
Booking may reference owned/accessible saved look/try-on and exact asset versions.

**FR-30 — Pay-at-provider MVP**  
Booking does not require online service payment.

## Notifications

**FR-31 — Event outbox**  
Important booking/job/membership events produce durable notification events/outbox records.

**FR-32 — Channel adapters**  
In-app is required; email/SMS/WhatsApp/push are provider-neutral adapters/feature-gated.

## Reviews / trust

**FR-33 — Verified review eligibility**  
Only eligible completed bookings can create verified reviews; one review per booking.

**FR-34 — Separate aggregates**  
Salon and professional ratings aggregate independently.

**FR-35 — Moderation/reporting**  
Listings, portfolio, reviews and job posts have report/moderation states and auditable admin actions.

**FR-36 — Verification state**  
Professional/salon verification uses explicit server-authoritative states.

## Careers

**FR-37 — Job posting**  
Eligible salon publishes hair-industry job with required skills/location/status.

**FR-38 — Job application**  
Professional applies with Afrofade identity; application state is durable/auditable.

**FR-39 — Applicant snapshot**  
Application preserves relevant snapshot metadata for historical integrity.

**FR-40 — Hire separation**  
Hiring does not silently create salon access; membership invitation/acceptance remains explicit.

## 3D integration

**FR-41 — Existing 3D contracts preserved**  
Marketplace changes do not rewrite canonical 3D contracts without separate story.

**FR-42 — Hairstyle taxonomy bridge**  
Published canonical hair assets can link to normalized hairstyle taxonomy used by skills/services/search/jobs.

**FR-43 — Try-on optionality**  
Marketplace/booking remain functional when no try-on is attached.

## Analytics

**FR-44 — Funnel telemetry**  
Capture search -> profile -> booking-start -> confirmed -> completed funnel.

**FR-45 — 3D-to-booking telemetry**  
Measure try-on -> marketplace search and try-on -> booking conversion without exposing private biometric content to analytics payloads.

**FR-46 — Salon acquisition metrics**  
Salon can see bookings/leads attributable to Afrofade within plan permissions.

---

# 7. Non-functional requirements

**NFR-1 — Security**  
RLS/authorization protects all tenant/member/private resources. Service-role stays server-only.

**NFR-2 — Privacy**  
Minimize location/biometric data retention; private professional home coordinates must not leak via public APIs.

**NFR-3 — Concurrency**  
No double-booked slot can be created by racing clients under supported booking rules.

**NFR-4 — Idempotency**  
Booking creation, state transitions, invitations, application submissions, notification delivery and payment finalization use idempotency where retries are possible.

**NFR-5 — Auditability**  
Critical state transitions record actor, timestamp and previous/new state or append-only event history.

**NFR-6 — Performance**  
Nearby search should use spatial indexes and avoid full-table distance scans. Search APIs must paginate.

**NFR-7 — Mobile-first**  
Primary salon/professional operations must be usable from mobile web/PWA-sized screens.

**NFR-8 — Resilience**  
Notification provider failure cannot roll back an already valid booking transaction; delivery retries are decoupled.

**NFR-9 — Observability**  
Booking/search/notification/job flows expose structured IDs and errors; secrets/private coordinates are not logged.

**NFR-10 — Accessibility/localization**  
French-first copy is supported and schemas do not block future localization.

---

# 8. Success metrics

North-star candidate:

> **Completed Afrofade-attributed hair appointments per active market**, segmented by whether a 3D/saved look influenced the booking.

Supporting metrics:

- active searchable salons/professionals;
- search result availability hit rate;
- search -> profile CTR;
- profile -> booking-start conversion;
- booking-start -> confirmation;
- confirmation -> completion;
- repeat booking;
- verified review rate;
- % bookings with style ID;
- % bookings with saved look;
- try-on -> search conversion;
- try-on -> booking conversion;
- professional paid conversion;
- salon paid conversion;
- churn;
- job post -> qualified applicant;
- application -> hire;
- no-show/cancellation rates.

---

# 9. Explicit MVP exclusions

Do not implement unless a later story explicitly authorizes:

- generic social feed;
- followers/stories/reactions;
- unrestricted DMs;
- product e-commerce marketplace;
- generic beauty categories outside hair/beard;
- custodied provider fiat wallets;
- payroll;
- full HRIS;
- automatic AI hiring decisions;
- opaque ML ranking;
- mandatory online haircut payment;
- complex loyalty points/cashback.

---

# 10. Rollout strategy

## Wave A — Foundation

ProfessionalProfile, Salon, SalonMembership, multi-location, taxonomy, services, entitlements, PostGIS, public discovery.

## Wave B — Booking

Availability, booking lifecycle, slot safety, assignment, saved-look attachment, notification outbox, dashboards.

## Wave C — Trust

Verified reviews, verification states, reporting/moderation, trust-aware ranking.

## Wave D — Careers

Job seeking, postings, applications, hiring workflow.

## Wave E — Growth

Advanced analytics, boosts, deposits/split payment where validated, richer recommendations/contextual communications.

---

# 11. Ready-to-build statement

This PRD is implementation-ready only when used together with the 2026-08-21 marketplace architecture, new marketplace Epics/Stories and execution plan. The current 3D epics remain valid and may progress in parallel.
