-- Afrofade Database Migration 23: context-aware marketplace capabilities
-- BMAD Story 12.5

CREATE TABLE IF NOT EXISTS public.professional_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_profile_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL DEFAULT 'PROFESSIONAL_PRO',
    provider TEXT NOT NULL DEFAULT 'manual',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired','cancelled')),
    payment_transaction_id UUID REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT professional_subscriptions_profile_owner_fk
        FOREIGN KEY (professional_profile_id, user_id)
        REFERENCES public.professional_profiles(id, user_id)
        ON DELETE CASCADE,
    CONSTRAINT professional_subscriptions_expiry_check
        CHECK (expires_at IS NULL OR starts_at IS NULL OR expires_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_professional_subscriptions_profile_status
    ON public.professional_subscriptions(professional_profile_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_professional_subscriptions_user_id
    ON public.professional_subscriptions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_professional_subscriptions_active_product
    ON public.professional_subscriptions(professional_profile_id, product_id)
    WHERE status = 'active';

ALTER TABLE public.professional_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.professional_subscriptions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.professional_subscriptions TO service_role;

CREATE OR REPLACE FUNCTION public.marketplace_salon_subscription_active(p_salon_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.subscriptions s
        WHERE s.salon_id = p_salon_id
          AND s.status = 'active'
          AND s.expires_at > NOW()
    );
$$;

CREATE OR REPLACE FUNCTION public.marketplace_professional_subscription_active(p_professional_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.professional_subscriptions ps
        WHERE ps.professional_profile_id = p_professional_profile_id
          AND ps.status = 'active'
          AND (ps.starts_at IS NULL OR ps.starts_at <= NOW())
          AND ps.expires_at > NOW()
    );
$$;

CREATE OR REPLACE FUNCTION public.resolve_marketplace_capability(
    p_user_id UUID,
    p_capability TEXT,
    p_context_type TEXT,
    p_context_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_membership public.salon_memberships%ROWTYPE;
    v_professional_id UUID;
BEGIN
    IF p_user_id IS NULL OR COALESCE(btrim(p_capability),'') = '' THEN RETURN FALSE; END IF;

    IF EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_id = p_user_id AND role = 'admin'
    ) THEN
        RETURN TRUE;
    END IF;

    IF p_context_type = 'professional' THEN
        SELECT id INTO v_professional_id
        FROM public.professional_profiles
        WHERE id = p_context_id AND user_id = p_user_id;
        IF v_professional_id IS NULL THEN RETURN FALSE; END IF;

        IF p_capability = 'professional.profile.manage' THEN RETURN TRUE; END IF;
        IF p_capability IN ('professional.independent.list', 'professional.independent.book') THEN
            RETURN public.marketplace_professional_subscription_active(v_professional_id);
        END IF;
        RETURN FALSE;
    END IF;

    IF p_context_type = 'salon' THEN
        SELECT * INTO v_membership
        FROM public.salon_memberships
        WHERE salon_id = p_context_id
          AND user_id = p_user_id
          AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 1;
        IF NOT FOUND THEN RETURN FALSE; END IF;

        IF p_capability IN ('salon.profile.manage', 'salon.team.manage') THEN
            RETURN v_membership.role IN ('owner','manager');
        END IF;

        IF p_capability = 'salon.booking.work' THEN
            RETURN public.marketplace_salon_subscription_active(p_context_id);
        END IF;

        IF p_capability = 'salon.marketplace.list' THEN
            RETURN v_membership.role IN ('owner','manager')
               AND public.marketplace_salon_subscription_active(p_context_id);
        END IF;

        IF p_capability = 'salon.location.create' THEN
            RETURN v_membership.role = 'owner'
               AND public.marketplace_salon_subscription_active(p_context_id)
               AND EXISTS (
                   SELECT 1 FROM public.salons s
                   WHERE s.id = p_context_id AND s.plan = 'EXTRA'
               );
        END IF;
        RETURN FALSE;
    END IF;

    IF p_context_type = 'admin' AND p_capability = 'admin.marketplace.manage' THEN
        RETURN EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id=p_user_id AND role='admin');
    END IF;

    RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.marketplace_salon_subscription_active(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.marketplace_professional_subscription_active(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_marketplace_capability(UUID,TEXT,TEXT,UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_salon_subscription_active(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.marketplace_professional_subscription_active(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_marketplace_capability(UUID,TEXT,TEXT,UUID) TO service_role;

COMMENT ON FUNCTION public.resolve_marketplace_capability(UUID,TEXT,TEXT,UUID) IS
    'Server-only context-aware capability resolver. Consumer credits are intentionally outside this entitlement model.';
