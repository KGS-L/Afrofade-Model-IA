---
title: "Afrofade — BMAD Brainstorming Decisions: Marketplace, Booking & Careers"
status: active
created: 2026-08-21
updated: 2026-08-21
branch: agent/bmad-marketplace-booking-careers-vision
source: _bmad-output/planning-artifacts/brainstorming-2026-08-21-marketplace-booking-careers.md
---

# Afrofade — Product Brainstorming Decision Log

This file records only decisions explicitly accepted during the product brainstorming session. It does not yet modify the canonical PRD, architecture or epics.

## D01 — Scope of the professional persona

**Status:** ACCEPTED

Afrofade models a **hair professional** broadly rather than a barber-only persona.

Included professional specialties may include, without being limited to:

- barbering;
- men's and women's hairdressing;
- braids / tresses;
- locks / locs;
- twists;
- afro-textured hair styling;
- hair coloring where relevant to hair services;
- beard grooming / facial hair services.

Afrofade remains intentionally focused on the **hair + beard ecosystem**. It must not become a generic beauty marketplace covering unrelated categories such as nails, general aesthetics, makeup or spa services unless a future explicit product decision changes this scope.

### Product consequence

The canonical professional identity should use a neutral model such as `ProfessionalProfile` / `HairProfessionalProfile` with specialties, rather than encoding the profession as a single immutable `barber` role.

### Architecture consequence

A professional person's account and a salon/business entity remain separate concepts. Employment/affiliation is represented through memberships/relationships rather than by turning the salon itself into the user's permanent role.

---

## D02 — Independent hair professionals are first-class, paid participants

**Status:** ACCEPTED

A `ProfessionalProfile` may exist without any active salon membership. Afrofade therefore supports independent hair professionals as first-class marketplace participants.

Supported operating modes can include:

- professional employed/affiliated with a salon;
- independent professional;
- mobile / at-home professional;
- professional operating from a personal studio or private workspace.

The professional identity, portfolio, specialties, reputation and work history survive changes of salon affiliation.

### Commercial rule

Professional commercial participation on Afrofade is **not a permanently free product**. An independent professional who wants to use Afrofade as a business channel must have an active paid entitlement/plan according to the future pricing model.

The exact pricing, billing interval, trial policy and feature limits are intentionally not decided in D02 and require a separate monetization decision.

At minimum, paid-entitlement design must be able to govern capabilities such as:

- marketplace visibility/discoverability;
- receiving direct booking requests where enabled;
- professional portfolio/business features;
- career/recruitment features where applicable;
- advanced analytics or promotion features added later.

### Privacy consequence

An independent professional is not required to publish a private home address. Afrofade must support public service zones / neighborhoods and reveal precise appointment information only when product policy requires it.

### Architecture consequence

`ProfessionalProfile` must not require `salon_id`. Salon affiliation must be represented independently through membership records.

---

## D03 — Multi-salon ownership and management are first-class

**Status:** ACCEPTED

A salon owner may own **one or many salons/locations**. Afrofade must not encode ownership as a single `salon_id` field on a user profile.

A salon is a standalone business/location entity with its own operational state, including at least:

- identity/name/branding;
- location and service area;
- opening hours;
- service catalog and prices;
- team/memberships;
- availability;
- bookings;
- job postings;
- reviews/reputation signals;
- operational and acquisition metrics;
- subscription/entitlement relationship according to the future billing decision.

A user may have relationships with multiple salons simultaneously or historically.

### Canonical relationship model

```text
UserAccount
    |
    +-- ProfessionalProfile (optional)
    |
    +-- SalonMembership[]
            |
            +-- salon_id
            +-- role: owner | manager | professional
            +-- status
            +-- start_at
            +-- end_at
            +-- permissions / delegated capabilities

Salon
    |
    +-- memberships[]
    +-- services[]
    +-- staff availability[]
    +-- bookings[]
    +-- job postings[]
```

The same owner can therefore operate:

```text
Owner A
  +-- Salon Ouaga 2000
  +-- Salon Zone du Bois
  +-- Salon Karpala
```

while each location remains independently searchable/bookable and can have a distinct team, schedule, pricing and performance.

### Permissions consequence

Ownership, management and professional work are capabilities on a salon membership, not global immutable user roles. A person may be owner of Salon A, manager of Salon B and professional at Salon C if business rules allow it.

### UX consequence

A multi-salon owner/manager needs an organization/location switcher in the business dashboard, while customer-facing search results must point to the concrete salon location being booked.

### Billing question intentionally left open

D03 does **not** yet decide whether a subscription is billed:

- per salon/location;
- per owner/account with included locations;
- via a multi-location/franchise plan;
- or through a hybrid base plan + additional-location fee.

That is a separate monetization decision because it materially affects pricing and entitlements.

---

## D04 — Professional access follows the business channel that benefits

**Status:** ACCEPTED

Afrofade separates a professional's identity from the commercial entitlement used to operate on the platform.

### Rule for salon-affiliated professionals

A hair professional who belongs to a salon with an active eligible salon entitlement does **not** need to purchase a separate personal professional subscription merely to perform salon-authorized work.

Through the salon entitlement, the professional may receive the capabilities required for that salon, such as:

- appearing on the salon team;
- receiving bookings assigned through that salon;
- maintaining the professional information/portfolio required by the salon experience;
- participating in salon scheduling and operational workflows according to membership permissions.

The salon is paying for the business channel that receives the commercial benefit.

### Rule for independent/personal business activity

A professional who operates independently, or wants to develop a personal business channel outside the scope of a salon membership, must have an active personal `Afrofade Pro`-type entitlement according to the future pricing model.

Personal paid capabilities may govern:

- independent marketplace discoverability;
- direct bookings to the professional;
- independent service-area listing;
- personal business portfolio and analytics;
- recruitment/career premium capabilities;
- future promotion/boost tools.

### Consumer rule

A consumer/particulier does not need a recurring professional subscription. The existing B2C direction remains credit-based for billable AI actions unless a later explicit monetization decision changes it.

### Entitlement consequence

Authorization must be capability/entitlement based rather than inferred only from a global user role. The same `ProfessionalProfile` may receive capabilities from:

1. a personal professional subscription;
2. one or more active salon memberships whose salons carry eligible subscriptions;
3. platform/admin grants when explicitly supported.

### Pricing consequence

D04 does not set final prices. Pricing for `Professional`, `Salon` and `Multi-location/Business` plans remains a separate product decision informed by competitive research and willingness-to-pay validation.
