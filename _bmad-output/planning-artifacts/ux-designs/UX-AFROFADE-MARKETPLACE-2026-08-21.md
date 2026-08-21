---
title: "Afrofade — Marketplace UX Contract"
status: approved-for-implementation
created: 2026-08-21
principle: "reuse existing Afrofade visual identity; extend information architecture without brand redesign"
---

# Afrofade Marketplace UX Contract

## 1. UX principle

Afrofade must feel like one product, not a 3D app plus a disconnected booking website plus a job board.

The main consumer mental model is:

```text
I want a look
 -> I can try it
 -> I can find someone capable nearby
 -> I can book
```

The main professional mental model is:

```text
My profile proves my skills
 -> brings clients
 -> follows me across salons
 -> helps me find work
```

The main salon mental model is:

```text
My salon page brings clients
 -> bookings go to my team
 -> Afrofade helps consultation
 -> I can recruit and manage growth
```

## 2. Global navigation

Public/top-level navigation should expose at minimum:

- `Essayer une coiffure` / Studio 3D;
- `Trouver un salon` / Discover;
- `Emplois coiffure` / Careers;
- pricing/business entry;
- account/auth.

Do not require authentication just to view published public salon/professional profiles or active public jobs unless abuse/security constraints require it.

## 3. Onboarding intent selection

After authenticated account creation, when user has not completed marketplace intent:

### Screen: “Comment souhaitez-vous utiliser Afrofade ?”

Cards:

1. **Je cherche à me coiffer**
   - try looks;
   - find nearby providers;
   - book.

2. **Je suis professionnel(le) de la coiffure**
   - professional profile;
   - portfolio;
   - clients/bookings where eligible;
   - jobs.

3. **Je possède ou gère un salon**
   - create/manage salon;
   - team;
   - bookings;
   - recruitment.

This is an onboarding intent, not an irreversible role switch. A user can later create a professional profile or salon if authorized/eligible.

## 4. Consumer information architecture

Recommended authenticated consumer navigation:

```text
Accueil
Découvrir
Mes looks
Mes rendez-vous
Crédits
Compte
```

### Consumer home

Prioritize:

1. continue/create 3D head;
2. recent/saved looks;
3. “Trouver quelqu'un pour ce look” CTA;
4. nearby providers when location context exists;
5. upcoming booking.

Do not overload with social feed.

## 5. Discover experience

### Entry states

A. From a selected style/try-on:

```text
“Qui peut réaliser ce look près de vous ?”
style context already applied
```

B. Direct marketplace entry:

```text
“Que recherchez-vous ?”
service/style + location
```

### Location UX

Primary:

`Utiliser ma position`

Fallback:

- city;
- neighborhood/zone.

Explain location permission in benefit language. Do not imply permanent tracking.

### Result card

For salon:

- salon name;
- approximate distance;
- verified rating/count when available;
- service/style match chips;
- starting price when meaningful;
- nearest availability teaser;
- open/closed status if reliable;
- thumbnail;
- `Voir` / `Réserver`.

For independent professional:

- professional name/photo;
- `Indépendant` label;
- skills/style match;
- distance/service zone;
- verified rating;
- next availability;
- `Voir` / `Réserver`.

Avoid displaying precise private home location.

### Filters

Progressive, not all at once:

- distance;
- style/service;
- date/availability;
- price;
- rating;
- provider type.

List-first MVP is acceptable. Interactive map is an enhancement, not a release blocker.

## 6. Salon public profile

Sections:

1. hero: name, verification, rating, distance/address, open state;
2. primary CTA `Réserver`;
3. services/prices/durations;
4. team;
5. portfolio/gallery;
6. specialties/styles;
7. opening hours;
8. verified reviews;
9. location/directions;
10. public contact if salon opted to expose it.

When arrived from a style, show contextual module:

> “Ce salon propose des services correspondant à votre look [Style].”

## 7. Professional public profile

Sections:

1. professional identity/headline;
2. verification/reputation;
3. specialties;
4. portfolio;
5. current public salon affiliation(s);
6. independent/mobile/studio mode if applicable;
7. public service area;
8. services/prices if independently bookable;
9. verified reviews;
10. `Réserver` only if eligible;
11. career availability badge only according to professional privacy setting.

Do not expose internal employment/application information publicly.

## 8. Booking wizard

Keep booking short and predictable.

### Step 1 — Service

Show:

- service;
- duration;
- price;
- style context if any.

### Step 2 — Professional choice (salon only where enabled)

Options:

- `Premier professionnel disponible`;
- specific eligible team member cards.

Independent provider skips this step.

### Step 3 — Date & time

- date selector;
- authoritative availability slots;
- clear timezone/local date;
- unavailable/no-slot empty state.

### Step 4 — Visual brief / note

If current saved look exists:

- preview;
- “Joindre ce look au rendez-vous” default on/explicit choice according to privacy/product policy.

Optional customer note.

### Step 5 — Confirmation

Show immutable booking summary:

- provider;
- location/service area;
- professional if assigned;
- service;
- date/time;
- duration;
- quoted price;
- payment method for MVP: `Paiement auprès du salon/professionnel`;
- attached look indicator.

If slot race occurs, never show generic failure only. Explain the selected slot was just taken and refresh alternatives.

## 9. Booking detail

Consumer view:

- public booking reference;
- status timeline;
- provider/service/time;
- visual brief;
- cancellation/reschedule actions when allowed;
- after completion: review CTA.

Provider view:

- customer public/service identity needed to fulfill booking;
- requested service;
- assigned professional;
- visual brief prominently visible;
- notes;
- state transition controls according to permission.

## 10. Professional workspace

Recommended navigation when personal professional context is active:

```text
Mon profil
Portfolio
Mes services
Disponibilités
Réservations
Opportunités
Abonnement Pro
```

If the same person belongs to a salon, clearly separate **Mon activité** from **Salon X** context to avoid modifying salon data accidentally.

## 11. Salon dashboard

Persistent location/context switcher at top for users with >1 authorized salon:

```text
[ Afro Cut — Ouaga 2000 ▼ ]
```

Navigation:

```text
Vue d'ensemble
Réservations
Services
Équipe
Clients / historique pertinent
Recrutement
Profil public
Analytics
Abonnement
Paramètres
```

### Multi-location aggregate view

Optional `Tous mes salons` context may show aggregate read-only KPIs. Mutations must always resolve to a concrete salon unless the action explicitly targets multiple locations.

## 12. Team management

Owner/manager UI:

- active members;
- pending invitations;
- role label;
- services/skills assignment;
- working schedule;
- membership state;
- remove/end access action with confirmation.

Do not represent `owner`/`manager` as cosmetic labels; controls must reflect server capabilities.

## 13. Careers UX

### Public/professional jobs list

Card:

- salon;
- location;
- job title;
- skill chips;
- work mode;
- compensation if provided;
- posted date/status.

### Job detail

- salon profile link;
- requirements;
- skills;
- experience;
- schedule/work mode;
- compensation where available;
- apply CTA.

### Apply

Default:

`Postuler avec mon profil Afrofade`

Show what salon will see:

- profile summary;
- skills;
- portfolio;
- experience;
- optional note.

Do not require CV upload for MVP.

### Salon applicant pipeline

Columns/tabs rather than full LinkedIn clone:

```text
Nouvelles
Vues
Présélectionnées
Entretien
Offre
Terminées
```

Actions use server state machine.

## 14. Reviews UX

Only completed eligible booking shows review action.

Review form can collect:

- salon/service rating;
- professional rating if a concrete professional completed it;
- short text feedback.

Public label:

`Service vérifié sur Afrofade`

No ability for provider to edit customer text.

## 15. Entitlement/paywall UX

Paywalls explain the commercial action being unlocked.

Independent professional attempting to publish/direct-book without entitlement:

> “Activez Afrofade Pro pour apparaître dans les recherches et recevoir des réservations directement.”

Salon plan limit reached:

> “Votre plan actuel inclut X établissement(s). Passez à une offre multi-sites ou ajustez vos établissements actifs.”

Never show false capability because cached client role says `salon`.

## 16. Status and empty states

Every major domain requires intentional empty/loading/error state:

- no nearby providers;
- location permission denied;
- no availability;
- no bookings;
- no portfolio;
- no team;
- no applications;
- suspended/unpublished listing;
- expired entitlement;
- notification delivery issue without booking loss.

## 17. Mobile-first rules

- primary CTAs reachable without hover;
- booking slots tap-friendly;
- salon switcher usable on narrow viewport;
- dashboards use progressive disclosure/cards rather than desktop-only dense tables;
- portfolio uses responsive media grid;
- filters can use sheet/drawer pattern;
- forms preserve progress on validation errors.

## 18. Design-system rule

Reuse existing Afrofade typography, colors, spacing, buttons, cards and layout primitives wherever present. New marketplace components should extend shared components rather than introducing a second design language.

No brand redesign is part of Stories 12–17.

## 19. UX acceptance smoke flows

Before M2 release, manually/E2E validate at minimum:

1. consumer -> style -> discover -> salon -> first available -> booking;
2. consumer -> discover -> independent professional -> booking;
3. salon owner with 2 salons switches context and cannot mutate wrong salon;
4. salon professional sees allowed bookings but not owner billing controls;
5. independent professional without plan sees paywall and is not public/bookable;
6. completed booking -> verified review;
7. salon publishes job -> professional applies -> salon shortlists -> hire -> membership invitation.
