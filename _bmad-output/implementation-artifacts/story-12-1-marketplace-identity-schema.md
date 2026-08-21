---
title: "Story 12.1 — Marketplace Identity Schema"
status: ready-for-dev
created: 2026-08-21
updated: 2026-08-21
epic: 12
priority: M1-1
migration: web/supabase/migrations/12_marketplace_identity_foundation.sql
ux_source: _bmad-output/planning-artifacts/ux-designs/UX-AFROFADE-MARKETPLACE-V2-VALIDATED-2026-08-21.md
architecture_source: _bmad-output/planning-artifacts/architecture/ARCHITECTURE-AFROFADE-MARKETPLACE-2026-08-21.md
---

# Story 12.1 — Marketplace Identity Schema

## 1. Story

As Afrofade evolves from a salon-centric 3D product into a hair/beard marketplace, the platform needs an identity model in which one authenticated person can remain a consumer while also owning an independent professional identity and belonging to one or more salons.

The foundation must be additive and backward compatible. It must not destroy the current `customer | salon | admin` behavior before legacy data has been backfilled and validated in Story 12.2.

## 2. User/product outcome

After this story, the database can represent all of the following without duplicate auth accounts:

```text
auth.users
   |
   +-- user_profiles                 legacy compatibility / admin marker
   +-- customer_profiles             personal consumer data
   +-- professional_profiles (0..1) independent professional identity
   +-- salon_memberships (0..N)     relationship to businesses
            |
            +-- salons
```

Example supported identity:

```text
Aïcha / one auth user
  ├─ consumer context
  ├─ owns ProfessionalProfile "Aïcha Hair"
  ├─ professional member of Salon Élégance
  └─ owner/manager of Aïcha Beauty
```

No new login/account is required for any of these contexts.

## 3. Current database reality that MUST be preserved

Existing migrations already provide:

- `salons` from migration 01, including plan/quota/commerce-related fields;
- `user_profiles` from migration 02 with the legacy exclusive check `customer | salon | admin` and `salon_id`;
- `customer_profiles` from migration 04;
- existing subscription/payment/3D tables that reference `salons.id`.

Therefore migration 12 MUST NOT:

- drop or recreate `salons`;
- change existing salon IDs;
- remove `salons.plan`, quota or commerce fields;
- remove/change `user_profiles.role` yet;
- add a `professional` value to `user_profiles.role` as the new source of authority;
- migrate/backfill legacy users into memberships yet (Story 12.2 owns that work);
- require PostGIS yet (Story 13.4 owns geospatial columns/indexes);
- change existing subscription/payment or 3D ownership contracts.

`user_profiles.role` becomes a compatibility field during migration, not the future marketplace relationship model.

## 4. Target schema

### 4.1 `professional_profiles`

Create `public.professional_profiles`.

Required foundation fields:

```text
id uuid primary key default uuid_generate_v4()
user_id uuid unique not null -> auth.users(id) on delete cascade
slug text nullable
professional_name varchar(160) nullable
headline varchar(180) nullable
bio text nullable
operating_mode varchar(32) nullable
job_seeking_status varchar(24) not null default 'not_looking'
verification_status varchar(24) not null default 'unverified'
listing_status varchar(24) not null default 'draft'
service_radius_m integer nullable
city varchar(120) nullable
neighborhood varchar(160) nullable
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Constraints/checks:

- one `professional_profiles` row maximum per `auth.users` row;
- non-null slug must be unique, case-insensitively where implementation allows safely;
- `operating_mode` allowed values for foundation: `independent`, `mobile`, `studio`, `hybrid`, `salon_only`;
- `job_seeking_status`: `not_looking`, `open`, `actively_looking`;
- `verification_status`: `unverified`, `pending`, `verified`, `rejected`, `suspended`;
- `listing_status`: `draft`, `published`, `paused`, `suspended`;
- `service_radius_m` must be null or >= 0 and should have a defensible upper bound if one is introduced;
- no private exact home address belongs in this public-facing professional identity table;
- do NOT add `public_location geography(...)` in this migration. Add geospatial fields in Story 13.4.

Recommended relational hardening:

- add a unique constraint/index on `(id, user_id)` so a membership can optionally enforce that a referenced `professional_profile_id` belongs to the same membership `user_id` via composite FK.

### 4.2 Existing `salons` table — additive marketplace identity columns

Alter `public.salons`; do not recreate it.

Add only missing marketplace identity/listing fields needed by future stories, for example:

```text
slug text nullable
headline varchar(180) nullable
description text nullable
logo_url text nullable
verification_status varchar(24) not null default 'unverified'
listing_status varchar(24) not null default 'draft'
address_line1 text nullable
address_line2 text nullable
city varchar(120) nullable
neighborhood varchar(160) nullable
public_phone varchar(50) nullable
booking_confirmation_mode varchar(24) not null default 'manual'
```

Existing `phone`, `country`, `plan`, `quota_limit`, `quota_used`, `storage_used_bytes`, timestamps and all current FKs remain intact.

If a field duplicates legacy meaning (for example `phone` vs `public_phone`), do not silently rewrite production data in Story 12.1. Preserve the legacy column and document the future compatibility/backfill mapping for Story 12.2/appropriate profile story.

Checks:

- `verification_status`: `unverified`, `pending`, `verified`, `rejected`, `suspended`;
- `listing_status`: `draft`, `published`, `paused`, `suspended`;
- `booking_confirmation_mode`: at least `manual`, `auto`.

Do NOT add precise PostGIS location in 12.1.

### 4.3 `salon_memberships`

Create `public.salon_memberships` as the authoritative person-to-salon relationship table for the future model.

Required fields:

```text
id uuid primary key default uuid_generate_v4()
salon_id uuid not null -> salons(id) on delete cascade
user_id uuid not null -> auth.users(id) on delete cascade
professional_profile_id uuid nullable
role varchar(24) not null
status varchar(24) not null default 'invited'
permissions jsonb not null default '{}'::jsonb
started_at timestamptz nullable
ended_at timestamptz nullable
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Role values:

