---
title: "Afrofade Marketplace — UX V2 Validated Contract"
status: approved-for-specification
created: 2026-08-21
updated: 2026-08-21
supersedes_for_ux: "UX-AFROFADE-MARKETPLACE-2026-08-21.md where rules conflict"
visual_direction: "retain current Afrofade cream/terracotta identity; redesign information architecture and product story, not the brand"
---

# Afrofade Marketplace — UX V2 Validated Contract

## 0. Purpose and authority

This document formalizes the UX decisions validated during the 2026-08-21 marketplace redesign workshop.

When this document conflicts with `UX-AFROFADE-MARKETPLACE-2026-08-21.md`, **this V2 document is authoritative for UX behavior, navigation, onboarding, landing-page structure and workspace interaction**.

This document does not authorize destructive code changes by itself. It is the UX source of truth to be translated into implementation stories/specifications before coding.

---

## 1. Product mental model

Afrofade is no longer presented primarily as a 3D haircut simulator for salons.

The consumer mental model is:

```text
I want a hairstyle / beard style
-> I discover or search for it
-> I can optionally try it on myself
-> I find a suitable professional or salon nearby
-> I book
-> the service happens
-> I leave a verified review
```

Canonical public promise:

> **Discover your next style, see how it could look on you, find the right talent nearby, and book.**

The 3D Try-On remains a signature differentiator, but marketplace discovery and booking must remain useful without using AI/3D.

### UX success test

A new visitor seeing only the first screen for roughly five seconds should understand that Afrofade helps them:

1. find a hairstyle or service;
2. find a professional/salon able to realize it;
3. optionally visualize it on themselves;
4. book.

If a visitor concludes only “Afrofade is a 3D haircut tool”, the landing UX has failed.

---

## 2. Core UX principles

### UX-P01 — Consumer-first public experience

The public home page primarily serves the person looking for a hairstyle/service. Professional, salon and career entry points remain visible but secondary.

### UX-P02 — Benefit before technology

Use language such as `Essayer une coiffure sur moi` rather than leading with FLAME, reconstruction meshes, scanning or technical pipeline terminology.

### UX-P03 — Try-On is optional

A customer can search, evaluate providers and book without creating a 3D head or purchasing AI credits.

### UX-P04 — One person, multiple contexts

Do not model the product UX as four unrelated accounts.

A single authenticated person can simultaneously be:

- a consumer;
- an independent professional;
- a member of one or more salons;
- an owner/manager of one or more salons;
- an admin when explicitly granted platform authority.

The UI must expose a **context switcher**, not force duplicate accounts.

### UX-P05 — Mobile-first consumer experience

Consumer journeys must feel closer to a mobile application than a desktop SaaS dashboard.

### UX-P06 — Trust must be evidence-based

Avoid decorative trust labels. Distinguish profile verification, verified-booking reviews, portfolio proof and service history.

### UX-P07 — Do not expose unnecessary private location data

Salon/public business addresses may be public. Independent professionals may expose a service zone/neighborhood while keeping a private home address hidden.

---

# PART A — PUBLIC MARKETPLACE

## 3. Global public navigation

### Desktop navigation

Recommended primary navigation:

```text
Découvrir
Styles
Professionnels
Salons
Pour les pros
```

Right-side actions:

```text
Se connecter
[ Essayer une coiffure ]
```

Do not lead the navbar with `Le Rituel`. Try-On is a capability, not the entire product identity.

### Mobile public navigation

Use a compact header with logo, important action when appropriate, and hamburger/drawer for full public navigation.

Public visitors do not need an authenticated workspace bottom bar.

---

## 4. Landing page — canonical order

The landing page must follow this narrative order:

```text
01 Navbar
02 Hero + marketplace search
03 Service/style categories
04 Style inspiration
05 Nearby professionals & salons
06 How Afrofade works
07 Afrofade Try-On
08 For professionals / salons
09 Trust / verified reviews
10 Careers teaser
11 Offers / pricing entry
12 FAQ
13 Footer
```

