---
title: "Afrofade — BMAD Product Brainstorm: Marketplace, Booking & Careers"
status: brainstorming
created: 2026-08-21
branch: agent/bmad-marketplace-booking-careers-vision
source_documents:
  - _bmad-output/planning-artifacts/prds/prd-Afrofade-2026-08-19/prd.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/change-proposal-2026-08-19-p0-to-p1.md
trigger: "Field feedback from a professional hairdresser/barber: local customer acquisition, booking and recruitment could make Afrofade materially more useful than a standalone 3D try-on tool."
---

# Afrofade — Product Brainstorm: from 3D Try-On to Hair Marketplace & Professional Network

## 0. Session intent

This artifact deliberately does **not** modify the canonical PRD, architecture or epics yet.

The purpose of the session is to explore whether Afrofade should evolve from:

> a B2B/B2C 3D hairstyle try-on platform

into:

> a hair discovery, booking, professional identity and recruitment network, with 3D try-on as its differentiated decision engine.

Only after the product shape is accepted should BMAD produce a formal `Correct Course / Change Proposal`, refresh the PRD, update architecture, and regenerate/adjust epics and stories.

---

# 1. Change signal

The current PRD models three global roles: `customer`, `salon`, `admin`. In particular, `salon` currently combines salon owners/managers with barbers/hairdressers linked to a salon.

The new field insight exposes three gaps:

1. **Customer acquisition gap** — salons need customers, not only a 3D consultation tool.
2. **Booking gap** — consumers who discover/try a hairstyle should be able to convert intent into an appointment.
3. **Employment gap** — salons recruit informally while individual hair professionals need a visible professional identity and access to job opportunities.

This means the new vision is not a simple feature addition. It introduces a **two-sided local marketplace** and a **professional labour marketplace** on top of the existing 3D/SaaS platform.

---

# 2. Product reframe

## 2.1 Current product thesis

```text
See a hairstyle on your own 3D head before cutting.
```

## 2.2 Candidate expanded product thesis

```text
DISCOVER -> TRY -> FIND -> BOOK -> GET THE LOOK
                       \
                        -> WORK / HIRE
```

Afrofade would connect the full intent-to-service loop:

```text
Inspiration
    ↓
3D Try-On
    ↓
Style Decision
    ↓
Nearby skilled professional / salon
    ↓
Availability + Booking
    ↓
Appointment
    ↓
Verified result / review / portfolio signal
```

And in parallel:

```text
Hair professional
    ↓
Professional profile + portfolio + specialties
    ↓
Availability for work
    ↓
Salon job posting
    ↓
Application / hiring
```

## 2.3 Candidate positioning

Afrofade should **not** become a generic social network or generic appointment SaaS.

The defensible positioning is:

> **Afrofade is the operating marketplace for hair decisions: visualize the desired look, find the right nearby professional, book the service, and build professional reputation around real hair skills.**

The 3D engine remains the differentiator. Booking and careers are distribution and monetization layers around it.

---

# 3. Product pillars

## Pillar A — Visual decision / 3D Try-On

Existing core:

- canonical 3D head;
- reusable canonical hairstyle assets;
- hair fitting;
- line-up / color / later beard and detail customization;
- saved looks and exact visual references.

This pillar answers:

> “What do I want?”

## Pillar B — Local discovery

New marketplace layer:

- salon public profiles;
- professional public profiles;
- location / distance;
- services and prices;
- specialties;
- availability;
- reviews;
- portfolio;
- filters and ranking.

This pillar answers:

> “Who near me can actually do it?”

## Pillar C — Booking

New transaction layer:

- service catalog;
- staff availability;
- appointment slots;
- booking lifecycle;
- cancellation / no-show policy later;
- optional deposit/payment later;
- attach a saved Afrofade look/try-on to the appointment.

This pillar answers:

> “When can I get it done?”

## Pillar D — Professional identity & careers

New labour-network layer:

- hair professional profile;
- experience;
- specialties;
- portfolio;
- employment history;
- current salon memberships;
- job-seeking status;
- salon job posts;
- applications;
- hiring state.

This pillar answers:

> Professional: “Where can I work?”
>
> Salon: “Who can I hire?”

## Pillar E — Salon growth / operations

Existing salon SaaS evolves from a consultation tool toward a growth console:

