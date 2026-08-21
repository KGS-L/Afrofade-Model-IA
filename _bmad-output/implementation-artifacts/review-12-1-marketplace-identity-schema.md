---
title: "Review — Story 12.1 Marketplace Identity Schema"
status: implementation-complete-awaiting-ci
created: 2026-08-21
updated: 2026-08-21
story: 12.1-marketplace-identity-schema
pr: 15
---

# Review — Story 12.1 Marketplace Identity Schema

## Scope implemented

Story 12.1 has been implemented additively on `agent/bmad-ui-ux-future-marketplace`.

Changed runtime/test files:

- `web/supabase/migrations/12_marketplace_identity_foundation.sql`
- `scripts/check_marketplace_identity_contract.py`
- `web/supabase/tests/12_marketplace_identity_foundation.sql`
- `.github/workflows/marketplace-identity-contract.yml`
- `.github/workflows/marketplace-identity-postgres.yml`

Draft PR: `#15`.

## Implementation evidence

### Marketplace identity

- `professional_profiles` is one-per-auth-user and remains optional;
- professional operating/listing/verification/job-seeking states are constrained;
- private exact home address and PostGIS fields are intentionally absent;
- professional slugs are case-insensitively unique when present.

### Existing salons preserved

- the pre-existing `salons` table is altered, not recreated;
- marketplace identity/listing/address-display columns are additive;
- existing plan/quota/storage/phone/country/id fields are untouched;
- Story 12.1 does not backfill or rewrite legacy salon ownership;
- existing salons RLS state is intentionally not changed before Story 12.2 compatibility backfill.

### Membership relationship

- `salon_memberships` supports owner/manager/professional;
- one user can belong to multiple salons;
- one salon can contain multiple users;
- only one non-ended relationship may exist for a `(salon_id, user_id)` pair;
- ended historical membership may coexist with a later active relationship;
- optional `professional_profile_id` ownership is validated against membership `user_id` by a database trigger;
- permissions JSON must be an object and is not treated as the commercial entitlement resolver.

### RLS foundation

- RLS enabled on `professional_profiles` and `salon_memberships`;
- authenticated users can select/insert/update only their own ProfessionalProfile through policies;
- authenticated users can select only their own memberships;
- authenticated direct membership mutation remains closed until Story 12.4;
- anon table access is explicitly revoked;
- no broad public listing policy is introduced before Story 13.5.

## Validation added

### Static contract

`scripts/check_marketplace_identity_contract.py` verifies:

- no destructive `salons` replacement;
- no legacy role expansion to a global `professional` role;
- no PostGIS scope leak;
- required tables/constraints/indexes/RLS policies exist;
- membership mutation remains closed in Story 12.1.

### PostgreSQL transactional contract

`web/supabase/tests/12_marketplace_identity_foundation.sql` runs the real migration against a representative pre-12 PostgreSQL baseline in a transaction and checks:

- legacy salon ID/plan/quota preservation;
- legacy admin/salon role preservation;
- subscription/client-head/payment salon foreign-key continuity;
- one professional profile per user;
- multi-salon user membership;
- multi-user salon membership;
- duplicate live membership rejection;
- cross-user ProfessionalProfile attachment rejection;
- ended-history + rejoin behavior;
- RLS enabled on new private identity tables;
- anon ACL closure;
- authenticated membership INSERT remains closed;
- own-row RLS filtering through an emulated `auth.uid()`.

Dedicated workflows were added for the static and PostgreSQL contracts.

## Review status

Implementation is complete, but this review is **not yet approved/done** because the branch has not yet produced observable GitHub Actions results through the connector after PR creation.

A draft PR was opened specifically so CI can validate the branch without merging it.

## Remaining gate before Story 12.1 = done

1. GitHub Actions checks must run and pass, including the new marketplace identity contracts and existing critical CI checks.
2. If CI finds SQL/runtime incompatibility, fix it in 12.1 before moving the implementation tracker to done.
3. Applying migration 12 to the real production Supabase project is a deployment operation and must not be assumed from repository CI alone.

## Explicitly deferred

- legacy owner membership backfill: Story 12.2;
- professional onboarding UI: Story 12.3;
- team/invitation mutations: Story 12.4;
- capability/entitlement resolver: Story 12.5;
- workspace context switcher: Story 12.7;
- PostGIS: Story 13.4;
- public listing projections: Story 13.5.
