---
title: 'Story 12.1 — Marketplace Identity Schema Foundation'
type: 'feature'
created: '2026-08-21'
status: 'done'
baseline_commit: '7a03c23509cf57df39cb590927f072c99736dffe'
review_loop_iteration: 0
context: ['_bmad-output/implementation-artifacts/epic-12-context.md']
---

## Intent

**Problem:** The existing system assumes a 1:1 conceptual mapping between a user account and a single salon, making it impossible to support independent hair professionals, multi-salon owners, or staff members across multiple locations.

**Approach:** Introduce `professional_profiles` and `salon_memberships` tables with RLS policies, enums, checks, and indexes to decouple identity from salon entities while maintaining 100% backwards compatibility with existing user and salon accounts.

## Boundaries & Constraints

**Always:**
- Ensure all migrations are idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `DROP POLICY IF EXISTS`).
- Enforce multi-tenant Row Level Security (RLS) on `professional_profiles` and `salon_memberships`.
- Represent salon ownership via `salon_memberships` (`role = 'owner'`) rather than single-column foreign keys on `user_profiles`.

**Ask First:**
- Dropping any legacy columns or modifying existing foreign keys in production tables (`user_profiles`, `salons`, `customer_profiles`).

**Never:**
- Allow unauthorized cross-tenant SELECT or UPDATE access through overly broad RLS policies.
- Break existing customer, salon, or admin authentication and dashboard operations.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Single User Multi-Salon | User with 2 active salon memberships (`owner` in Salon A, `professional` in Salon B) | Both memberships stored in `salon_memberships`, accessible via RLS to user | Forbidden cross-salon edits rejected by RLS |
| Independent Professional | User creates `professional_profiles` record without any `salon_memberships` | Profile saved with `operating_mode = 'independent'`, visible publicly only when `published` | Public query for `draft` or `suspended` profile returns zero rows |
| Forged Membership Insert | Non-owner user attempts `INSERT INTO salon_memberships` for another user/salon | Transaction aborted by RLS `WITH CHECK` constraint | SQL execution error / RLS violation |

## Code Map

- `web/supabase/migrations/13_marketplace_identity_foundation.sql` -- New migration script creating `professional_profiles`, `salon_memberships`, enums, indexes, and RLS policies.
- `web/src/lib/types/marketplace.ts` -- TypeScript type definitions for `ProfessionalProfile`, `SalonMembership`, roles, and states.

## Tasks & Acceptance

**Execution:**
- [x] `web/supabase/migrations/13_marketplace_identity_foundation.sql` -- Create migration for `professional_profiles` and `salon_memberships` tables, constraints, indexes, and RLS policies -- Foundation for multi-tenant marketplace identity.
- [x] `web/src/lib/types/marketplace.ts` -- Add TypeScript interfaces matching the database schema -- Type safety for marketplace entity operations.

**Acceptance Criteria:**
- Given migration `13_marketplace_identity_foundation.sql` applied, when querying database schema, then `professional_profiles` and `salon_memberships` tables exist with unique constraints and indexes.
- Given an authenticated user, when inserting into `professional_profiles` with own `user_id`, then insert succeeds; when inserting with another `user_id`, then RLS rejects the write.
- Given a user with memberships across multiple salons, when selecting `salon_memberships`, then only authorized memberships for that user/salon are returned.

## Verification

**Commands:**
- `python3 scripts/check_p0_invariants.py` -- expected: Security + role-dashboard invariants pass 41/41
- `./web/node_modules/.bin/tsc --noEmit --project web/tsconfig.json` -- expected: Zero TypeScript errors

## Suggested Review Order

**Fondation du schéma d'identité & RLS**

- Migration PostgreSQL créant les tables `professional_profiles`, `salon_memberships`, enums, index et politiques RLS multi-tenant
  [`13_marketplace_identity_foundation.sql:1`](../../web/supabase/migrations/13_marketplace_identity_foundation.sql#L1)

**Types TypeScript & Contrats d'interfaces**

- Interfaces et types TypeScript décrivant les entités de l'identité marketplace
  [`marketplace.ts:1`](../../web/src/lib/types/marketplace.ts#L1)