- bookings;
- staff;
- clients;
- customer acquisition;
- job postings;
- profile visibility;
- performance analytics;
- 3D consultation and catalog;
- subscription/plan.

This pillar answers:

> “How does Afrofade help my salon make more money and operate better?”

---

# 4. Persona model

## 4.1 Customer / Particulier

Primary JTBD:

> “I want to choose a hairstyle with confidence and find a trustworthy nearby person who can reproduce it.”

Key capabilities:

- create a 3D head;
- try styles/colors/details;
- save looks;
- discover nearby salons/professionals;
- compare price/distance/rating/availability;
- book;
- attach desired look to appointment;
- review completed service.

## 4.2 Hair professional / Coiffeur-Barbier

Primary JTBD:

> “I want my skills and work to be visible, attract clients, and find better job opportunities.”

Key capabilities:

- professional public profile;
- portfolio;
- specialties / hairstyle taxonomy;
- years of experience;
- work history;
- current salon affiliation(s);
- independent status if applicable;
- job-seeking / availability status;
- receive booking assignments when permitted;
- apply to salon jobs.

## 4.3 Salon owner / manager

Primary JTBD:

> “I want more customers, reliable bookings, visibility, and an easier way to hire and manage skilled professionals.”

Key capabilities:

- create/manage salon entity;
- public business profile;
- location, opening hours, photos, services, prices;
- invite/manage team;
- set staff/service availability;
- receive/manage bookings;
- publish job offers;
- review applicants;
- see customer acquisition and booking metrics;
- retain current 3D consultation/SaaS capabilities.

## 4.4 Platform admin

Primary JTBD:

> “I need a trustworthy marketplace: quality listings, safe permissions, auditable bookings, jobs, reviews and 3D assets.”

---

# 5. Critical identity decision: account != role != salon

## 5.1 Do not create a permanently exclusive global role model

A simple evolution such as:

```text
user.role = customer | barber | salon | admin
```

looks convenient but becomes brittle.

Real-world examples:

- a barber can also be a normal consumer;
- a barber can work at a salon today and become owner tomorrow;
- an owner can also personally cut hair;
- one professional may move between salons;
- a manager may not be a barber;
- later an owner may manage multiple locations.

## 5.2 Recommended conceptual model

```text
Auth User / Account
        │
        ├── Customer capability (default consumer use)
        │
        ├── ProfessionalProfile (optional)
        │        │
        │        └── portfolio / skills / experience / job status
        │
        ├── SalonMembership(s)
        │        ├── owner
        │        ├── manager
        │        └── barber / staff
        │
        └── Platform Admin privilege (strict, server-authoritative)

Salon
  ├── location
  ├── public profile
  ├── services
  ├── team memberships
  ├── schedules
  ├── bookings
  └── job posts
```

### UX implication

The signup UI can still ask:

> “How do you want to use Afrofade?”

with:

- I want to find/get a haircut;
- I am a hair professional;
- I own/manage a salon.

But this is an **onboarding mode**, not an irreversible authorization role.

### Transitional implementation direction

The existing `user_profiles.role` should not be casually deleted because security and RLS depend on it. A future Correct Course should specify a backward-compatible migration, likely separating:

- platform/system privilege;
- professional identity;
- salon membership/permissions.

---

# 6. New salon onboarding

## 6.1 Owner/manager journey

```text
Sign up
  ↓
Choose “I own/manage a salon”
  ↓
Create salon or accept invitation
  ↓
Salon identity
  - name
  - photos
  - phone/contact
  - description
  ↓
Location
  - map pin / address
  - city / district
  ↓
Opening hours
  ↓
Services + duration + price
  ↓
Team
  - invite professionals
  - assign permissions
  ↓
Availability / booking configuration
  ↓
Public profile goes live
```

## 6.2 Professional journey

```text
Sign up
  ↓
Choose “I am a hair professional”
  ↓
Professional profile
  - display name
  - profile photo
  - bio
  - years experience
  - specialties
  ↓
Portfolio
  ↓
Current work situation
  ├── independent
  ├── works at salon
  └── looking for work
  ↓
Join existing salon via invitation/request
  ↓
Public profile
```

A professional should not need to create a fake “salon” just to exist on Afrofade.

