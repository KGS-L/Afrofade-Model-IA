---
title: "Afrofade Marketplace — UX V2 Backlog Amendments"
status: approved-backlog-amendment
created: 2026-08-21
updated: 2026-08-21
applies_to: "epics-marketplace-2026-08-21.md"
ux_source: "ux-designs/UX-AFROFADE-MARKETPLACE-V2-VALIDATED-2026-08-21.md"
---

# Afrofade Marketplace — UX V2 Backlog Amendments

## 0. Purpose

The original marketplace backlog remains the canonical Epic 12–17 technical plan. This amendment records the story-level changes required by the subsequently validated UX V2 contract.

Where an acceptance criterion below explicitly replaces an older criterion, the replacement is authoritative.

Do not duplicate work already implemented by an existing story. Fold these criteria into the relevant story/spec at story-creation time.

---

## A01 — Amend Story 12.3: ProfessionalProfile domain + onboarding

### Replace the conflicting onboarding criterion

Remove/replace the older acceptance criterion:

> onboarding UI offers consumer / hair professional / salon owner-manager intent...

with:

- every newly authenticated user has a normal personal/consumer context by default;
- signup does **not** require a mandatory `client / professional / salon` intent screen;
- optional first-use consumer personalization may collect city, permission-based location and style interests and must remain skippable unless technically required;
- professional onboarding begins only after explicit intent such as `Devenir professionnel`, `/pour-les-pros`, or equivalent action;
- salon creation begins only after explicit `Ajouter un salon`/business intent or accepted invitation;
- creating professional/salon activity never replaces or destroys the personal consumer context;
- tests verify that a consumer can later add professional and salon contexts without a duplicate auth account.

### Extend professional onboarding acceptance

- progressive onboarding covers identity/bio, normalized skills, first services, portfolio, availability and service-area/privacy settings;
- profile preview is available before publish;
- portfolio completeness is encouraged but excessive photo count is not a hard blocker;
- verification/listing state is explicit and server-authoritative.

---

## A02 — Add Story 12.7: Authenticated workspace shell & context switching

**Priority:** M1, after 12.5 capability resolver and before workspace-heavy UI stories.

### Goal

Provide one authenticated shell that safely represents personal, independent professional and salon contexts without duplicate accounts or ambiguous mutation scope.

### Acceptance criteria

- authenticated shell can resolve all contexts available to the current user;
- personal/consumer context always remains available to a normal user;
- independent professional context is shown only when the user owns a ProfessionalProfile;
- salon contexts are derived from active authorized SalonMembership records;
- context switcher displays enough disambiguation to distinguish personal activity and multiple salons/locations;
- switching context changes navigation/data scope but does not create a new auth session/account;
- every salon mutation still carries explicit salon/location context and is re-authorized server-side;
- a normal salon professional does not see owner/manager-only navigation/actions;
- multi-location owner can identify active location and can reach an aggregate business view where that capability exists;
- legacy `/account`, `/dashboard` and `/admin` capabilities remain reachable during migration until replacement routes are proven;
- tests cover a single person who is consumer + independent professional + member of salon A + owner/manager of salon B.

### Responsive navigation acceptance

On small smartphone breakpoints only:

- show top header/hamburger or drawer exposing complete workspace navigation;
- show a fixed bottom tab bar with **maximum four destinations**;
- bottom tab bar is contextual to active workspace;
- initial consumer tabs: `Accueil | Découvrir | Rendez-vous | Profil`;
- initial independent-pro tabs: `Accueil | Agenda | Réservations | Profil Pro`;
- initial salon/manager tabs: `Accueil | Agenda | Réservations | Équipe`;
- initial admin tabs: `Overview | Marketplace | Signalements | Menu`;
- larger screens do not render the smartphone bottom bar and instead use suitable sidebar/top navigation;
- active state, keyboard/focus accessibility, touch target sizes and bottom-content safe spacing are tested.

---

## A03 — Add Story 13.8: Public Landing V2 marketplace narrative

**Priority:** M1 UX. May begin as a data-tolerant shell while 13.1–13.7 are being completed, but production sections must use real/fallback-safe marketplace projections before release.

### Goal

Reposition the public home from a salon-centric 3D tool into the Afrofade hair/beard marketplace while preserving the current visual identity and Try-On assets.

### Acceptance criteria