```text
owner
manager
professional
```

Membership status values:

```text
invited
active
suspended
ended
```

Required invariants:

1. one user can have memberships in multiple salons;
2. one salon can have multiple users;
3. historical ended memberships may be retained;
4. prevent duplicate simultaneously-live relationships for the same `(salon_id, user_id)` using an appropriate partial unique index for non-ended/live states;
5. if `professional_profile_id` is present, it must reference a ProfessionalProfile owned by the same `user_id`;
6. `ended_at` must be compatible with membership state where enforced;
7. JSON permissions are overrides/extension only; they are not a replacement for server authorization or the capability resolver planned in Story 12.5.

Recommended indexes:

```text
salon_memberships(user_id)
salon_memberships(salon_id)
salon_memberships(professional_profile_id) where professional_profile_id is not null
partial unique live membership index on (salon_id, user_id)
```

## 5. Ownership vs entitlement

Story 12.1 defines **identity and relationship**, not commercial entitlement.

Do not implement authorization such as:

```text
if user_profiles.role == 'salon' => marketplace permission
```

Future target is context-aware authorization:

```text
can(user, capability, { salonId })
```

Story 12.5 owns the commercial capability/entitlement resolver.

Story 12.1 may introduce small SQL identity helpers required to keep RLS non-recursive and auditable, but those helpers must not become an undeclared subscription resolver.

## 6. RLS/security contract

All new identity tables must enable Row Level Security.

### 6.1 `professional_profiles`

Foundation client policies:

- authenticated user can SELECT own professional profile;
- authenticated user can INSERT only a row whose `user_id = auth.uid()`;
- authenticated user can UPDATE only own row;
- no authenticated user can mutate another user's profile;
- no broad anonymous/public SELECT policy on the private table in this story;
- public listing projection/endpoints are Story 13.5.

### 6.2 `salon_memberships`

Foundation policies should be conservative:

- authenticated user may SELECT their own memberships;
- team-wide membership reads/writes may be exposed only when owner/manager authorization is implemented safely;
- direct client INSERT/UPDATE/DELETE should fail closed unless a dedicated safe invitation/membership path is explicitly implemented;
- service role retains trusted server capability.

Story 12.4 owns full team invitation/management behavior.

### 6.3 `salons`

Because `salons` predates RLS and current production flows depend on legacy ownership, do not introduce a breaking policy.

If Story 12.1 enables/changes RLS on `salons`, policies MUST preserve both temporary compatibility paths:

1. current legacy authorized salon account through `user_profiles.salon_id` / legacy role;
2. future active owner/manager/professional membership according to the least privileges required.

No anonymous policy may expose the entire private `salons` row. Public salon data must later use a constrained projection/API in Story 13.5.

Admin/service-role behavior must remain intact.

### 6.4 SQL helper safety

Any `SECURITY DEFINER` helper used for RLS must:

- use `SET search_path = public` or a safer explicit path;
- validate `auth.uid()`/arguments rather than trust client-supplied role strings;
- expose the smallest required result;
- avoid RLS recursion;
- revoke unnecessary PUBLIC execution when appropriate and grant only required roles.

## 7. Migration design

Create:

`web/supabase/migrations/12_marketplace_identity_foundation.sql`

Migration must be additive/idempotent in repository convention where practical:

1. create `professional_profiles`;
2. add marketplace columns/checks/indexes to existing `salons`;
3. create `salon_memberships`;
4. add ownership-consistency constraints/indexes;
5. enable/configure RLS for new tables and safe salon compatibility if required;
6. add only minimal helper functions required for safe identity RLS;
7. include comments/validation queries at the bottom or in companion verification docs.