### 4.1 Hero

Eyebrow:

> **La coiffure commence avant le fauteuil ✦**

Primary heading:

> **Trouvez le professionnel qui saura vraiment réaliser votre style.**

Supporting copy:

> Découvrez des coiffures, essayez-les sur vous avec Afrofade, trouvez les salons et professionnels adaptés près de chez vous, puis réservez votre prestation.

Primary interaction is marketplace search:

```text
[ Tresses, locks, taper fade... ]
[ Ouagadougou / Ma position ]
[ Rechercher ]
```

Quick categories may include:

```text
Tresses · Fades · Locks · Afro · Barbe
```

Secondary actions:

- `Explorer les styles`
- `Essayer une coiffure sur moi`

Hero visual should communicate marketplace intent, for example a selected style and nearby capable providers. The current technical FLAME process card must not dominate the hero.

### 4.2 Category discovery

Heading:

> **Qu'est-ce que vous cherchez aujourd'hui ?**

Initial visual categories:

- Barber & Fades
- Tresses
- Locks & Locs
- Afro & Twists
- Coiffure
- Barbe

Each category routes into discover with the relevant filter context.

### 4.3 Style inspiration

Heading:

> **Trouvez le style qui vous ressemble**

Supporting copy:

> Explorez des coiffures, essayez-les sur vous et découvrez qui peut les réaliser.

Style cards remain visually simple and link to a style detail page. Avoid loading cards with multiple competing CTAs.

Style detail primary actions:

```text
[ Trouver un professionnel ]
[ Essayer sur moi ]
```

Marketplace discovery remains the primary path; Try-On is optional.

### 4.4 Nearby talent

Heading:

> **Trouvez le bon talent près de chez vous**

Toggle:

```text
Professionnels | Salons
```

Professional result summary should prioritize:

1. photo/portfolio image;
2. name and meaningful verification state;
3. specialties/style match;
4. verified rating/review count;
5. service zone/distance;
6. contextual price;
7. next availability.

Salon result summary should prioritize:

1. salon image/name;
2. rating;
3. location/distance;
4. matching services;
5. team/service information;
6. next availability.

Do not place a large map on the home page. A list-first presentation is preferred on landing; map belongs in `/discover` when useful.

### 4.5 How Afrofade works

Heading:

> **De l'idée au rendez-vous, simplement.**

Four steps:

```text
01 Découvrez
02 Essayez — optionnel / Afrofade Try-On
03 Trouvez
04 Réservez
```

This replaces the old home-page story `scan -> reconstruction -> hairstyles -> validation`.

### 4.6 Afrofade Try-On

This is the appropriate location to reuse/reframe the current Rituel/3D experience.

Recommended title:

> **Voyez la coupe avant le premier coup de tondeuse.**

Explain outcomes, not internal technology:

- try several looks;
- visualize different angles;
- save a preferred look;
- attach the look to a booking.

Primary CTA:

`Essayer une coiffure`

Secondary CTA:

`Voir comment ça marche`

A successful Try-On should progressively end with:

```text
Votre look est prêt
[ Trouver qui peut le réaliser ]
[ Enregistrer ]
[ Télécharger ]
```

`Trouver qui peut le réaliser` is the primary marketplace conversion.

### 4.7 Professional/business teaser

Heading:

> **Faites grandir votre activité avec Afrofade**

Present three concepts without turning the public home into a B2B dashboard:

- Professional independent
- Salon
- Multi-salon / Business

Primary route: `/pour-les-pros`.

### 4.8 Trust

Heading:

> **Choisissez en confiance**

Trust proof pillars:

- portfolio / actual work;
- reviews linked to eligible completed bookings;
- visible specialties and relevant experience.

Do not imply that a professional is expert in a specific style only because they selected a checkbox.

### 4.9 Careers

Careers is strategically valuable but secondary on the main consumer landing.

Compact teaser:

> **Faites avancer votre carrière dans la coiffure**

Actions:

- `Voir les offres`
- `Je recrute`