- current cream/terracotta/ink design direction is preserved; no brand redesign;
- navbar primary items become marketplace-oriented: Discover, Styles, Professionals, Salons, For Pros equivalents;
- hero communicates within the first viewport that Afrofade helps users discover a style/service, find a suitable provider and book;
- hero contains service/style + location search affordance with manual location fallback;
- Try-On remains visible as a secondary differentiator, not the hero's sole product definition;
- home section order follows the approved V2 narrative: hero/search -> categories -> inspiration -> nearby talent -> how it works -> Try-On -> pro/business -> trust -> careers -> offers -> FAQ -> footer;
- current `HeroDemoCard`/Rituel/3D presentation is moved or reframed into the Try-On section rather than deleted solely because of the redesign;
- hairstyle catalog/components are reused where appropriate but style cards become marketplace entry points;
- nearby professional/salon cards clearly distinguish provider type and expose only meaningful decision data;
- no large map is required on home;
- pricing on home is compact actor segmentation; detailed price tables belong on `/tarifs`;
- FAQ and footer language reflect consumer + independent professional + salon + hair/beard scope rather than salons/barbers only;
- responsive test includes small smartphone widths;
- landing must remain useful when marketplace result datasets are temporarily empty/degraded.

### Comprehension gate

A new visitor should be able to infer from the hero/first viewport that Afrofade supports:

`style/service discovery -> provider discovery -> optional Try-On -> booking`.

---

## A04 — Extend Story 13.7: Discovery UI

Add acceptance criteria:

- `/discover` is usable without authentication for public listings;
- provider toggle supports `Tous | Professionnels | Salons` or equivalent;
- mobile advanced filters open in a bottom sheet/drawer or similarly compact pattern;
- filters include only data genuinely supported by backend/indexes;
- style/service context survives search/filter/navigation changes;
- a style detail or Try-On result can route to discovery without requiring generation again;
- contextual results can communicate the searched style/service, e.g. `Qui peut réaliser ce look ?`;
- ranking presentation does not imply distance is the only relevance factor;
- no independent professional private home address/hidden coordinate is exposed.

---

## A05 — Extend Story 13.5: Public provider profiles

Add acceptance criteria:

### Professional profile

- primary hierarchy prioritizes identity, trust state, specialties, public service zone, portfolio, services, availability and reviews;
- small-screen bookable profile uses a persistent/sticky booking CTA where it does not harm accessibility;
- style-context arrival can highlight relevant portfolio/service matches;
- public salon affiliations can be shown without exposing private membership/employment data.

### Salon profile

- profile shows business location, services, team, portfolio/gallery, hours and reviews in consumer decision order;
- style-context arrival can highlight services/team relevant to the selected style;
- booking CTA is prominent when salon is bookable.

---

## A06 — Extend Story 14.4: Customer booking journey

Add/replace acceptance criteria:

- canonical wizard is short: `Service -> Professional when applicable -> Date/time -> optional visual brief/note -> Confirmation`;
- independent professional path skips unnecessary professional-selection step;
- salon supports `Premier professionnel disponible` and specific eligible professional when configured;
- existing style/service context is preselected when authoritative and safe;
- Try-On/visual brief is optional and never required for normal booking;
- unauthenticated visitor can explore provider/service/availability before authentication;
- authentication is requested only when required to commit/own the booking;
- booking draft survives login/signup redirect and restores selected provider/service/slot/look context;
- pay-at-provider remains supported without marketplace checkout;
- lost-slot concurrency message explains that the slot was taken and presents refreshed alternatives;
- confirmation screen clearly shows provider, service, assignment when known, date/time, duration, price/range, payment model and attached-look state.

---

## A07 — Add Story 14.9: Consumer marketplace workspace evolution

**Priority:** M2 after booking read APIs exist.

### Goal

Evolve the existing `/account` consumer space from credit/3D-centric utility into the personal marketplace home while preserving wallet and Try-On capabilities.

### Acceptance criteria

- consumer home prioritizes next booking, saved/recent looks and useful nearby/favorite providers before wallet administration;
- appointments expose upcoming/completed/cancelled states and booking details/actions according to server policy;
- `Mes looks` treats saved look as a marketplace reference object, not only a GLB download;
- saved look can lead to `Trouver un professionnel` and booking flow;
- favorites are available when corresponding domain story exists, otherwise UI does not fake persistence;
- existing credit wallet/ledger and Try-On entry remain accessible;
- consumer UI works on smartphone with the approved four-tab bottom bar and full hamburger navigation;
- no existing ownership/security rule for private 3D assets is weakened.

---

## A08 — Add Story 14.10: Professional workspace UX integration

**Priority:** M2, after professional services/availability/booking operations are available.

### Goal

Provide the independent professional with a coherent operating workspace distinct from salon membership contexts.

### Acceptance criteria

