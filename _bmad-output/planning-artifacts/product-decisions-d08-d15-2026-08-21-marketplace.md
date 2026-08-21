---
title: "Afrofade — Product Decisions D08-D15: Marketplace, Booking & Careers"
status: accepted-by-delegation
created: 2026-08-21
branch: agent/bmad-marketplace-booking-careers-vision
continues: _bmad-output/planning-artifacts/brainstorming-decisions-2026-08-21-marketplace-booking-careers.md
---

# Afrofade — Product Decisions D08-D15

These decisions complete the product framing required before implementation. They are intended to remove ambiguity for future BMAD development stories while preserving pricing and rollout values as server-side configuration where commercial validation is still needed.

## D08 — Monetization is entitlement-based, not role-based

**Status:** ACCEPTED

Afrofade keeps three commercial channels:

1. **Consumer** — rechargeable non-withdrawable Afrofade usage credits for billable AI/export actions.
2. **Professional** — personal paid entitlement for independent commercial activity.
3. **Salon / Business** — paid entitlement for salon operations, team, booking, customer acquisition, recruitment and 3D consultation.

A salon-affiliated professional does not need a personal subscription to perform salon-authorized work. A professional who wants independent discoverability/direct booking must have an eligible personal professional entitlement.

A multi-location owner may operate several salons. Billing architecture must support single-location plans and multi-location/business plans without encoding the number of salons in user identity.

### Stable plan identifiers

Implementation should use stable identifiers such as:

- `CONSUMER_CREDITS`;
- `PROFESSIONAL_PRO`;
- `SALON_PRO`;
- `SALON_VIP`;
- `SALON_EXTRA`;
- `BUSINESS_MULTI_LOCATION`.

Existing salon plan identifiers/prices may be mapped rather than duplicated.

### Pricing rule

Prices, limits and feature gates are **server-authoritative configuration**, never client-authoritative constants. UI may display hydrated catalog data but cannot decide entitlements.

Competitive research shows African/francophone salon SaaS pricing already spans roughly 4,900–35,000 FCFA/month depending on solo/team/multi-location scope. Afrofade should therefore avoid designing database schemas that assume one fixed launch price.

### Entitlement examples

Capabilities should be explicit, e.g.:

- `marketplace.listing.publish`;
- `booking.receive`;
- `booking.manage`;
- `portfolio.manage`;
- `career.apply`;
- `career.post_job`;
- `salon.team.manage`;
- `salon.location.manage`;
- `salon.analytics.view`;
- `salon.multi_location.manage`;
- `tryon.salon.use`.

Authorization resolves capabilities from personal plan + salon membership + salon plan + platform grants.

---

## D09 — Location is privacy-aware and PostGIS-backed

**Status:** ACCEPTED

Local discovery is a first-class product capability.

### Salon location

A salon/location may publish a precise business point and public address:

- latitude/longitude;
- city;
- neighborhood;
- formatted address;
- optional landmark/directions text.

### Independent professional location

Independent professionals may publish:

- city/neighborhood;
- service radius/service zone;
- mobile/on-site flags;
- optional public studio/business point.

A private home address is not required for marketplace discoverability.

### Consumer location

Consumer device location is requested only when needed for nearby search. Exact GPS should be treated as transient by default and should not be stored as a permanent profile attribute unless the user explicitly saves an area/address for a concrete product purpose.

Manual city/neighborhood selection must remain available when geolocation permission is denied.

### Technical decision

Use Supabase Postgres + PostGIS `geography(Point,4326)` (or an equivalent isolated GIS schema) with GiST indexes for scalable radius/nearest-neighbor queries. Server/RPC APIs should expose distance in meters/kilometers without exposing hidden private coordinates.

---

## D10 — Marketplace ranking is transparent and style-aware

**Status:** ACCEPTED

Afrofade must not become a generic directory sorted only by paid promotion.

Initial search/ranking signals may include:

1. geographic distance;
2. service match;
3. hairstyle/specialty skill match;
4. current/future availability;
5. verified-review score and count;
6. profile completeness/verification;
7. active entitlement/listing eligibility;
8. optional sponsored boost clearly labeled and kept distinct from organic relevance.

### 3D differentiation

When a consumer has selected or tried a hairstyle, marketplace ranking can prioritize professionals/salons whose declared skills, services and portfolio taxonomy match the requested style.

Canonical relationship:

```text
HairstyleTaxonomy
  -> CanonicalHairAsset
  -> ProfessionalSkill
  -> SalonService
  -> PortfolioItem tags
  -> JobPosting required skills
  -> Booking requested style
```

The first implementation should be deterministic/rule-based and auditable. ML ranking is not required for MVP.

---

## D11 — Careers is a vertical talent marketplace, not a generic job board

**Status:** ACCEPTED

Afrofade supports recruitment specifically for hair professionals and hair businesses.

### Professional side

A professional profile may include:

- specialties/skills;
- years of experience;
- portfolio;
- work history;
- training/certifications where provided;
- current salon memberships;
- job-seeking status (`not_open`, `open_to_offers`, `actively_looking`);
- preferred zones/work modes;
- optional compensation expectation visibility under privacy rules.

### Salon side

Eligible salons may publish `JobPosting` records containing:

- salon/location;
- title;
- description;
- contract/work mode;
- required skills;
- experience requirement;
- compensation range when supplied;
- schedule expectation;
- application deadline/status.

### Application model