Route: `/careers`.

### 4.10 Pricing/offers

Home should not contain a giant pricing matrix for every actor.

Compact segmentation:

- Consumer: marketplace discovery + credit-based Try-On where billable;
- Professional: independent business capabilities;
- Salon: team/booking/business capabilities;
- Business: multi-location capabilities.

Detailed prices belong on `/tarifs`.

### 4.11 FAQ

Recommended questions include:

- Is Afrofade free for consumers?
- Can I book without using Try-On?
- How are nearby providers selected?
- Can I book an independent professional?
- How do verified reviews work?
- How does hairstyle Try-On work?

### 4.12 Footer

Broaden brand language beyond barbers/salons only.

Suggested promise:

> **Découvrez votre prochain style. Trouvez le talent qui saura le réaliser.**

Footer groups:

- Discover
- Afrofade / Try-On
- Professionals
- Help
- Legal

---

## 5. Discover/Search flow

Public route target: `/discover`.

Discovery must be accessible without authentication.

### Search inputs

- service/style;
- location: manual city/neighborhood or permission-based current location.

### Quick filters

- service;
- date;
- price;
- distance;
- rating;
- availability today;
- provider type.

Mobile advanced filters should open in a bottom sheet/drawer rather than occupying the whole viewport.

### Provider-type toggle

```text
Tous | Professionnels | Salons
```

### Context preservation

When arriving from a style or Try-On, retain that context throughout discovery and booking.

Example:

> `Professionnels capables de réaliser “Knotless Braids”`

### Ranking principle

Do not rank only by distance.

Progressive ranking signals may combine:

- style/service match;
- eligibility;
- availability;
- distance;
- verified reputation;
- contextual price;
- portfolio/service evidence.

---

## 6. Public professional profile

The page must answer:

> Can I trust this person to realize the service/style I want?

Recommended content hierarchy:

1. identity/photo;
2. verification/reputation;
3. specialty chips;
4. location/service zone;
5. primary `Réserver` CTA if eligible;
6. portfolio;
7. bookable services and durations/prices;
8. availability teaser;
9. about;
10. verified reviews;
11. current public salon affiliations where applicable.

Use a sticky booking CTA on small screens when the provider is bookable.

Do not expose private employment/application information.

---

## 7. Public salon profile

Recommended hierarchy:

1. salon identity/photo;
2. verification/reputation;
3. address/location and opening state when reliable;
4. primary `Réserver` CTA;
5. services;
6. team;
7. portfolio/gallery;
8. specialties;
9. opening hours;
10. verified reviews;
11. location/directions.

When arriving from a style, show contextual relevance to that style/service.

---

## 8. Booking flow

Booking should remain short and predictable.

Canonical steps:

```text
1 Service
2 Professional — salon only when selection is relevant
3 Date & time
4 Visual brief / notes — optional
5 Confirmation
```

### Service step

Show service, price/range and duration.

If the user arrived from a style/service, preselect whenever safely possible.

### Professional step

Salon bookings may offer:

- `Premier professionnel disponible`
- a specific eligible professional.

Only professionals eligible for the selected service should appear.

Independent professional bookings skip this step.

### Date/time step

Keep client calendar simple. Show only authoritative available slots.

If a slot is lost to a concurrency race, explain what happened and provide replacement slots rather than a generic error.

### Visual brief

A saved or generated Afrofade look can be attached to the booking.

This is optional.

Conceptual `LookBrief` may reference:

- style identifier;
- reference image(s);
- selected variant;
- customer notes;
- optional Try-On asset;
- service/category context.

### Confirmation

Show:

- provider;
- location/service zone;
- assigned professional if known;
- service;
- date/time;
- duration;
- quoted price/range;
- payment model;
- attached-look indicator.

MVP payment for third-party hair service remains non-custodial: booking can occur on Afrofade while payment happens directly with the provider.

---

## 9. Authentication timing

Do **not** force account creation before a visitor can explore provider availability.

Preferred sequence:

