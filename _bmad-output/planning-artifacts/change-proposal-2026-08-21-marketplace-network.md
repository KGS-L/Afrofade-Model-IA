---
title: "Afrofade — BMAD Correct Course: Hair Marketplace, Booking & Careers"
status: approved-for-planning
created: 2026-08-21
supersedes_scope: "product-role assumptions in PRD 2026-08-19; does not supersede completed 3D infrastructure work"
inputs:
  - brainstorming-2026-08-21-marketplace-booking-careers.md
  - brainstorming-decisions-2026-08-21-marketplace-booking-careers.md
  - product-decisions-d08-d15-2026-08-21-marketplace.md
  - competitive-landscape-2026-08-21-africa.md
---

# Afrofade — Correct Course Proposal: from 3D Try-On SaaS to Hair Decision & Commerce Network

## 1. Change signal

Field feedback from a working hair professional exposed a commercial gap in the existing Afrofade proposition: a salon values 3D consultation, but its more immediate recurring needs are **customer acquisition, booking and recruitment**. Consumers also need a path from hairstyle inspiration to a nearby trusted provider.

The current PRD models `customer`, `salon`, `admin` and treats a salon operator/hairdresser as one broad `salon` role. That model cannot safely represent:

- independent professionals;
- professionals moving between salons;
- owners with multiple salons;
- managers/professionals with different permissions at different locations;
- direct professional bookings versus salon bookings;
- professional portfolios and careers;
- salon recruitment;
- verified booking-backed reputation;
- local discovery and geospatial ranking.

This is therefore a product and domain-model change, not a minor feature request.

## 2. New product thesis

Afrofade remains a hair + beard product. It does not become a generic beauty super-app.

New thesis:

```text
DISCOVER -> TRY -> CHOOSE -> FIND -> BOOK -> GET THE LOOK -> REVIEW
                                      \
                                       -> WORK / HIRE
```

Afrofade becomes a **hair decision and commerce network**:

- 3D converts uncertainty into visual intent;
- local discovery converts intent into a provider shortlist;
- booking converts intent into a real appointment;
- verified service history creates trust/reputation;
- the same professional identity creates a vertical careers network;
- salon SaaS becomes a growth/operations console rather than only a 3D consultation tool.

## 3. Strategic rationale

Competitive research confirms that booking, team calendars, salon pages, reminders, mobile-money-friendly payments and multi-salon management already exist in African/francophone products such as Lilix, Planify CI and Liko.

Historical GlamAfric also combined marketplace, booking, SaaS and hiring, yet public retrospective material describes the startup/appointment platform and job boards being sunset. Therefore Afrofade must not compete by feature accumulation alone.

The differentiated wedge is the integrated relationship:

```text
Canonical hairstyle / requested look
   <-> 3D asset
   <-> professional skill
   <-> salon service
   <-> portfolio proof
   <-> local availability
   <-> booking visual brief
   <-> verified service review
   <-> career skill signal
```

## 4. Decisions ratified

### Identity

- Hair professional is a first-class persona, not a permanent global `salon` role.
- `ProfessionalProfile` may exist without a salon.
- A `Salon` is a business/location entity, not a user.
- Relationships use `SalonMembership` with per-salon role/capabilities.
- One user may own/manage/work at multiple salons.

### Commerce

- Consumer remains credit-based for Afrofade AI/export actions.
- Independent professional commercial use requires personal paid entitlement.
- Salon-affiliated professionals may operate under the salon entitlement.
- Salon and multi-location business entitlements are separate from identity.
- Pricing/limits are server-authoritative configuration and may evolve.

### Booking

- Salon booking targets a salon/location, optionally a specific professional or first available eligible professional.
- Independent professionals may receive direct bookings under an eligible personal entitlement.
- Booking stores service/price/duration snapshot.
- Saved Afrofade look/try-on may be attached as a visual brief.
- Slot ownership must be concurrency-safe.
- Online service payment is not required for MVP.

### Payments

- Afrofade does not custody third-party salon/professional fiat balances.
- If marketplace payment is introduced later, use PSP split/routing/settlement capability where supported.
- Existing consumer credits remain non-withdrawable product usage units, not fiat wallets.

