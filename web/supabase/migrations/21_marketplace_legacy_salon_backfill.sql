-- Afrofade Database Migration 21: legacy salon -> marketplace membership compatibility
-- BMAD Story 12.2

-- Upgrade/create the authoritative compatibility membership for every legacy
-- salon account that still points at a concrete salon. Legacy role/salon_id remain
-- untouched until the marketplace model is fully proven.
INSERT INTO public.salon_memberships (
    salon_id,
    user_id,
    professional_profile_id,
    role,
    status,
    started_at,
    ended_at,
    created_at,
    updated_at
)
SELECT
    up.salon_id,
    up.user_id,
    NULL,
    'owner',
    'active',
    COALESCE(up.created_at, NOW()),
    NULL,
    NOW(),
    NOW()
FROM public.user_profiles up
WHERE up.role = 'salon'
  AND up.salon_id IS NOT NULL
ON CONFLICT (salon_id, user_id) WHERE status <> 'ended'
DO UPDATE SET
    role = 'owner',
    status = 'active',
    started_at = COALESCE(public.salon_memberships.started_at, EXCLUDED.started_at, NOW()),
    ended_at = NULL,
    updated_at = NOW();

-- A service-only validation view makes migration drift observable without exposing
-- private membership data to normal clients.
CREATE OR REPLACE VIEW public.marketplace_legacy_backfill_report AS
SELECT
    (SELECT COUNT(*)::BIGINT
     FROM public.user_profiles
     WHERE role = 'salon') AS legacy_salon_users,
    (SELECT COUNT(*)::BIGINT
     FROM public.user_profiles
     WHERE role = 'salon' AND salon_id IS NOT NULL) AS legacy_salon_users_with_salon,
    (SELECT COUNT(*)::BIGINT
     FROM public.user_profiles
     WHERE role = 'salon' AND salon_id IS NULL) AS unmatched_legacy_salon_users,
    (SELECT COUNT(*)::BIGINT
     FROM public.user_profiles up
     WHERE up.role = 'salon'
       AND up.salon_id IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM public.salon_memberships sm
           WHERE sm.user_id = up.user_id
             AND sm.salon_id = up.salon_id
             AND sm.role = 'owner'
             AND sm.status = 'active'
       )) AS migrated_active_owner_memberships,
    (SELECT COUNT(*)::BIGINT
     FROM public.user_profiles up
     WHERE up.role = 'salon'
       AND up.salon_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1
           FROM public.salon_memberships sm
           WHERE sm.user_id = up.user_id
             AND sm.salon_id = up.salon_id
             AND sm.role = 'owner'
             AND sm.status = 'active'
       )) AS missing_owner_memberships;

REVOKE ALL ON TABLE public.marketplace_legacy_backfill_report FROM PUBLIC;
REVOKE ALL ON TABLE public.marketplace_legacy_backfill_report FROM anon, authenticated;
GRANT SELECT ON TABLE public.marketplace_legacy_backfill_report TO service_role;

COMMENT ON VIEW public.marketplace_legacy_backfill_report IS
    'Story 12.2 compatibility validation counts. Service-role only.';
