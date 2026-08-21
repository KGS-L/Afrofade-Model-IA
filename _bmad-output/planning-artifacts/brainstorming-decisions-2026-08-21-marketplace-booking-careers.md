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

---

## D05 — Booking targets a service-provider context, with optional professional assignment

**Status:** ACCEPTED

Afrofade must support both salon-based and independent-professional bookings without forcing a single booking model onto both cases.

### Salon booking

A customer may book a concrete salon location and either:

- choose a specific eligible professional when the salon exposes staff choice; or
- choose `any available professional`, allowing the salon to assign an eligible team member.

The salon remains the commercial/operational provider context for salon-originated bookings. The assigned professional is a participant in that booking, not the owner of the salon's customer relationship by default.

### Independent professional booking

A professional operating independently with an active eligible personal entitlement may receive direct bookings without a salon entity.

The professional is then the service-provider context for that booking.

### Canonical booking model

A booking should therefore support a provider context rather than a mandatory `salon_id` or mandatory `professional_id` alone.

Conceptually:

```text
Booking
  +-- customer_id
  +-- provider_type: salon | independent_professional
  +-- salon_id: nullable
  +-- professional_id: nullable / assignable
  +-- service_id
  +-- hairstyle_id: optional
  +-- try_on_asset_id: optional
  +-- starts_at / ends_at
  +-- price snapshot
  +-- status
```

Invariants:

- `provider_type = salon` requires a concrete salon/location;
- `provider_type = independent_professional` requires an eligible professional and no salon dependency;
- a salon booking may initially have no professional assignment when `any available professional` is selected;
- assignment must respect service skill eligibility, membership, availability and salon permissions;
- a saved Afrofade look/try-on can be attached to the booking as the visual service brief.

### Product consequence

Customer UX can support both:

```text
Book this salon
  -> choose professional
  OR
  -> first available qualified professional
```

and:

```text
Book this independent professional
```

### Marketplace consequence

Search/ranking may expose salons, independent professionals, or both, but booking conversion always preserves the concrete provider context and service location/zone.

### Architecture consequence

Availability must be modeled at both levels:

- salon/location operating hours and capacity;
- professional working schedule/availability.

Booking resolution must intersect service duration, salon hours, professional eligibility, existing appointments and future capacity rules instead of storing only a free-form requested datetime.

---

## D06 — Afrofade is non-custodial for third-party service money

**Status:** ACCEPTED

Afrofade must **not hold, custody or maintain stored-value balances containing money that economically belongs to customers, salons or professionals**.

### Financial boundary

Afrofade may receive and account for money that belongs to Afrofade itself, including for example:

- subscription fees;
- B2C AI credit-pack purchases where credits are product usage units, not withdrawable monetary balances;
- platform commissions;
- booking/platform fees;
- premium recruitment fees;
- promoted listing / boost fees;
- other Afrofade-owned service fees.

Afrofade must not expose a withdrawable user wallet, salon balance or professional cash balance that represents third-party funds held by Afrofade.

### If service payment is later enabled

If a customer later pays for a haircut/service through an Afrofade checkout, the preferred architecture is a payment service provider capable of marketplace routing, split payments or equivalent settlement so that:

```text
Customer payment
      |
      +--> Salon / independent professional share -> PSP settlement to provider
      |
      +--> Afrofade commission / platform fee -> Afrofade
```

Afrofade records transaction references, booking payment state, fee/commission amounts and provider settlement identifiers, but does not become the custodian of the provider's money.

### MVP consequence

Booking does **not** require online payment in the first version. A valid MVP may support:

```text
Reserve on Afrofade
      ->
Pay the salon/professional directly at service time
```

while Afrofade monetizes subscriptions and its own platform services.

This avoids making booking dependent on marketplace payout infrastructure before customer/salon demand is validated.

### Architecture consequence

Do not design a generic `user_wallet.balance` or `salon_wallet.balance` representing fiat money. Existing B2C `credit wallet` terminology must remain strictly scoped to non-withdrawable Afrofade usage credits and must never be represented as a fiat deposit account.

If marketplace payments are introduced, model them as payment/order/settlement records tied to an external regulated PSP and provider accounts, with explicit commission accounting and idempotent payment state.

### Compliance consequence

Any future marketplace/split-payment provider and launch jurisdiction must be reviewed before enabling service-payment flows. This product decision defines the intended architecture but is not itself a legal or regulatory determination.

---

## D07 — Reputation comes from verified completed-service experiences

**Status:** ACCEPTED

Afrofade's public reputation system must prioritize **verified reviews linked to real service activity** rather than anonymous/open ratings that can be easily manipulated.

### Eligibility rule

A customer may publish a verified review only for a booking that reached the product-defined completed-service state. A booking can produce at most one customer review record, with controlled edit/moderation rules.

The review keeps an immutable relationship to the underlying booking for auditability even if public presentation is later moderated.

### Salon versus professional reputation

Salon reputation and professional reputation are distinct aggregates.

For a salon-originated booking:

- the customer may rate the salon/service experience;
- when a concrete professional was assigned and completed the service, the same review flow may additionally include a professional-specific rating/feedback component;
- Afrofade computes salon and professional aggregates separately instead of copying one score onto both entities.

For an independent-professional booking:

- the verified review contributes to that professional's independent reputation.

Conceptually:

```text
Booking completed
      |
      +--> VerifiedReview
              |
              +--> salon_rating?          -> Salon aggregate
              +--> professional_rating?   -> Professional aggregate
              +--> text / structured feedback
```

### Trust signal

Public UI should distinguish booking-backed feedback with a clear `verified service` / equivalent trust indicator.

Unverified public ratings are excluded from the initial marketplace reputation score. Future imported testimonials or portfolio endorsements, if ever supported, must remain visibly distinct and must not masquerade as verified Afrofade bookings.

### Anti-abuse consequence

The reputation system should at minimum support:

- one review per eligible booking;
- author ownership verification;
- moderation/reporting state;
- protection against the salon/professional editing customer review content;
- auditable timestamps and target entities;
- no rating creation solely from a client-supplied `salon_id` or `professional_id` without server-authoritative booking eligibility.

### Marketplace consequence

Verified reputation can later participate in nearby-search ranking and recommendation, alongside distance, service/hairstyle skill match, availability and other transparent marketplace signals.

### 3D differentiation consequence

When a booking includes an Afrofade `try_on_asset_id` / saved look, the completed booking and review create a future quality signal connecting:

```text
desired visual style
      ->
selected salon/professional
      ->
completed service
      ->
verified customer feedback
```

This relationship may later improve style-to-professional matching, but D07 does not authorize opaque automated ranking or model training without a separate product/privacy decision.
