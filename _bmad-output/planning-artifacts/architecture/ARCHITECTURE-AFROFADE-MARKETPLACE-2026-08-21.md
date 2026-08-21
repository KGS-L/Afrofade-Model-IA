---
title: "Afrofade — Marketplace, Booking & Careers Architecture"
status: approved-for-implementation
created: 2026-08-21
change_source: "BMAD Correct Course 2026-08-21"
stack_baseline: "Next.js 16 + React 19 + Supabase Auth/Postgres/Storage + existing FastAPI 3D backend"
---

# Afrofade — Marketplace, Booking & Careers Architecture

## 1. Architectural intent

Add marketplace/business domains without destabilizing the existing durable 3D pipeline.

The web/product domain remains primarily in the Next.js + Supabase/Postgres side. Heavy 3D generation remains behind FastAPI/worker contracts. Marketplace features must not require Python/GPU workers except when they explicitly consume existing 3D assets.

```text
Next.js Web / Route Handlers
       |
       +-- Supabase Auth
       +-- Postgres + RLS + RPC
       +-- Supabase Storage
       |
       +-- Marketplace domains
       |    identity / salons / professionals / geo / booking / reviews / careers
       |
       +-- Existing commerce/payment layer
       |
       +-- Existing FastAPI internal 3D API
                |
                +-- ai_jobs / workers / canonical assets
```

## 2. Domain boundaries

### Identity domain

- `user_profiles` legacy/account metadata;
- `professional_profiles`;
- `salons`;
- `salon_memberships`;
- `entity_verifications` / status columns;
- permissions/entitlements.

### Hair taxonomy domain

- `hair_taxonomy` or equivalent normalized categories/styles;
- `professional_skills`;
- `salon_services` / independent professional services;
- portfolio tags;
- bridge to `hair_asset_versions.style_id`.

### Marketplace discovery domain

- public listing projections;
- PostGIS points/service zones;
- search RPC/functions;
- deterministic ranking signals.

### Scheduling/booking domain

- opening hours;
- professional schedules;
- time-off/blocks;
- services/duration/buffers;
- bookings;
- booking events/history;
- assignment;
- notification outbox.

### Trust domain

- reviews;
- rating aggregates/projections;
- reports;
- moderation/audit state;
- verification state.

### Careers domain

- job postings;
- job required skills;
- applications;
- application snapshots/events.

### Entitlement domain

- plan catalog/config;
- personal professional subscriptions;
- salon subscriptions/plan mapping;
- capability resolver.

## 3. Canonical identity model

Do not replace current account identity with mutually exclusive user roles.

```text
auth.users
   |
   +-- user_profiles
   |
   +-- professional_profiles (0..1)
   |
   +-- salon_memberships (0..N)
           |
           +-- salons (N..1)
```

### `professional_profiles`

Suggested fields:

```text
id uuid pk
user_id uuid unique not null -> auth.users
slug text unique
professional_name text
headline text
bio text
operating_mode enum/validated text
job_seeking_status enum
verification_status enum
listing_status enum
service_radius_m integer nullable
public_location geography(Point,4326) nullable
city text nullable
neighborhood text nullable
created_at timestamptz
updated_at timestamptz
```

Private exact address, if ever required, must be isolated from the public listing projection.

### `salons`

```text
id uuid pk
slug text unique
name text
owner_display/business metadata
verification_status
listing_status
public_location geography(Point,4326)
address fields
city
neighborhood
phone/public contact
booking_confirmation_mode
created_at
updated_at
```

Ownership is not stored only as `owner_user_id`; authoritative relationship is membership, allowing delegated/multiple owners where policy permits.

### `salon_memberships`

```text
id uuid pk
salon_id uuid not null
user_id uuid not null
professional_profile_id uuid nullable
role enum(owner, manager, professional)
status enum(invited, active, suspended, ended)
permissions jsonb / normalized overrides nullable
started_at
ended_at
created_at
updated_at
unique active relationship invariant as appropriate
```

