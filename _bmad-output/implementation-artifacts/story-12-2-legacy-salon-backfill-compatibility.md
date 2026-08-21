---
title: "Story 12.2 — Legacy Salon Backfill & Compatibility"
status: in-dev
epic: 12
priority: M1-2
migration: web/supabase/migrations/21_marketplace_legacy_salon_backfill.sql
---

# Story 12.2 — Legacy Salon Backfill & Compatibility

## Goal
Migrate the authoritative legacy relation `user_profiles.role='salon' + salon_id` into the new `salon_memberships` model without removing legacy compatibility or changing existing salon/business/commerce IDs.

## Rules
- legacy salon user with non-null `salon_id` becomes active `owner` membership for that exact salon;
- rerunning is idempotent;
- an existing live membership for the same user/salon is upgraded to `owner/active`, not duplicated;
- ended history remains historical and may coexist with the newly active compatibility membership;
- `user_profiles.role` and `user_profiles.salon_id` remain untouched;
- admins/customers are not converted;
- `role='salon'` with null `salon_id` is reported as unmatched and not guessed;
- no salon/subscription/payment/3D row is recreated;
- no professional profile is manufactured by the backfill.

## Evidence required
- transactional PostgreSQL contract proves exact IDs and counts survive;
- legacy salon users receive owner memberships;
- rerun produces no duplicates;
- pre-existing live membership upgrade works;
- unmatched legacy salon users are observable;
- CI stays green before story is marked done.
