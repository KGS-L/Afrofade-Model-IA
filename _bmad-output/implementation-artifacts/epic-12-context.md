# Epic 12 Context: Identity, Professional Profiles, Salons & Entitlements

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Replace the unsafe conceptual `user == salon` assumption with durable people/business/membership relationships while preserving existing users and production data.

## Stories

- Story 12.1: Marketplace identity schema
- Story 12.2: Legacy salon backfill & compatibility
- Story 12.3: ProfessionalProfile domain + onboarding
- Story 12.4: Salon entity, memberships & multi-location dashboard context
- Story 12.5: Capability / entitlement resolver
- Story 12.6: Marketplace plan catalog compatibility

## Requirements & Constraints

- Preserve all existing customer, salon, and admin accounts without data loss or breaking changes.
- Ensure strict multi-tenant RLS isolation: public fields must not be exposed through private table SELECT policies.
- Salon ownership is represented through `salon_memberships` (roles: `owner`, `manager`, `professional`), not a single `user_profiles.salon_id` or `salons.owner_user_id` column.
- Support multi-salon memberships per user and multi-authorized members per salon.
- Entitlements and capabilities are resolved dynamically server-side based on admin grants, personal professional entitlements, active membership, and salon plan limits.

## Technical Decisions

- Identity separation: `professional_profiles` has unique `user_id` referencing `auth.users`.
- Memberships table: `salon_memberships` (`user_id`, `salon_id`, `role`, `state`, `created_at`).
- Database migrations must be idempotent, backwards-compatible, and include validation queries.
- Client-supplied role, plan, or price cannot grant capability server-side.

## Cross-Story Dependencies

- Story 12.1 provides the foundational database schema required by 12.2 (backfill), 12.3 (professional onboarding), 12.4 (salon memberships), 12.5 (capability resolver), and 12.6 (plan catalog).
