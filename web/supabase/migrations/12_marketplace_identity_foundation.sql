-- Afrofade Database Migration 12: marketplace identity foundation
-- BMAD Story 12.1 — additive identity model beside legacy customer/salon/admin roles.
--
-- IMPORTANT:
-- - This migration does NOT backfill legacy salon users into memberships (Story 12.2).
-- - This migration does NOT introduce PostGIS/geospatial columns (Story 13.4).
-- - This migration does NOT remove or broaden user_profiles.role.
-- - Existing salon IDs, subscriptions, quotas, payments and 3D ownership contracts remain intact.

-- -----------------------------------------------------------------------------
-- 1. Professional identity owned by one authenticated user
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.professional_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    slug TEXT,
    professional_name VARCHAR(160),
    headline VARCHAR(180),
    bio TEXT,
    operating_mode VARCHAR(32),
    job_seeking_status VARCHAR(24) NOT NULL DEFAULT 'not_looking',
    verification_status VARCHAR(24) NOT NULL DEFAULT 'unverified',
    listing_status VARCHAR(24) NOT NULL DEFAULT 'draft',
    service_radius_m INTEGER,
    city VARCHAR(120),
    neighborhood VARCHAR(160),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT professional_profiles_operating_mode_check
        CHECK (
            operating_mode IS NULL
            OR operating_mode IN ('independent', 'mobile', 'studio', 'hybrid', 'salon_only')
        ),
    CONSTRAINT professional_profiles_job_seeking_status_check
        CHECK (job_seeking_status IN ('not_looking', 'open', 'actively_looking')),
    CONSTRAINT professional_profiles_verification_status_check
        CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected', 'suspended')),
    CONSTRAINT professional_profiles_listing_status_check
        CHECK (listing_status IN ('draft', 'published', 'paused', 'suspended')),
    CONSTRAINT professional_profiles_service_radius_check
        CHECK (service_radius_m IS NULL OR service_radius_m BETWEEN 0 AND 500000)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_professional_profiles_slug_ci
    ON public.professional_profiles (LOWER(slug))
    WHERE slug IS NOT NULL;

-- This pair is deliberately unique so future relationship constraints may refer to
-- both the profile id and its owning user without trusting client-supplied ownership.
CREATE UNIQUE INDEX IF NOT EXISTS idx_professional_profiles_id_user_unique
    ON public.professional_profiles (id, user_id);

CREATE INDEX IF NOT EXISTS idx_professional_profiles_user_id
    ON public.professional_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_listing_status
    ON public.professional_profiles (listing_status);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_verification_status
    ON public.professional_profiles (verification_status);

-- -----------------------------------------------------------------------------
-- 2. Extend the existing salons table without recreating or rewriting legacy data
-- -----------------------------------------------------------------------------