```text
Discover
-> Provider
-> Service
-> Slot
-> Confirmation intent
-> Authenticate/create account if required
-> Preserve booking draft
-> Create booking
```

The booking draft must survive authentication.

---

# PART B — IDENTITY AND ACTIVITY ONBOARDING

## 10. Account onboarding

### Superseded rule

The V1 mandatory post-signup screen `Comment souhaitez-vous utiliser Afrofade ?` is no longer the desired default UX.

### V2 behavior

A newly authenticated person receives a normal personal/consumer context by default.

Do not force the person to choose `client / professional / salon` immediately.

Optional first-use personalization may ask for:

- city;
- permission-based location;
- preferred style categories.

These fields should be skippable unless a feature genuinely requires them.

### Activity creation is intent-driven

Professional/salon onboarding begins only when the user expresses intent, for example:

- `Devenir professionnel`
- `Ajouter un salon`
- `/pour-les-pros`
- accepting a salon invitation.

---

## 11. Professional onboarding

Recommended progressive onboarding:

1. activity mode: independent / salon / both;
2. professional identity and bio;
3. skills/categories;
4. first services/prices/durations;
5. portfolio;
6. availability;
7. service area/location/privacy;
8. profile preview and publish.

Do not require excessive portfolio volume before publication. Encourage proof, then improve completeness over time.

Professional verification can be progressive; verification state must be explicit rather than implied.

---

## 12. Salon creation

Recommended progressive onboarding:

1. salon identity/contact;
2. public location;
3. services;
4. opening hours;
5. optional team invitations;
6. profile preview/publish.

Team creation must not block salon creation.

### Team invitation

A salon may invite an existing/new user as a membership, not create a duplicate person account.

MVP membership roles:

- owner;
- manager;
- professional.

Permission controls must be enforced server-side and reflected in UI.

---

# PART C — AUTHENTICATED WORKSPACES

## 13. Context switcher

A single user may have multiple contexts.

Example:

```text
Personnel
Aïcha Hair — activité indépendante
Salon Élégance — professionnelle
Aïcha Beauty — propriétaire
```

The context switcher changes navigation, permissions and data scope.

It must never imply that switching context changes the person's underlying account identity.

Multi-location salon owners may also switch locations or use an aggregate read-only business view where supported.

---

## 14. Consumer workspace

Consumer navigation concepts:

- Accueil
- Découvrir
- Mes rendez-vous
- Mes looks
- Favoris
- Try-On / crédits
- Mes avis
- Profil

### Consumer home priority

1. next upcoming booking;
2. saved/recent looks;
3. useful nearby recommendations;
4. favorites/recent providers;
5. Try-On/credits only when relevant.

Do not make credit wallet or 3D reconstruction the dominant consumer dashboard story.

### Appointments

Tabs/states:

- upcoming;
- completed;
- cancelled.

Booking detail includes service, provider, time, location, attached look and allowed actions.

### Looks

A saved look is a marketplace object, not merely a generated GLB.

Actions may include:

- `Trouver un professionnel`
- `Réserver`
- `Télécharger`
- `Supprimer` subject to data policy.

---

## 15. Professional workspace

Recommended modules:

- Overview
- Public profile
- Portfolio
- Services
- Agenda / availability
- Reservations
- Reviews
- Career opportunities
- Analytics
- Pro subscription
- Settings

### Overview priorities

- today's appointments;
- next appointment;
- profile views;
- booking/request signals;
- new reviews;
- simple performance summary.

### Portfolio

Portfolio items should be attachable to style/service taxonomy. This evidence may later strengthen marketplace matching.

### Salon membership context

When operating inside a salon, a professional sees only actions allowed by that membership.

Do not expose owner/manager controls to a normal professional.

---

## 16. Salon workspace

Recommended modules:

- Overview
- Reservations
- Calendar
- Services
- Team
- Clients / relevant history
- Reviews
- Recruitment
- Analytics
- Billing/subscription
- Public profile
- Settings

### Overview priorities