Do not perform legacy data backfill in this migration except harmless structural defaults automatically required by `ALTER TABLE ... ADD COLUMN ... DEFAULT` behavior. Story 12.2 will explicitly create/validate legacy owner memberships.

## 8. Compatibility invariants

After migration 12, before Story 12.2:

- all existing salon IDs are unchanged;
- current subscriptions still reference valid salons;
- current `clients_heads.salon_id` still references valid salons;
- current payment transactions still reference valid salons;
- existing admins retain `user_profiles.role = 'admin'`;
- existing salon users retain legacy `role/salon_id` compatibility;
- existing customers remain customers;
- existing B2C credit wallets/heads remain untouched;
- no user is forced to have a ProfessionalProfile;
- marketplace relationship tables may initially be empty;
- current application can still boot and existing P0/P1 critical flows can still run.

## 9. Required validation scenarios

### Schema

- professional profile can be created for user A;
- second ProfessionalProfile for user A is rejected;
- user A and user B can each have independent profiles;
- salon existing before migration still exists with same ID and plan/quota values;
- membership supports owner/manager/professional roles;
- one user can have active memberships in salon A and salon B;
- salon A can have several active members;
- duplicate live membership for same `(salon, user)` is rejected;
- ended historical membership does not prevent a valid future relationship according to chosen invariant;
- a membership cannot attach user A to a ProfessionalProfile owned by user B.

### RLS/security

Using authenticated user contexts or equivalent integration tests:

- user A can read/update own professional profile;
- user A cannot read private professional row B through private-table policies;
- user A cannot update professional row B;
- user A can read own memberships;
- unrelated user cannot enumerate another user's private memberships;
- unauthenticated user cannot enumerate private profiles/memberships/private salon rows;
- legacy salon user retains required current access path until Story 12.2 completes migration;
- cross-salon unauthorized mutation fails.

### Regression

At minimum rerun repository checks that cover:

- Supabase/schema invariants;
- TypeScript/build where schema-generated types or application contracts are touched;
- current customer auth/dashboard;
- current salon dashboard/auth path;
- current admin auth path;
- payment/credit critical invariants;
- existing 3D ownership/security smoke tests.

## 10. Suggested verification SQL

Exact SQL may adapt to implementation names, but the migration/review should be able to prove equivalent checks.

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('professional_profiles', 'salon_memberships')
order by table_name;
```

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'salons'
  and column_name in (
    'slug',
    'verification_status',
    'listing_status',
    'city',
    'neighborhood'
  )
order by column_name;
```

```sql
select relname, relrowsecurity
from pg_class
where relname in ('professional_profiles', 'salon_memberships', 'salons');
```

Validation must also compare pre/post counts and IDs for legacy `salons`, `subscriptions`, `clients_heads` and relevant payment references in a migration test fixture.

## 11. Files expected to change

Primary:

- `web/supabase/migrations/12_marketplace_identity_foundation.sql`

Potentially, only if the repository requires them for compilation/tests:

- generated/handwritten Supabase DB types;
- schema invariant test script;
- migration documentation;
- story review artifact after implementation;
- marketplace sprint status.

Do not refactor landing/dashboard UI in Story 12.1.

## 12. Explicit out of scope

Not part of Story 12.1:

- backfilling legacy salon owners into memberships — 12.2;
- professional onboarding UI — 12.3;
- salon creation/invitations/team UI — 12.4;
- capability/subscription resolver — 12.5;
- pricing/catalog changes — 12.6;
- authenticated context-switching shell/bottom nav — 12.7 UX V2 amendment;
- taxonomy/services — Epic 13;
- PostGIS/geolocation — 13.4;
- public provider pages — 13.5;
- booking — Epic 14;
- reviews/verification workflow — Epic 15.

## 13. Definition of done

Story 12.1 is done only when:

- migration 12 exists and applies cleanly after migrations 01–11 in a fresh/test environment;
- migration preserves current salon/payment/3D relationships;
- all new private identity tables are protected by RLS;
- required constraints prevent invalid cross-user/cross-salon relationships;
- tests demonstrate multi-context identity is structurally possible;
- no legacy role or salon data is destructively removed;
- existing critical CI/security checks pass;
- a BMAD review artifact records evidence and remaining deferred work;
- marketplace sprint status is updated only after evidence exists.

## 14. Developer guardrail summary

The key implementation rule is:

> **Add the future identity model beside the legacy role model; do not replace the legacy model in Story 12.1.**

The second rule is:

> **A ProfessionalProfile is an optional identity owned by a person; a SalonMembership is a relationship; neither is a new login nor a mutually exclusive global role.**