---

# 7. Location strategy

Location is a core marketplace primitive, but customer privacy matters.

## 7.1 Salon location

A salon is a public place/business and can store:

- latitude/longitude;
- address text;
- city;
- district/neighbourhood;
- optional landmark/instructions.

## 7.2 Professional location

For an independent professional:

- service area / neighbourhood;
- optional public work location;
- do not expose private home coordinates by default.

For an employed professional:

- derive public service location from the salon membership when appropriate.

## 7.3 Customer location

Recommendation:

- ask browser/mobile geolocation **only after explaining the benefit**;
- use it for nearby search;
- provide manual city/neighbourhood selection if permission is refused;
- avoid permanently storing precise customer coordinates unless a concrete product requirement requires it;
- booking can store the selected salon, not necessarily the customer’s live coordinates.

## 7.4 Geospatial capability

Supabase/PostgreSQL can support a geospatial search layer. The eventual architecture decision should compare:

- PostGIS distance queries;
- simple lat/lng + bounding box/haversine for initial MVP;
- indexing and ranking requirements.

Product requirement first: “near me” must be reliable before sophisticated map features.

---

# 8. Discovery marketplace

## 8.1 Search modes

Consumer can search:

- salons near me;
- professionals near me;
- a specific service;
- a specific hairstyle/style category;
- open now;
- available today;
- price range;
- rating;
- distance.

## 8.2 Ranking candidate

Initial organic ranking should combine signals such as:

```text
style/service match
+ distance
+ availability
+ review quality
+ booking completion reliability
+ profile completeness
```

Paid promotion, if introduced, must be clearly separated from organic relevance so marketplace trust is not destroyed.

## 8.3 Critical 3D differentiator

The hairstyle catalog should become a **shared taxonomy** across the marketplace.

Example:

```text
Canonical hairstyle/style id
        │
        ├── 3D Try-On asset
        ├── salon service tags
        ├── professional skill tags
        ├── portfolio tags
        └── job requirement tags
```

This enables a highly differentiated query:

> “Show me nearby professionals who are skilled in the exact hairstyle I just tried.”

That is materially stronger than a generic “barbers near me” directory.

---

# 9. Booking model

## 9.1 Booking should be salon + optional professional aware

Candidate appointment contract:

```text
Booking
  id
  customer_id
  salon_id
  professional_id?     # specific professional when selected
  service_id
  hairstyle_id?        # shared style taxonomy
  try_on_asset_id?     # exact saved visual reference
  start_at
  end_at
  quoted_price
  currency
  status
  notes
  created_at
```

## 9.2 Candidate statuses

```text
pending / confirmed / completed / cancelled / no_show
```

Whether a booking is auto-confirmed or requires salon acceptance should be a product configuration decision, not hard-coded globally.

## 9.3 Availability primitives

Need explicit concepts for:

- salon opening hours;
- professional working schedule;
- service duration;
- breaks/time off;
- existing appointments;
- optional buffers between appointments.

## 9.4 Booking V1 recommendation

Do not start with the hardest possible scheduler.

V1 can support:

- salon-defined services and durations;
- staff weekly availability;
- deterministic open slots;
- booking confirmation;
- cancellation;
- reminder later.

Defer initially:

- recurring complex schedules;
- waiting lists;
- resource/chair optimization;
- multi-service chained appointments;
- marketplace deposits/escrow;
- dynamic pricing.

## 9.5 The “visual booking” differentiator

A completed try-on can be attached to a booking:

```text
Customer wants:
- hairstyle: Low Taper Fade
- color: black
- line-up: right-side detail
- beard: short fade (future)
- exact visual: TryOnAsset #...
```

This turns the 3D result into a **visual service brief** between customer and professional.

---

# 10. Professional profile / “LinkedIn for hair”

The analogy is useful for identity, portfolio and hiring, but Afrofade should remain task-oriented rather than reproduce LinkedIn social features.

## 10.1 Profile content

Candidate fields:

- display/professional name;
- profile photo;
- city/service area;
- bio;
- years of experience;
- specialties;
- style taxonomy tags;
- portfolio media;
- employment history;
- current salon memberships;
- certifications/training (optional);
- languages (optional);
- job-seeking status;
- availability status;
- verified booking reviews;
- profile completeness.