Professionals apply with their Afrofade professional identity rather than requiring a Word/PDF CV for MVP.

`JobApplication` snapshots relevant applicant profile/portfolio metadata so later edits do not silently rewrite the historical application context.

Application lifecycle:

`submitted -> viewed -> shortlisted -> interview -> offered -> hired | rejected | withdrawn | closed`.

Hiring does not automatically create a salon membership; owner/manager explicitly accepts/creates membership after hire.

---

## D12 — Notifications first; unrestricted social messaging later

**Status:** ACCEPTED

Afrofade should not build a general social-network chat system in the first marketplace release.

MVP communications are event-driven notifications around real workflows:

- booking requested/confirmed/rescheduled/cancelled/reminder;
- professional assigned;
- review available;
- job application submitted/viewed/shortlisted/rejected/offered;
- salon invitation/membership updates;
- subscription/entitlement state.

Notification channels are designed provider-neutral:

- in-app notification center;
- email where available;
- SMS/WhatsApp provider adapter later/where configured;
- push notification later if mobile/PWA channel is ready.

A contextual booking/job conversation thread may be introduced later, but direct-message networking/feed/chat is explicitly outside MVP.

---

## D13 — Trust, verification and moderation are explicit states

**Status:** ACCEPTED

Marketplace growth must not rely on unverified business claims.

### Verification model

Profiles/entities expose server-authoritative states such as:

- `unverified`;
- `pending`;
- `verified`;
- `rejected`;
- `suspended`.

Verification can later include phone, identity/business documents, salon ownership, professional credentials or field verification according to country policy. MVP may begin with lower-assurance verification but the schema/state machine must exist.

### Moderation

The platform supports reports against:

- salon listings;
- professional profiles;
- portfolio content;
- reviews;
- job postings.

Admin moderation actions are auditable and server-authoritative. Suspended entities cannot remain bookable/discoverable merely because a client cache says otherwise.

### Portfolio integrity

Portfolio items record uploader/owner, media storage refs, tags, timestamps and moderation state. Professionals must not claim another account's private assets by client-supplied IDs.

---

## D14 — Booking has a strict lifecycle and concurrency-safe slot ownership

**Status:** ACCEPTED

Booking is not a free-form date request table.

### Status model

Recommended canonical states:

- `requested` (only where manual confirmation is enabled);
- `confirmed`;
- `rescheduled` as an event/history, not destructive overwrite;
- `cancelled_by_customer`;
- `cancelled_by_provider`;
- `completed`;
- `no_show_customer`;
- `no_show_provider`;
- `rejected`;
- `expired`.

### Slot integrity

The server must prevent double-booking under concurrency. Availability must be derived from:

- salon operating hours;
- service duration/buffer;
- professional schedule/working location;
- time off/blocks;
- existing active bookings;
- any resource/capacity rules introduced later.

Booking creation/confirmation must use a transaction, exclusion strategy, slot lock or equivalent database-safe invariant rather than a client-only availability check.

### Price/service snapshot

A booking stores a snapshot of service label, duration and quoted price so later salon catalog changes do not rewrite old bookings.

### Visual brief

`try_on_asset_id` / saved-look reference is optional but first-class. When attached, the exact head/hair/style versions and customization metadata remain traceable as the customer's visual brief.

### Payment/no-show

MVP permits pay-at-salon/pay-provider. Deposits and marketplace payment routing are later capabilities. No-show counters/policies should be representable without automatically blocking users in MVP.

---

## D15 — Scope is phased; the platform is not a generic beauty/social super-app

**Status:** ACCEPTED

Afrofade's product promise is:

> Discover a hair look, try it, find the right nearby hair professional/salon, book it, and build trusted hair-professional reputation/careers around real skills.

### Explicitly in scope

- hair + beard ecosystem;
- consumer 3D try-on/looks;
- nearby salons and independent professionals;
- salon/business profiles and multi-location ownership;
- professional identity + portfolio + skills;
- services/pricing;
- availability + booking;
- verified reviews;
- hair-industry job postings/applications;
- paid professional/salon entitlements;
- salon acquisition/operations analytics.

### Explicitly out of MVP

- generic beauty categories outside hair/beard;
- social feed/followers/stories;
- unrestricted DMs;
- e-commerce marketplace for products;
- Afrofade-custodied fiat wallets;
- complex payroll;
- full HRIS;
- automatic AI hiring decisions;
- opaque ML marketplace ranking;
- mandatory online service payment.

### Delivery waves

**Wave A — Marketplace foundation**
Identity refactor, professional profile, salon entities/memberships, multi-location ownership, services/skills/taxonomy, entitlements, PostGIS nearby search, public profiles.

**Wave B — Booking**
Availability, staff/service eligibility, concurrency-safe bookings, saved-look attachment, notifications, booking dashboards.

**Wave C — Trust & reputation**
Completed-service verification, reviews, moderation/reporting, verification states, marketplace ranking signals.

**Wave D — Careers**
Job seeking, job posts, applications, hiring workflow, membership handoff.

**Wave E — Growth**
Advanced analytics, sponsored listings, deposits/split payments where supported, deeper recommendations and optional contextual messaging.

### Parallelism with existing 3D roadmap

Marketplace foundation does not require Story 8.4/8.5 to be complete. It may be implemented in parallel with the 3D provider track. The integration dependency occurs at `saved look / try_on_asset -> booking` and style-aware matching, which must tolerate absence of a generated try-on.