Membership checks must be encapsulated in SQL helper functions/RPCs to avoid repeating unsafe client-side logic.

## 4. Entitlement architecture

Identity answers **who are you / what relationship do you have?**

Entitlement answers **what commercial capability is active in this context?**

```text
resolve_capability(user, capability, context)
   |
   +-- admin grant?
   +-- personal professional subscription?
   +-- active salon membership?
             |
             +-- salon subscription grants capability?
```

### Important invariant

Never authorize with logic like:

```ts
if (user.role === 'salon') allowBookingManagement()
```

Target logic is context-aware:

```text
can(user, 'booking.manage', { salonId })
```

or equivalent server helper/RPC.

Plan price/quota configuration must remain server-authoritative and reuse existing payment-finalization guarantees.

## 5. Hair taxonomy architecture

A normalized taxonomy is the bridge between 3D and marketplace.

Suggested model:

```text
hair_styles
- id stable slug/id
- label_fr
- category
- aliases
- active

professional_skills
- professional_profile_id
- hair_style_id / skill_id
- proficiency/self-declared metadata

service_style_links
- service_id
- hair_style_id

portfolio_style_links
- portfolio_item_id
- hair_style_id
```

Existing `hair_asset_versions.style_id` should map to the same stable style identity or through an explicit mapping table if historical IDs differ.

Do not use free-text hairstyle names as the only matching key.

## 6. Service model

A bookable service belongs to a provider context.

Recommended normalized design:

```text
services
- id
- provider_type: salon | professional
- salon_id nullable
- professional_profile_id nullable
- name
- description
- duration_minutes
- buffer_before_minutes
- buffer_after_minutes
- price_amount integer
- currency char(3) / validated text (XOF initially)
- active
- booking_enabled
```

Provider-context CHECK constraints ensure exactly the correct owning reference.

Professional staff eligibility inside a salon should be separate:

```text
salon_service_professionals
- service_id
- salon_membership_id
- active
```

This allows “first available qualified professional”.

## 7. Geospatial architecture

Enable PostGIS via migration/managed extension step.

Use indexed `geography(Point,4326)` for salon public points and optional professional public business point.

Create GiST indexes.

Prefer server/RPC search interfaces such as:

```text
search_nearby_providers(
  lat,
  lng,
  radius_m,
  style_id?,
  service_id/category?,
  provider_type?,
  available_from?,
  available_to?,
  limit,
  cursor
)
```

Public RPC output should return only approved/public fields and computed distance; never hidden/private coordinates.

Consumer browser GPS is sent as query input and is not persisted by default.

Ranking V1 is deterministic and observable:

```text
eligibility filter
 -> style/service match
 -> availability signal
 -> verified reputation
 -> distance
 -> deterministic tie-breaker
```

A sponsored flag may affect presentation later but must be disclosed and not erase organic relevance.

## 8. Availability architecture

Do not materialize millions of arbitrary future slots initially.

Store recurring working rules + exceptions + bookings, then compute slots over a bounded window.

Suggested tables:

```text
salon_opening_hours
professional_working_hours
professional_time_off
schedule_blocks
```

Each rule includes timezone-aware semantics. Salon timezone should be explicit even if first launch markets share UTC/near-UTC behavior.

Availability query inputs:

- provider context;
- service duration + buffers;
- desired date window;
- optional professional;
- salon hours;
- professional working schedule;
- time off;
- existing bookings.

## 9. Booking architecture

### `bookings`

Suggested core fields:

```text
id uuid pk
public_reference text unique
customer_user_id uuid not null
provider_type enum(salon, independent_professional)
salon_id uuid nullable
professional_profile_id uuid nullable
assigned_membership_id uuid nullable
service_id uuid not null
requested_style_id nullable
try_on_asset_id nullable
starts_at timestamptz
ends_at timestamptz
status enum
confirmation_mode snapshot
service_name_snapshot
service_duration_minutes_snapshot
price_amount_snapshot
currency_snapshot
customer_note nullable
created_at
updated_at
```