- professional overview surfaces today's/next appointments and simple actionable performance indicators;
- navigation includes public profile, portfolio, services, agenda/availability, bookings, reviews, opportunities, analytics, subscription and settings as those domains become available;
- `Voir mon profil public` uses the same public projection customers see;
- portfolio items can be associated with normalized style/service taxonomy when supported;
- independent services and schedule edits are scoped to the authenticated professional context;
- salon-affiliated activity is not silently mixed into personal business mutations;
- switching into a salon membership context visibly changes scope/navigation;
- smartphone uses approved four-tab professional bottom bar plus complete hamburger menu.

---

## A09 — Add Story 14.11: Salon workspace UX integration

**Priority:** M2, after salon booking/team/services foundations are available.

### Goal

Evolve the current salon dashboard into a marketplace operations workspace without losing current subscription/quota/3D capabilities.

### Acceptance criteria

- overview prioritizes today's bookings, upcoming appointments, team availability and available slots;
- navigation can reach reservations, calendar, services, team, relevant clients/history, reviews, recruitment, analytics, billing/subscription, public profile and settings when supported;
- owner/manager/professional controls reflect server capabilities rather than cosmetic role labels;
- team view exposes active members, invitations, role, skill/service assignment and schedule as supported;
- active salon/location is always clear before a mutation;
- multi-location owner can switch locations without cross-tenant data leakage;
- aggregate business view is read-only unless a bulk action explicitly supports multiple locations;
- existing salon quota/subscription/Try-On features remain reachable until intentionally migrated;
- smartphone uses approved salon four-tab bottom bar plus complete hamburger menu.

---

## A10 — Extend Story 14.7: Saved look / visual brief

Add acceptance criteria:

- a saved look can exist as a style/reference brief even when no 3D Try-On asset exists;
- visual brief can include style ID, reference media, notes/variant and optional Try-On asset;
- provider booking view makes the attached brief easy to see before service fulfillment;
- customer can explicitly include/remove the brief before confirmation;
- ordinary provider search/booking never invokes paid generation providers automatically.

---

## A11 — Extend Story 15.3: Review UI & aggregates

Add acceptance criteria:

- UI distinguishes generic rating/review count from verified completed-booking evidence;
- professional and salon trust are displayed separately;
- provider cards/profile must not claim `specialist in style X` solely from a self-selected tag;
- portfolio/service/completed-booking evidence may progressively support stronger skill relevance labels;
- low/no-review states remain useful without fake testimonials.

---

## A12 — Careers placement rule

Existing Epic 16 remains valid.

UX amendment:

- Careers is secondary on the consumer home page and must not make Afrofade look primarily like a jobs board;
- professional workspace includes an Opportunities/Careers entry;
- salon workspace includes Recruitment;
- accepted hiring outcome may lead into a SalonMembership flow but must not create duplicate user identity.

---

## A13 — Admin workspace progressive expansion

Admin marketplace UI should grow alongside the epics that introduce each domain rather than wait for one giant late rewrite.

Minimum navigation target when corresponding backend domains exist:

```text
Overview
Marketplace
Users
Professionals
Salons
Verification
Reservations
Reviews / Reports
Careers
Subscriptions / Payments
Taxonomy / Styles / Services
Analytics
```

Acceptance principles:

- no hard-coded production KPIs;
- moderation/verification actions use audited server transitions;
- analytics excludes biometric URLs and precise consumer GPS;
- admin mobile is supported for essential review/triage but complex operations remain desktop-preferred;
- smartphone quick bar follows `Overview | Marketplace | Signalements | Menu` maximum-four rule.

---

## A14 — Story-spec rule

Before an amended story enters implementation:

1. read the canonical architecture document;
2. read `UX-AFROFADE-MARKETPLACE-V2-VALIDATED-2026-08-21.md`;
3. incorporate the relevant amendment in the story spec/acceptance criteria;
4. preserve existing security/commerce/3D invariants;
5. explicitly identify legacy UI/data behavior being preserved, migrated or deprecated;
6. do not invent missing marketplace behavior ad hoc during coding.

---

# Final UX-to-backlog dependency summary

```text
12.x identity + entitlements
 -> 12.7 workspace/context shell
 -> 13.x taxonomy/services/location/public discovery
 -> 13.8 landing V2
 -> 14.x availability/booking
 -> 14.9 consumer workspace
 -> 14.10 professional workspace
 -> 14.11 salon workspace
 -> 15.x trust/reviews/moderation
 -> 16.x careers
 -> 17.x growth/subscriptions/analytics
```

Parallel implementation is allowed where dependencies and server contracts are already stable, but UI must not fake unavailable backend capabilities.