- bookings today;
- team availability;
- next appointments;
- available slots;
- service/revenue operational indicators where appropriate.

### Team

Owners/managers can view members, invitations, roles, skill/service assignments, schedules and membership status according to permission.

### Multi-location

Use a persistent location/context switcher.

An aggregate `Tous les établissements` view may show read-only KPIs, but mutations should target a concrete salon/location unless explicitly designed as bulk actions.

---

## 17. Admin workspace

Admin becomes marketplace operations control, not only legacy billing/3D KPIs.

Recommended modules:

- Overview
- Marketplace
- Users
- Professionals
- Salons
- Verification
- Reservations
- Reviews / reports / moderation
- Careers
- Subscriptions/payments
- Taxonomy/styles/services
- Analytics
- Settings/security as required.

### Admin overview examples

- users;
- professionals;
- salons;
- bookings;
- eligible verified reviews;
- pending verifications;
- open moderation reports;
- platform revenue metrics.

### Funnel analytics

Track product transitions such as:

```text
Search -> Provider profile
Provider profile -> Booking start
Style -> Try-On
Style -> Provider discovery
Try-On -> Provider discovery
Provider -> Booking
Booking -> Completed
Completed -> Review
```

---

# PART D — RESPONSIVE NAVIGATION

## 18. Mobile authenticated navigation rule

### Validated rule

On small smartphone screens only, authenticated workspaces use:

- top header + hamburger/drawer for complete navigation;
- a **bottom tab bar with a maximum of four items** for high-frequency destinations.

The bottom bar is a shortcut layer, not the complete information architecture.

Do not place secondary utilities such as settings or notifications in the four slots unless future usage evidence justifies it.

### Consumer mobile tabs

Initial recommendation:

```text
Accueil | Découvrir | Rendez-vous | Profil
```

### Independent professional mobile tabs

```text
Accueil | Agenda | Réservations | Profil Pro
```

### Salon/manager mobile tabs

```text
Accueil | Agenda | Réservations | Équipe
```

### Admin mobile tabs

```text
Overview | Marketplace | Signalements | Menu
```

Admin remains desktop-preferred for complex operations.

### Context-aware behavior

Changing workspace context may change the four tabs.

Example:

```text
Personal context
Accueil | Découvrir | RDV | Profil

Professional context
Accueil | Agenda | Réservations | Profil Pro

Salon context
Accueil | Agenda | Réservations | Équipe
```

### Larger screens

Do not show the smartphone bottom tab bar on normal desktop layouts.

Professional, salon and admin workspaces should use a suitable sidebar/top navigation structure on larger screens.

---

# PART E — TRUST, REVIEWS AND PROVIDER MATCHING

## 19. Review UX

Only eligible completed bookings can generate the strongest `verified service` review state.

UI should distinguish:

- rating;
- review count;
- verified booking/service marker;
- moderation state where relevant.

Do not make generic star ratings appear more authoritative than the data supports.

---

## 20. Skill/style relevance UX

Afrofade must avoid claiming that a provider can realize a specific hairstyle solely because the provider selected a tag.

Potential evidence levels:

```text
Declared skill
+ relevant service
+ portfolio examples
+ completed similar bookings
+ verified customer feedback
```

The ranking system may progressively use these signals as data becomes available.

---

# PART F — ROUTE TARGETS

## 21. Public route targets

Target information architecture:

```text
/
/discover
/styles
/styles/[slug]
/professionals
/professionals/[slug]
/salons
/salons/[slug]
/rituel                     # existing Try-On route may remain initially
/pour-les-pros
/careers
/careers/[jobSlug]
/tarifs
/connexion
```

Exact route names may adapt to existing Next.js structure, but semantics should remain stable.

## 22. Authenticated route concepts

Existing routes may be migrated progressively rather than broken immediately.

Conceptual destination groups:

```text
/account/...                # personal consumer context
/pro/...                    # independent professional context
/dashboard/...              # salon/business context, or renamed later
/admin/...                  # platform administration
```

