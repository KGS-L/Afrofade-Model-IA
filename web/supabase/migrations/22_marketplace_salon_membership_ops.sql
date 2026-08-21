-- Afrofade Database Migration 22: salon creation + membership invitation operations
-- BMAD Story 12.4

CREATE TABLE IF NOT EXISTS public.salon_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
    invited_email TEXT NOT NULL,
    role VARCHAR(24) NOT NULL CHECK (role IN ('manager', 'professional')),
    status VARCHAR(24) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT salon_invitations_email_check CHECK (position('@' IN invited_email) > 1),
    CONSTRAINT salon_invitations_expiry_check CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_salon_invitations_salon_id ON public.salon_invitations(salon_id);
CREATE INDEX IF NOT EXISTS idx_salon_invitations_invited_email_ci ON public.salon_invitations(LOWER(invited_email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_salon_invitations_one_pending_email
    ON public.salon_invitations(salon_id, LOWER(invited_email))
    WHERE status = 'pending';

ALTER TABLE public.salon_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.salon_invitations FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.salon_invitations TO service_role;

CREATE OR REPLACE FUNCTION public.marketplace_can_manage_salon(
    p_actor_user_id UUID,
    p_salon_id UUID
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.salon_memberships sm
        WHERE sm.user_id = p_actor_user_id
          AND sm.salon_id = p_salon_id
          AND sm.status = 'active'
          AND sm.role IN ('owner', 'manager')
    );
$$;

CREATE OR REPLACE FUNCTION public.create_marketplace_salon(
    p_actor_user_id UUID,
    p_name TEXT,
    p_country TEXT,
    p_phone TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_salon public.salons%ROWTYPE;
    v_membership_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_actor_user_id) THEN
        RAISE EXCEPTION 'actor_user_not_found';
    END IF;
    IF COALESCE(btrim(p_name), '') = '' THEN RAISE EXCEPTION 'salon_name_required'; END IF;
    IF COALESCE(btrim(p_country), '') = '' THEN RAISE EXCEPTION 'salon_country_required'; END IF;
    IF COALESCE(btrim(p_phone), '') = '' THEN RAISE EXCEPTION 'salon_phone_required'; END IF;

    INSERT INTO public.salons(name, country, phone, public_phone)
    VALUES (left(btrim(p_name), 255), left(btrim(p_country), 100), left(btrim(p_phone), 50), left(btrim(p_phone), 50))
    RETURNING * INTO v_salon;

    INSERT INTO public.salon_memberships(salon_id, user_id, role, status, started_at)
    VALUES (v_salon.id, p_actor_user_id, 'owner', 'active', NOW())
    RETURNING id INTO v_membership_id;

    RETURN jsonb_build_object(
        'salon_id', v_salon.id,
        'membership_id', v_membership_id,
        'role', 'owner',
        'status', 'active'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_salon_invitation(
    p_actor_user_id UUID,
    p_salon_id UUID,
    p_invited_email TEXT,
    p_role TEXT,
    p_token_hash TEXT,
    p_expires_at TIMESTAMPTZ
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_role TEXT;
    v_invitation_id UUID;
BEGIN
    SELECT role INTO v_actor_role
    FROM public.salon_memberships
    WHERE user_id = p_actor_user_id
      AND salon_id = p_salon_id
      AND status = 'active'
      AND role IN ('owner', 'manager')
    LIMIT 1;

    IF v_actor_role IS NULL THEN RAISE EXCEPTION 'salon_manage_forbidden'; END IF;
    IF p_role NOT IN ('manager', 'professional') THEN RAISE EXCEPTION 'invitation_role_invalid'; END IF;
    IF v_actor_role = 'manager' AND p_role = 'manager' THEN
        RAISE EXCEPTION 'manager_cannot_grant_manager';
    END IF;
    IF COALESCE(btrim(p_invited_email), '') = '' OR position('@' IN p_invited_email) <= 1 THEN
        RAISE EXCEPTION 'invitation_email_invalid';
    END IF;
    IF COALESCE(btrim(p_token_hash), '') = '' THEN RAISE EXCEPTION 'invitation_token_required'; END IF;
    IF p_expires_at IS NULL OR p_expires_at <= NOW() THEN RAISE EXCEPTION 'invitation_expiry_invalid'; END IF;

    INSERT INTO public.salon_invitations(
        salon_id, invited_email, role, invited_by, token_hash, expires_at
    ) VALUES (
        p_salon_id, lower(btrim(p_invited_email)), p_role, p_actor_user_id, p_token_hash, p_expires_at
    )
    ON CONFLICT (salon_id, lower(invited_email)) WHERE status = 'pending'
    DO UPDATE SET
        role = EXCLUDED.role,
        invited_by = EXCLUDED.invited_by,
        token_hash = EXCLUDED.token_hash,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW()
    RETURNING id INTO v_invitation_id;

    RETURN jsonb_build_object('invitation_id', v_invitation_id, 'salon_id', p_salon_id, 'role', p_role);
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_salon_invitation(
    p_actor_user_id UUID,
    p_actor_email TEXT,
    p_token_hash TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inv public.salon_invitations%ROWTYPE;
    v_membership public.salon_memberships%ROWTYPE;
BEGIN
    SELECT * INTO v_inv
    FROM public.salon_invitations
    WHERE token_hash = p_token_hash
    FOR UPDATE;

    IF NOT FOUND THEN RAISE EXCEPTION 'invitation_not_found'; END IF;
    IF v_inv.status <> 'pending' THEN RAISE EXCEPTION 'invitation_not_pending'; END IF;
    IF v_inv.expires_at <= NOW() THEN
        UPDATE public.salon_invitations SET status='expired', updated_at=NOW() WHERE id=v_inv.id;
        RAISE EXCEPTION 'invitation_expired';
    END IF;
    IF lower(btrim(COALESCE(p_actor_email,''))) <> lower(v_inv.invited_email) THEN
        RAISE EXCEPTION 'invitation_email_mismatch';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_actor_user_id) THEN
        RAISE EXCEPTION 'actor_user_not_found';
    END IF;

    INSERT INTO public.salon_memberships(salon_id, user_id, role, status, started_at)
    VALUES(v_inv.salon_id, p_actor_user_id, v_inv.role, 'active', NOW())
    ON CONFLICT (salon_id, user_id) WHERE status <> 'ended'
    DO UPDATE SET
        role = CASE WHEN public.salon_memberships.role = 'owner' THEN 'owner' ELSE EXCLUDED.role END,
        status = 'active',
        ended_at = NULL,
        started_at = COALESCE(public.salon_memberships.started_at, NOW()),
        updated_at = NOW()
    RETURNING * INTO v_membership;

    UPDATE public.salon_invitations
    SET status='accepted', accepted_by=p_actor_user_id, accepted_at=NOW(), updated_at=NOW()
    WHERE id=v_inv.id;

    RETURN jsonb_build_object(
        'salon_id', v_membership.salon_id,
        'membership_id', v_membership.id,
        'role', v_membership.role,
        'status', v_membership.status
    );
END;
$$;

REVOKE ALL ON FUNCTION public.marketplace_can_manage_salon(UUID,UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_marketplace_salon(UUID,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_salon_invitation(UUID,UUID,TEXT,TEXT,TEXT,TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.accept_salon_invitation(UUID,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_can_manage_salon(UUID,UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_marketplace_salon(UUID,TEXT,TEXT,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_salon_invitation(UUID,UUID,TEXT,TEXT,TEXT,TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.accept_salon_invitation(UUID,TEXT,TEXT) TO service_role;