## 10.2 Portfolio

Portfolio is a major trust signal.

Each item can later carry:

- image/video;
- hairstyle/style tags;
- description;
- date;
- salon context;
- optional link to a completed Afrofade booking;
- moderation status.

A portfolio item linked to a completed booking can receive a stronger “verified work” signal than arbitrary uploads.

## 10.3 What NOT to add in V1

Do not start with:

- public posts/feed;
- follower graph;
- likes/comments;
- stories;
- generic DMs;
- creator monetization.

These increase moderation, spam and complexity without proving the marketplace loop.

---

# 11. Recruitment / Careers marketplace

## 11.1 Salon job posting

Candidate fields:

```text
JobPosting
  salon_id
  title
  employment_type
  location
  description
  required_skills/style_tags
  min_experience?
  compensation_min?
  compensation_max?
  currency
  start_date?
  status
```

## 11.2 Professional application

```text
JobApplication
  job_posting_id
  professional_id
  note?
  status
  created_at
```

Candidate states:

```text
submitted / viewed / shortlisted / rejected / hired / withdrawn
```

## 11.3 Recruitment V1 value

Salon:

- publish an offer;
- browse candidate profiles;
- inspect portfolio/specialties;
- shortlist;
- update application status.

Professional:

- discover nearby jobs;
- filter by skill/location;
- apply with Afrofade profile;
- track application state.

## 11.4 Deferred recruitment complexity

Initially avoid claiming to be a full HR/payroll product.

Defer:

- employment contracts;
- payroll;
- attendance;
- labour compliance automation;
- background checks;
- salary escrow;
- employee performance management.

---

# 12. Marketplace trust layer

Booking/recruitment changes trust requirements substantially.

## 12.1 Reviews

Strong recommendation:

- reviews should preferentially be tied to a completed booking;
- avoid unrestricted anonymous salon reviews in MVP;
- professional vs salon review targets must be clearly defined;
- moderation/report abuse path required.

## 12.2 Business/profile verification

Potential progressive signals:

- phone/email verified;
- salon location verified;
- professional membership confirmed by salon;
- completed bookings;
- portfolio verified through booking;
- identity/business verification later if needed.

## 12.3 Anti-abuse

Future requirements:

- rate limits;
- spam job prevention;
- duplicate salon prevention;
- fake portfolio/reporting;
- fake bookings/no-shows;
- review fraud;
- authorization boundaries around staff and salon ownership.

---

# 13. Product flywheel

The expanded product becomes compelling if each subsystem strengthens the others.

```text
3D Try-On
    ↓
High-intent consumer
    ↓
Nearby style-matched salon/professional
    ↓
Booking
    ↓
Completed service
    ↓
Verified review + portfolio + skill signal
    ↓
Better discovery quality
    ↓
More consumers
```

And supply-side:

```text
More salons
   ↓
More job opportunities
   ↓
More professionals create profiles
   ↓
Richer skill/portfolio inventory
   ↓
Better consumer matching
   ↓
More bookings
   ↓
More value for salons
```

This is the strategic reason the new direction is potentially much stronger than adding booking as an isolated feature.

---

# 14. Business model hypotheses

Current business model should not be discarded immediately.

## Existing

- B2B salon subscription;
- B2C AI credits.

## New optional revenue layers

### A. Booking

Possible later models:

- no commission initially to accelerate supply adoption;
- fixed lead/booking fee;
- percentage commission;
- paid deposit/payment processing fee.

Recommendation: do not lock this before marketplace usage is measured.

### B. Recruitment

Possible later models:

- free basic job posts with paid boost;
- limited posts included in salon plan;
- recruitment add-on;
- featured job listings.

### C. Discovery visibility

Possible later models:

- sponsored/boosted salon placement;
- promoted professional profile;
- premium analytics.

Any paid placement must remain clearly marked and must not replace relevance in organic search.

### D. Salon subscription evolution

The subscription proposition becomes easier to sell if it combines:

```text
3D consultation
+ profile visibility
+ booking management
+ staff/team
+ recruitment
+ customer acquisition analytics
```

Plan/pricing changes require a separate commercial exercise; do not modify current prices during this brainstorming session.

---

# 15. North-star and success metrics candidates

Do not choose vanity metrics such as registrations as the primary success metric.