CHECK constraints enforce provider context.

### Booking events

Use append-only `booking_events` for significant transitions:

```text
booking_id
event_type
actor_user_id nullable
metadata jsonb
created_at
```

Current status remains on `bookings` for efficient queries; history is append-only.

### Concurrency

Availability preview is advisory. Final booking/confirmation must atomically re-check conflicts.

Preferred database-level strategy:

- PostgreSQL transaction;
- provider/professional scoped advisory lock **or** exclusion constraint/range strategy where model fits;
- re-check active overlapping bookings;
- insert/confirm in same transaction;
- idempotency key for retryable create endpoint.

Do not rely on two sequential browser/API calls like “check slot then insert”.

### First available

For salon + first available:

1. obtain eligible active professionals for service;
2. compute availability;
3. deterministically select candidate or leave unassigned only if salon config permits;
4. lock/re-check candidate during transaction;
5. persist assignment.

## 10. Review architecture

`reviews` must require server-verified booking eligibility.

Suggested fields:

```text
id
booking_id unique
customer_user_id
salon_rating nullable
professional_rating nullable
body nullable
moderation_status
created_at
updated_at
```

Do not accept arbitrary target entity IDs as authoritative when creating a review. Targets are derived from booking.

Rating aggregates can be maintained through SQL views/materialized/projection tables with auditable source reviews.

## 11. Careers architecture

### Job post

```text
job_postings
- id
- salon_id
- created_by_user_id
- title
- description
- employment/work_mode
- min_experience_years
- compensation_min/max/currency nullable
- status
- published_at
- expires_at nullable
```

`job_posting_skills` links normalized skills/styles.

### Application

```text
job_applications
- id
- job_posting_id
- professional_profile_id
- status
- profile_snapshot jsonb
- cover_note nullable
- created_at
- updated_at
unique(job_posting_id, professional_profile_id)
```

Use `job_application_events` for state history.

Hiring outcome does not grant DB membership automatically.

## 12. Portfolio/media architecture

Use `AssetStorage` conceptually where appropriate, but web portfolio media can remain Supabase Storage through server-authorized upload patterns.

Path convention recommendation:

```text
marketplace/professionals/<professional_id>/portfolio/<uuid>.<ext>
marketplace/salons/<salon_id>/media/<uuid>.<ext>
```

Metadata table records object bucket/path, owner entity, content type, moderation status.

Public delivery only after visibility/moderation policy allows it.

## 13. Notification architecture

Use transactional outbox pattern.

```text
notification_outbox
- id
- event_type
- recipient_user_id
- aggregate_type/id
- payload jsonb
- dedupe_key unique
- status
- attempts
- next_attempt_at
- created_at
- delivered_at
```

Booking transaction writes domain state + outbox event atomically.

A worker/cron processes channels independently:

- in-app projection required;
- email optional/provider adapter;
- SMS/WhatsApp optional/provider adapter;
- push later.

Delivery failure does not roll back valid domain transaction.

## 14. Verification/moderation architecture

Use explicit states; do not overload `active`.

Entities expose:

```text
verification_status
listing_status
moderation_status (where content-specific)
```

Reports:

```text
content_reports
- reporter_user_id
- target_type
- target_id
- reason
- details
- status
- resolution metadata
```

Admin moderation actions should be audit logged.

## 15. RLS / security rules

### Public

Can read only published marketplace projections/listings and approved public media.

### Consumer

Can manage own bookings/reviews and own private saved looks; cannot see private salon operations/applicant data.

### Professional

Can manage own profile/portfolio; direct booking data only when entitlement and ownership permit; salon operational access derives from active membership.

### Salon owner/manager

Can manage only salons where membership permissions authorize action.

### Salon professional

Can read/manage only assigned/allowed schedule/bookings according to membership permissions; cannot inherit owner capabilities.

### Admin

