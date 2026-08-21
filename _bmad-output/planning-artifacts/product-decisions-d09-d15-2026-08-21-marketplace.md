---
title: "Afrofade — Product Decisions D09-D15: Marketplace, Booking & Careers"
status: accepted-by-delegation
created: 2026-08-21
branch: agent/bmad-marketplace-booking-careers-vision
continues:
  - _bmad-output/planning-artifacts/brainstorming-decisions-2026-08-21-marketplace-booking-careers.md
  - _bmad-output/planning-artifacts/brainstorming-decision-D08-geolocation-2026-08-21.md
---

# Afrofade — Product Decisions D09-D15

D08 is reserved for the already accepted geolocation/local-discovery decision. These decisions continue the sequence without reusing that identifier.

## D09 — Monetization is entitlement-based, not role-based

**Status:** ACCEPTED

Afrofade keeps three commercial channels:

1. **Consumer** — rechargeable non-withdrawable Afrofade usage credits for billable AI/export actions.
2. **Professional** — personal paid entitlement for independent commercial activity.
3. **Salon / Business** — paid entitlement for salon operations, team, booking, customer acquisition, recruitment and 3D consultation.

A salon-affiliated professional does not need a personal subscription to perform salon-authorized work. A professional who wants independent discoverability/direct booking must have an eligible personal professional entitlement.

A multi-location owner may operate several salons. Billing architecture must support single-location plans and multi-location/business plans without encoding the number of salons in user identity.

Stable implementation identifiers may include:

- `CONSUMER_CREDITS`;
- `PROFESSIONAL_PRO`;
- `SALON_PRO`;
- `SALON_VIP`;
- `SALON_EXTRA`;
- `BUSINESS_MULTI_LOCATION`.

Prices, limits and feature gates are server-authoritative configuration, never client-authoritative values.

Capabilities should be explicit, e.g. `marketplace.listing.publish`, `booking.receive`, `booking.manage`, `portfolio.manage`, `career.apply`, `career.post_job`, `salon.team.manage`, `salon.location.manage`, `salon.analytics.view`, `salon.multi_location.manage`, `tryon.salon.use`.

Authorization resolves capabilities from personal plan + salon membership + salon plan + platform grants.

---

## D10 — Marketplace ranking is transparent and style-aware

**Status:** ACCEPTED

Initial search/ranking signals may include:

1. geographic distance;
2. service match;
3. hairstyle/specialty skill match;
4. current/future availability;
5. verified-review score and count;
6. profile completeness/verification;
7. active entitlement/listing eligibility;
8. optional sponsored boost clearly labeled and distinct from organic relevance.

When a consumer has selected/tried a hairstyle, ranking can prioritize providers whose skills, services and portfolio taxonomy match it.

Canonical bridge:

```text
HairstyleTaxonomy
  -> CanonicalHairAsset
  -> ProfessionalSkill
  -> SalonService
  -> PortfolioItem tags
  -> JobPosting required skills
  -> Booking requested style
```

Ranking V1 is deterministic, rule-based, versioned and auditable. Opaque ML ranking is not required for MVP.

---

## D11 — Careers is a vertical hair talent marketplace

**Status:** ACCEPTED

Afrofade recruitment is specific to hair professionals/businesses, not a generic job board.

Professional profile may expose controlled career information: skills, experience, portfolio, work history, training/certifications, current affiliations, job-seeking status and preferred work areas/modes.

Eligible salons may publish job posts with concrete location, description, work mode, normalized required skills, experience requirement, optional compensation range and status/deadline.

Professionals apply with their Afrofade profile/portfolio. A PDF/Word CV is not mandatory for MVP.

`JobApplication` snapshots relevant profile/portfolio data for historical integrity.

Lifecycle:

`submitted -> viewed -> shortlisted -> interview -> offered -> hired | rejected | withdrawn | closed`.

Hiring does not automatically grant salon access; membership invitation/acceptance is explicit.

---

## D12 — Notifications first; unrestricted social messaging later

**Status:** ACCEPTED

MVP communication is workflow/event-driven:

- booking requested/confirmed/rescheduled/cancelled/reminder;
- professional assigned;
- review available;
- job application submitted/viewed/shortlisted/rejected/offered;
- salon invitation/membership update;
- subscription/entitlement state.

Channels are provider-neutral:

- in-app required;
- email optional;
- SMS/WhatsApp adapter optional/feature-gated;
- push later.

A contextual booking/job thread may be introduced later. General social DMs/feed/chat are outside MVP.

---

## D13 — Trust, verification and moderation are explicit states

**Status:** ACCEPTED

Professional/salon listing uses explicit server-authoritative verification states such as `unverified`, `pending`, `verified`, `rejected`, `suspended` plus listing/publication state.

Verification evidence can evolve by country, but schema/state machine exists from foundation.

Profiles/listings, portfolio, reviews and job postings are reportable/moderatable. Admin actions are audited. Suspended entities cannot remain bookable/discoverable due to stale client cache.

Portfolio media records owner/uploader, storage ref, tags, timestamps and moderation/publication state.

---

## D14 — Booking has a strict lifecycle and concurrency-safe slot ownership

**Status:** ACCEPTED

Booking is not a free-form datetime request.

Canonical state set may include:

- `requested` where manual confirmation is enabled;
- `confirmed`;
- `cancelled_by_customer`;
- `cancelled_by_provider`;
- `completed`;
- `no_show_customer`;
- `no_show_provider`;
- `rejected`;
- `expired`.

Rescheduling is represented through controlled transition/history rather than silently destroying prior state.

Availability derives from salon hours, service duration/buffers, professional schedule/location, time off/blocks and existing active bookings.

Final booking/confirmation uses a DB-safe transaction/lock/exclusion strategy and rechecks conflicts; browser availability is advisory only.

Booking stores service label/duration/quoted price snapshot.

`try_on_asset_id` / saved look is optional but first-class and authorization-checked. When attached, exact style/head/hair/customization metadata remains traceable as the visual service brief.

MVP supports pay-at-provider. Deposits/marketplace payments come later.

---

## D15 — Scope is phased; Afrofade is not a generic beauty/social super-app

**Status:** ACCEPTED

Core promise:

> Discover a hair look, try it, find the right nearby hair professional/salon, book it, and build trusted hair-professional reputation/careers around real skills.

### In scope

- hair + beard ecosystem;
- consumer 3D try-on/looks;
- nearby salons and independent professionals;
- salon/business profiles and multi-location ownership;
- professional identity + portfolio + skills;
- services/pricing;
- availability + booking;
- verified reviews;
- hair-industry jobs/applications;
- paid professional/salon entitlements;
- salon acquisition/operations analytics.

### Out of MVP

- generic beauty categories outside hair/beard;
- social feed/followers/stories;
- unrestricted DMs;
- e-commerce product marketplace;
- Afrofade-custodied fiat wallets;
- payroll/full HRIS;
- automatic AI hiring decisions;
- opaque ML ranking;
- mandatory online service payment.

### Waves

**A:** identity, professional, salons/memberships, multi-location, services/skills/taxonomy, entitlements, PostGIS discovery, public profiles.  
**B:** availability, concurrency-safe booking, saved-look attachment, notifications, dashboards.  
**C:** verified reviews, verification, moderation and trust signals.  
**D:** careers/jobs/applications/hiring-membership handoff.  
**E:** analytics, sponsored listings, deposits/split payments where validated, richer recommendations/contextual communications.

Marketplace foundation can progress in parallel with existing 3D provider/Fitter work; booking must tolerate no try-on attachment.