ALTER TABLE public.salons
    ADD COLUMN IF NOT EXISTS slug TEXT,
    ADD COLUMN IF NOT EXISTS headline VARCHAR(180),
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS verification_status VARCHAR(24) NOT NULL DEFAULT 'unverified',
    ADD COLUMN IF NOT EXISTS listing_status VARCHAR(24) NOT NULL DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS address_line1 TEXT,
    ADD COLUMN IF NOT EXISTS address_line2 TEXT,
    ADD COLUMN IF NOT EXISTS city VARCHAR(120),
    ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(160),
    ADD COLUMN IF NOT EXISTS public_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS booking_confirmation_mode VARCHAR(24) NOT NULL DEFAULT 'manual';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'salons_verification_status_check'
          AND conrelid = 'public.salons'::regclass
    ) THEN
        ALTER TABLE public.salons
            ADD CONSTRAINT salons_verification_status_check
            CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected', 'suspended'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'salons_listing_status_check'
          AND conrelid = 'public.salons'::regclass
    ) THEN
        ALTER TABLE public.salons
            ADD CONSTRAINT salons_listing_status_check
            CHECK (listing_status IN ('draft', 'published', 'paused', 'suspended'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'salons_booking_confirmation_mode_check'
          AND conrelid = 'public.salons'::regclass
    ) THEN
        ALTER TABLE public.salons
            ADD CONSTRAINT salons_booking_confirmation_mode_check
            CHECK (booking_confirmation_mode IN ('manual', 'auto'));
    END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_salons_slug_ci
    ON public.salons (LOWER(slug))
    WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_salons_listing_status
    ON public.salons (listing_status);
CREATE INDEX IF NOT EXISTS idx_salons_verification_status
    ON public.salons (verification_status);

-- Story 12.1 intentionally leaves the pre-existing salons RLS state unchanged.
-- Story 12.2/12.4 will migrate legacy ownership and introduce context-aware salon
-- access only after compatibility memberships have been created and validated.

-- -----------------------------------------------------------------------------
-- 3. Person-to-salon relationship model
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.salon_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    professional_profile_id UUID REFERENCES public.professional_profiles(id) ON DELETE SET NULL,
    role VARCHAR(24) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'invited',
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT salon_memberships_role_check
        CHECK (role IN ('owner', 'manager', 'professional')),
    CONSTRAINT salon_memberships_status_check
        CHECK (status IN ('invited', 'active', 'suspended', 'ended')),
    CONSTRAINT salon_memberships_permissions_object_check
        CHECK (jsonb_typeof(permissions) = 'object'),
    CONSTRAINT salon_memberships_ended_at_check
        CHECK (
            (status = 'ended' AND ended_at IS NOT NULL)
            OR (status <> 'ended' AND ended_at IS NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_salon_memberships_user_id
    ON public.salon_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_salon_memberships_salon_id
    ON public.salon_memberships (salon_id);
CREATE INDEX IF NOT EXISTS idx_salon_memberships_professional_profile_id
    ON public.salon_memberships (professional_profile_id)
    WHERE professional_profile_id IS NOT NULL;

-- Keep at most one non-ended relationship between a person and a salon while
-- preserving ended membership history and allowing a later rejoin.
CREATE UNIQUE INDEX IF NOT EXISTS idx_salon_memberships_live_user
    ON public.salon_memberships (salon_id, user_id)
    WHERE status <> 'ended';

-- Enforce that a membership can never attach user A to user B's professional
-- profile. A trigger is used instead of a cascading composite FK so deleting a
-- professional profile can safely null only professional_profile_id while keeping
-- historical salon membership data.
CREATE OR REPLACE FUNCTION public.enforce_membership_professional_ownership()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.professional_profile_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.professional_profiles p
        WHERE p.id = NEW.professional_profile_id
          AND p.user_id = NEW.user_id
    ) THEN
        RAISE EXCEPTION 'membership_professional_profile_owner_mismatch';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_membership_professional_ownership
    ON public.salon_memberships;
CREATE TRIGGER trg_membership_professional_ownership
    BEFORE INSERT OR UPDATE OF user_id, professional_profile_id
    ON public.salon_memberships
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_membership_professional_ownership();

-- Keep updated_at deterministic for the two new marketplace identity tables.
CREATE OR REPLACE FUNCTION public.touch_marketplace_identity_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_professional_profiles_updated_at
    ON public.professional_profiles;
CREATE TRIGGER trg_professional_profiles_updated_at
    BEFORE UPDATE ON public.professional_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_marketplace_identity_updated_at();

DROP TRIGGER IF EXISTS trg_salon_memberships_updated_at
    ON public.salon_memberships;
CREATE TRIGGER trg_salon_memberships_updated_at
    BEFORE UPDATE ON public.salon_memberships
    FOR EACH ROW
    EXECUTE FUNCTION public.touch_marketplace_identity_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Conservative private-table RLS foundation
-- -----------------------------------------------------------------------------

ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS professional_profiles_select_own
    ON public.professional_profiles;
CREATE POLICY professional_profiles_select_own
    ON public.professional_profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS professional_profiles_insert_own
    ON public.professional_profiles;
CREATE POLICY professional_profiles_insert_own
    ON public.professional_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS professional_profiles_update_own
    ON public.professional_profiles;
CREATE POLICY professional_profiles_update_own
    ON public.professional_profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS salon_memberships_select_own
    ON public.salon_memberships;
CREATE POLICY salon_memberships_select_own
    ON public.salon_memberships
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Direct membership mutation intentionally fails closed for authenticated clients.
-- Story 12.4 will add safe invitation/management RPCs and owner/manager capability
-- checks. Trusted service-role code continues to bypass RLS.

REVOKE ALL ON TABLE public.professional_profiles FROM anon;
REVOKE ALL ON TABLE public.salon_memberships FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.professional_profiles TO authenticated;
GRANT SELECT ON TABLE public.salon_memberships TO authenticated;
GRANT ALL ON TABLE public.professional_profiles TO service_role;
GRANT ALL ON TABLE public.salon_memberships TO service_role;

-- Trigger helpers do not need to be client-invokable directly.
REVOKE ALL ON FUNCTION public.enforce_membership_professional_ownership() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.touch_marketplace_identity_updated_at() FROM PUBLIC;

COMMENT ON TABLE public.professional_profiles IS
    'Optional marketplace professional identity owned by one auth user; not a global login role.';
COMMENT ON TABLE public.salon_memberships IS
    'Authoritative future user-to-salon relationship. Legacy user_profiles.salon_id remains compatibility-only until Story 12.2.';
COMMENT ON COLUMN public.salon_memberships.permissions IS
    'Optional permission overrides metadata; commercial capabilities remain server-authoritative in Story 12.5.';

-- -----------------------------------------------------------------------------
-- 5. Manual verification queries (run after migrations 01-12)
-- -----------------------------------------------------------------------------
--
-- SELECT table_name
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN ('professional_profiles', 'salon_memberships')
-- ORDER BY table_name;
--
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'salons'
--   AND column_name IN (
--     'slug', 'verification_status', 'listing_status', 'city',
--     'neighborhood', 'booking_confirmation_mode'
--   )
-- ORDER BY column_name;
--
-- SELECT relname, relrowsecurity
-- FROM pg_class
-- WHERE relname IN ('professional_profiles', 'salon_memberships', 'salons');
--
-- Story 12.2 must additionally compare legacy salon/subscription/client-head/payment
-- IDs and counts before creating compatibility owner memberships.