Server-authoritative admin only.

### Service role

Server-only; never exposed client-side.

Every SECURITY DEFINER RPC must set a controlled `search_path`, validate caller/context where applicable and have explicit grants/revokes.

## 16. API/web module structure

Prefer domain modules rather than placing all logic in React pages.

Suggested additions under current Next.js tree:

```text
web/src/app/
  discover/
  salons/[slug]/
  professionals/[slug]/
  bookings/
  careers/
  professional/
  dashboard/salons/[salonId]/

web/src/app/api/
  marketplace/search/
  salons/
  professionals/
  bookings/
  careers/
  reviews/
  memberships/
  notifications/

web/src/lib/
  marketplace/
  bookings/
  careers/
  entitlements/
  geo/
  notifications/
  authorization/
```

Actual implementation should inspect existing naming and reuse established auth/server-client helpers instead of duplicating them.

## 17. Migration sequence

Current hair-normalization work uses migration `11_hair_asset_normalization.sql`. Marketplace should continue numerically and keep each migration focused/reversible where possible.

Recommended sequence:

### Migration 12 — identity/salon foundation

- professional_profiles;
- salons;
- salon_memberships;
- helper permission functions;
- compatibility/backfill scaffolding.

### Migration 13 — taxonomy/services/portfolio

- hair taxonomy;
- skills;
- services;
- service-professional eligibility;
- portfolio metadata/links.

### Migration 14 — entitlements/multi-location compatibility

- plan/capability mappings if DB-backed;
- professional subscription projection/relation;
- salon entitlement support;
- migration/backfill from existing salon subscriptions.

### Migration 15 — PostGIS/discovery

- extension prerequisite/documented enablement;
- geo columns/indexes;
- safe nearby-search RPC/projection.

### Migration 16 — availability/booking/notifications

- schedules/blocks;
- bookings/events;
- idempotency/conflict-safe booking RPC;
- notification outbox.

### Migration 17 — reviews/trust/moderation

- reviews;
- aggregates/views;
- reports/moderation/verification extensions.

### Migration 18 — careers

- job postings/skills;
- applications/events/snapshots.

Do not combine all domains into one irreversible migration.

## 18. Legacy role migration

Existing `user_profiles.role` values remain readable during transition.

Backfill rules must be explicit:

- `customer`: no professional/salon entity is auto-created unless product data requires it;
- `salon`: create/associate salon entity only from verified existing salon profile/business data; create owner membership for current authoritative account;
- `admin`: preserve admin authorization unchanged.

If current DB stores a `salon_id` on user_profiles, map it to membership but do not drop it until all application paths use membership.

Migration scripts must be idempotent or guarded and produce validation queries/counts.

## 19. Testing strategy

Each story must include at least:

- positive path;
- unauthorized/tenant-negative path;
- RLS assertions;
- idempotency/retry where relevant;
- concurrency test for booking;
- migration/backfill validation;
- TypeScript typecheck/build;
- production Docker smoke remains green.

Marketplace CI should not require paid 3D or notification/payment providers.

Use deterministic fixtures/mocks for external adapters.

## 20. Observability

Structured IDs:

- search request/session identifier where privacy-safe;
- booking public/internal IDs;
- booking idempotency key;
- notification event/outbox ID;
- job posting/application ID;
- moderation report ID.

Track state transition latency and errors without logging private GPS, biometric media or secrets.

## 21. Architecture invariants

1. User identity != salon entity.
2. Professional identity != salon membership.
3. Membership != entitlement.
4. Search eligibility is server-authoritative.
5. Browser availability is not slot ownership.
6. Booking history is auditable.
7. Reviews derive from completed bookings.
8. Private coordinates never leak through public listing APIs.
9. Hair taxonomy links 3D assets to marketplace skills/services.
10. Marketplace works without 3D, but 3D enhances conversion.
11. Afrofade never requires custody of third-party service funds for MVP.
12. Existing durable 3D contracts remain independent and reusable.