Do not introduce a route migration merely for aesthetics if it creates unnecessary regression risk. Behavior and capability model are more important than path naming.

---

# PART G — VISUAL SYSTEM AND COMPONENT STRATEGY

## 23. Visual direction

Keep current Afrofade visual identity:

- cream background;
- terracotta primary/accent;
- ink/dark typography;
- existing display/body typography direction;
- existing rounded-card language;
- soft shadow system.

The redesign is primarily a product-story, information-architecture and component-composition change.

Do not trigger a brand redesign as part of marketplace implementation.

## 24. Existing components to preserve/adapt

Expected reuse/adaptation:

- existing Navbar shell/responsiveness;
- existing Footer shell;
- hairstyle catalog data/components;
- 3D/Try-On visual components;
- current FAQ accordion;
- motion/FadeIn primitives;
- existing pricing infrastructure on the dedicated pricing path.

Expected major restructuring:

- home `page.tsx` composition;
- hero content and marketplace search;
- navbar link model;
- footer information architecture;
- marketplace cards;
- discover/filter UI;
- role/context workspace shell;
- mobile authenticated bottom tab bar.

---

# PART H — IMPLEMENTATION UX GATES

## 25. Gate UX-1 — Landing comprehension

Before considering landing implementation complete:

- Hero communicates marketplace value without requiring scroll;
- search/service/location action is obvious;
- Try-On is visible but not dominant;
- professional/business entry is discoverable;
- layout remains coherent on smartphone.

## 26. Gate UX-2 — Marketplace discovery

- Discover works without Try-On;
- location has manual fallback;
- style context can reach provider results;
- provider cards distinguish professional vs salon;
- independent private addresses are not leaked.

## 27. Gate UX-3 — Booking

- service -> provider selection -> slot -> optional look -> confirmation works;
- independent booking skips unnecessary team choice;
- salon can support `Premier professionnel disponible`;
- auth does not destroy a preselected booking draft;
- concurrency loss produces recovery UX.

## 28. Gate UX-4 — Workspaces

- personal, professional and salon contexts are clearly separated;
- one person can switch contexts without duplicate accounts;
- permissions alter visible actions;
- multi-location users can identify active salon/location;
- legacy consumer/salon/admin capabilities are preserved during migration.

## 29. Gate UX-5 — Smartphone navigation

- hamburger exposes complete workspace navigation;
- bottom bar appears only at small-screen breakpoint;
- maximum four bottom destinations;
- bottom items change correctly by active context;
- active item is visually obvious;
- content is not hidden behind the fixed bar;
- accessibility labels and touch targets are adequate.

---

# PART I — NON-GOALS FOR INITIAL MARKETPLACE UX

Do not make these release blockers for the first marketplace increment:

- full social network/feed;
- unrestricted user-to-user messaging;
- live marketplace split payments/escrow;
- giant map-first discovery UI;
- complex LinkedIn-style recruitment suite;
- AI/3D requirement for ordinary booking;
- ultra-granular salon permissions beyond MVP role/capability needs;
- complete route renaming solely for consistency.

---

# 30. Canonical implementation sequence from a UX perspective

Recommended order:

```text
A. Shared marketplace identity/context foundations
B. Public landing V2 shell
C. Discover + provider public profiles
D. Booking flow
E. Auth draft preservation
F. Consumer workspace evolution
G. Professional onboarding/workspace
H. Salon/team/multi-location workspace evolution
I. Trust/reviews
J. Careers
K. Monetization refinement
L. Admin marketplace operations
```

Implementation stories and architecture invariants remain controlled by the canonical BMAD epics/architecture documents. This sequence describes UX dependency order and should be reconciled with those artifacts rather than executed independently.

---

# 31. Final validated product statement

Afrofade should feel like one coherent hair-and-beard ecosystem:

> **Discover a style -> optionally try it -> find the right nearby talent -> book -> arrive with a shared visual brief -> complete the service -> build verified reputation.**

That story must remain visible across the public site, consumer workspace, professional workspace, salon workspace and admin operations.