## Candidate north-star

> **Completed appointments that originated or were managed through Afrofade.**

Why it is attractive:

- represents real consumer value;
- represents salon value/revenue opportunity;
- creates verified review/portfolio signals;
- connects discovery, booking and marketplace quality.

## Supporting metrics

Consumer funnel:

- try-on -> salon/profile view conversion;
- search -> booking conversion;
- distance-to-booked-provider;
- booking completion rate;
- repeat booking rate.

Supply:

- active salons with bookable services;
- active professionals with complete profiles;
- available slots;
- time to first booking after salon signup.

Careers:

- active job posts;
- qualified applications/post;
- application -> shortlist;
- confirmed hires if reliably measurable.

3D:

- try-on session -> booking lift;
- style-matched booking rate vs generic search.

---

# 16. Scope risk / anti-feature list

The biggest threat is turning Afrofade into five half-built products.

## Explicit anti-goals for the first marketplace release

- not a generic social network;
- not a full HRIS/payroll product;
- not a generic maps directory for every beauty business;
- not a food-delivery-style real-time dispatch system;
- not a full accounting/ERP system;
- not a payment escrow marketplace on day one;
- not a complex multi-resource salon scheduler on day one.

The first objective is proving:

```text
3D/intent -> right local provider -> booking
```

and separately:

```text
professional profile -> salon job opportunity -> application
```

---

# 17. Recommended delivery waves

The existing 3D core should continue. This product change should be planned now without destabilizing Stories 8/9.

## Wave 0 — Current 3D foundation

Continue current work:

- Hair Asset Factory;
- HairFitter;
- real-time catalog swap;
- durable try-on/export.

Reason: the 3D/style object is the differentiator that later powers marketplace matching.

## Wave 1 — Identity & marketplace foundation

Build the minimum domain graph:

- `ProfessionalProfile`;
- `Salon` public business profile;
- `SalonMembership`;
- owner/manager/staff authorization;
- services + style/specialty taxonomy;
- public salon/professional pages;
- location + nearby search.

No booking complexity before this foundation is correct.

## Wave 2 — Booking V1

- services + durations/prices;
- working availability;
- slots;
- appointment lifecycle;
- customer booking dashboard;
- salon booking dashboard;
- attach TryOnAsset/look to booking;
- verified post-booking review.

## Wave 3 — Careers V1

- professional work-status;
- job posts;
- jobs nearby;
- applications;
- shortlist/hiring pipeline;
- salon candidate browsing.

## Wave 4 — Marketplace growth

Only after usage data:

- deposits/payments;
- reminders;
- no-show controls;
- promotions/boosts;
- richer analytics;
- professional verification;
- reputation refinements;
- advanced matching/recommendation.

---

# 18. BMAD impact analysis

## 18.1 Current PRD sections that become incomplete/obsolete

- Target Users & Roles: `customer / salon / admin` is insufficient.
- `salon` currently combines owner/manager/barber, which conflicts with the professional-profile concept.
- RBAC requirements assume a global `salon` role rather than salon memberships/capabilities.
- Customer journey ends at share/show-to-barber instead of discovery/booking.
- Salon value proposition lacks acquisition, bookings and recruitment.
- No local discovery, booking, review, professional identity or careers requirements exist.

## 18.2 Architecture impact

New domains are mostly web/backend business domains and should remain separated from the 3D AI pipeline:

```text
Identity / Professional Graph
Local Discovery
Booking
Careers
Trust & Reviews
         │
         └── references Style / TryOn IDs

3D Domain
CanonicalHead
CanonicalHairAsset
HairFitter
TryOnAsset
```

Do **not** couple booking logic into FastAPI 3D workers.

Likely ownership:

- Next.js/server application + Supabase Postgres for marketplace/business domains;
- FastAPI remains 3D compute/job engine;
- Supabase Auth remains identity entry point;
- Supabase Storage handles public/private portfolio/business media according to dedicated policies.

## 18.3 Epic strategy candidates

Because current Epic 8/9 are active and Epics 10/11 are not yet complete, formal Correct Course should decide between:

### Option A — minimally invasive

Preserve current Epics 8–11 and add new marketplace epics after them:

- Epic 12 — Professional Identity & Salon Memberships;
- Epic 13 — Local Discovery Marketplace;
- Epic 14 — Booking & Reviews;
- Epic 15 — Careers & Recruitment.

Advantage: maximum historical continuity.

Disadvantage: product execution order may not match numbering.

### Option B — revise backlog epics that are not started

Keep implemented/in-progress Epics untouched, but rewrite not-started Epic 10/11 and add new epics.

Possible shape:

- Epic 10 — Consumer Home, Discovery & Wallet;
- Epic 11 — Salon & Professional Identity Foundation;
- Epic 12 — Booking Marketplace;
- Epic 13 — Careers & Recruitment;
- Epic 14 — Admin/Trust/Marketplace Operations.

Advantage: cleaner future roadmap.

Disadvantage: requires careful BMAD traceability because existing 10/11 definitions change.

### Initial recommendation

**Option B** is strategically cleaner because Epic 10/11 are still backlog and the new identity model changes both consumer and salon journeys. Preserve history in the Change Proposal and never renumber completed stories.

---

# 19. Candidate conceptual data model

This is brainstorming, not migration SQL.

```text
users/auth.users
    │
    ├── user_profiles
    │
    ├── professional_profiles
    │      ├── professional_skills
    │      ├── professional_portfolio
    │      └── professional_experience
    │
    └── salon_memberships
             │
             ▼
           salons
             ├── salon_locations
             ├── salon_services
             ├── salon_hours
             ├── staff_availability
             ├── bookings
             └── job_postings
                       └── job_applications

bookings
  ├── customer user
  ├── salon
  ├── professional? 
  ├── service
  ├── hairstyle/style taxonomy?
  └── try_on_asset?

reviews
  └── derived from completed booking when possible
```

A separate normalized style/skill taxonomy should bridge 3D catalog, professional specialties, portfolio, salon service capability and job requirements.

---

# 20. Key decisions to validate before Correct Course

## D1 — Product identity

Recommended:

> Afrofade remains a **hair-specific platform**, not a generic beauty marketplace.

## D2 — Professional model

Recommended:

> “Coiffeur/Barber” becomes a first-class `ProfessionalProfile`; salon ownership/employment is modeled through memberships, not a mutually exclusive global role.

## D3 — Marketplace priority

Recommended:

> Local discovery + booking should be prioritized before building social-network features.

## D4 — Careers priority

Recommended:

> Careers is a separate V1 marketplace after booking foundation; professional profiles should be designed from day one so careers can reuse them.

## D5 — Booking payment

Recommended:

> V1 booking can exist without marketplace payment/escrow. Prove scheduling and demand first; integrate deposits later.

## D6 — Location privacy

Recommended:

> Precise salon locations are public; precise customer location is permissioned/ephemeral where possible; independent professionals expose service area rather than home coordinates by default.

## D7 — 3D connection

Recommended:

> Every major marketplace flow should be able to reference the style taxonomy and saved TryOnAsset, making the 3D system a conversion engine rather than an isolated feature.

---

# 21. Preliminary product verdict

**GO for deeper BMAD Correct Course analysis.**

The field feedback identifies a coherent expansion rather than random feature creep **if** Afrofade keeps one central loop:

```text
VISUALIZE THE LOOK
        ↓
FIND THE RIGHT LOCAL PROFESSIONAL
        ↓
BOOK / GET IT DONE
```

Professional profiles and recruitment strengthen marketplace supply, but should not turn the first release into a social network or HR suite.

The strongest strategic shift is not “add booking”. It is:

> move Afrofade from a tool salons may pay for into a network that can **send salons customers**, while giving professionals portable reputation and job mobility.

That changes the commercial story from:

> “Pay for a 3D hairstyle tool.”

into:

> “Afrofade helps people decide what they want, find you, book you, and helps you recruit the people who deliver the service.”

---

# 22. Next BMAD step after brainstorming approval

Do not edit the canonical PRD yet.

Recommended sequence:

1. validate/revise the decisions in Section 20;
2. create `change-proposal-2026-08-21-marketplace-booking-careers.md`;
3. refresh PRD with new product vision/personas/journeys/FRs;
4. create marketplace architecture addendum/domain model;
5. revise future epics/stories while preserving completed/in-progress history;
6. produce readiness gate before implementation.