### Location

- Use PostGIS-backed search.
- Salon business points may be public.
- Independent providers may expose service area without publishing private home coordinates.
- Consumer exact GPS is transient by default.

### Reputation

- Initial public rating signal comes from completed Afrofade bookings.
- Salon and professional reputation are separate aggregates.
- Reviews are auditable and moderation-aware.

### Careers

- Hair-industry jobs only.
- Professional applies with Afrofade profile/portfolio.
- Job application has explicit lifecycle.
- Hiring and salon membership are separate explicit actions.

### Scope guardrails

No generic social feed, unrestricted DM, general beauty marketplace, e-commerce product marketplace, full payroll/HRIS, custodied fiat wallet or opaque ML ranking in MVP.

## 5. Architecture impact

### Existing components retained

The following remain valid and must not be rewritten merely because marketplace is added:

- Supabase Auth / Postgres / Storage baseline;
- server-authoritative RBAC/security principles;
- provider-neutral payments;
- consumer credits ledger;
- `CanonicalHead` / `CanonicalHairAsset` / `TryOnAsset` contracts;
- durable `ai_jobs`/worker infrastructure;
- `AssetStorage` abstraction;
- HairAssetGenerator/Normalizer/provider roadmap;
- React Three Fiber try-on architecture.

### Identity domain changes

The global-role model must evolve toward:

```text
UserAccount
  +-- Consumer capabilities
  +-- ProfessionalProfile? 
  +-- SalonMembership[]
  +-- Admin authorization

Salon
  +-- memberships[]
  +-- locations/identity
  +-- services
  +-- bookings
  +-- jobs
```

Legacy `user_profiles.role = salon` must be migrated compatibly rather than deleted destructively before data mapping.

### New domains

- professional identity/portfolio;
- salon/membership/multi-location;
- hairstyle/service/skill taxonomy;
- entitlements;
- geospatial discovery;
- availability/booking;
- notification events;
- verified reviews/moderation;
- careers/recruitment;
- marketplace analytics.

## 6. Proposed delivery tracks

### Track A — Existing 3D roadmap

Continue current Epic 8 and 9 work:

- TRELLIS.2 + LoRA;
- Hunyuan fallback;
- HairFitter;
- catalog swap;
- durable line-up/export.

### Track B — Marketplace foundation

Can start independently:

- identity refactor;
- professional profile;
- salon + memberships;
- multi-location;
- service/skill taxonomy;
- entitlements;
- PostGIS location/discovery.

### Track C — Booking/reputation

Depends on Track B, not on full 3D completion. `try_on_asset_id` integration is optional/nullable until Studio output is ready.

### Track D — Careers

Depends primarily on professional/salon identity and skills taxonomy.

## 7. Data migration principle

No destructive big-bang migration.

Recommended sequence:

1. add new tables/relationships;
2. backfill existing salon users into salon entities/memberships using explicit migration rules;
3. make application read new model;
4. dual-read/compatibility window only if necessary;
5. validate ownership/RLS and production data;
6. remove obsolete assumptions only in a later cleanup migration.

Admin security remains server-authoritative throughout.

## 8. Required BMAD output from this Correct Course

This proposal authorizes creation of:

1. refreshed marketplace-aware PRD;
2. architecture/domain model;
3. new Epics/Stories after existing Epic numbering;
4. implementation execution plan with migration/order/dependencies;
5. sprint/readiness guidance.

## 9. Definition of ready-to-code

The marketplace change is ready for implementation when artifacts define:

- actors and relationship semantics;
- table/domain boundaries;
- RLS/authorization expectations;
- entitlement resolution;
- geospatial privacy and query model;
- availability/booking invariants;
- review eligibility;
- careers state machines;
- notification events;
- migration/backfill strategy;
- API/UI responsibilities;
- acceptance criteria per story;
- ordering/dependencies;
- out-of-scope items.

## 10. Decision

**APPROVE Correct Course.**

Afrofade should evolve from a 3D try-on SaaS into a hair-specific decision, discovery, booking, professional identity and careers network, while preserving the 3D pipeline as the core differentiation and avoiding generic beauty/social scope creep.
