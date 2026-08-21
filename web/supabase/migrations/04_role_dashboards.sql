-- Afrofade Database Migration 04: operational role dashboards + usage accounting
-- Apply after migrations 01, 02 and 03.

CREATE TABLE IF NOT EXISTS customer_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name VARCHAR(120),
    phone VARCHAR(50),
    country VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_heads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_name VARCHAR(255) NOT NULL DEFAULT 'Client Afrofade',
    mesh_3d_url TEXT NOT NULL,
    saved_hairstyle_id VARCHAR(100) REFERENCES hairstyles_catalog(id) ON DELETE SET NULL,
    request_key TEXT NOT NULL UNIQUE,
    is_saved_permanently BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_heads_user_id ON customer_heads(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_heads_expires_at ON customer_heads(expires_at);

-- Salon reconstructions need a stable idempotency key so retries cannot consume
-- quota twice or create duplicate biometric rows.
ALTER TABLE clients_heads ADD COLUMN IF NOT EXISTS request_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_heads_request_key
    ON clients_heads(request_key)
    WHERE request_key IS NOT NULL;

ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_heads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_profiles_select_own ON customer_profiles;
CREATE POLICY customer_profiles_select_own
    ON customer_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS customer_profiles_insert_own ON customer_profiles;
CREATE POLICY customer_profiles_insert_own
    ON customer_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS customer_profiles_update_own ON customer_profiles;
CREATE POLICY customer_profiles_update_own
    ON customer_profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS customer_heads_select_own ON customer_heads;
CREATE POLICY customer_heads_select_own
    ON customer_heads
    FOR SELECT
    USING (auth.uid() = user_id);

-- Every new Supabase Auth account starts as a customer. Privileged roles are
-- never derived from client metadata. Admin remains an explicit server/DB action,
-- while a customer may later create a salon through the authenticated onboarding API.
CREATE OR REPLACE FUNCTION public.handle_afrofade_auth_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, role)
    VALUES (NEW.id, 'customer')
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.customer_profiles (user_id, display_name)
    VALUES (
        NEW.id,
        COALESCE(
            NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
            NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
            NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), '')
        )
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_afrofade_auth_user_created ON auth.users;
CREATE TRIGGER on_afrofade_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_afrofade_auth_user_created();

-- Backfill accounts created before this migration without overwriting existing
-- admin or salon assignments.
INSERT INTO public.user_profiles (user_id, role)
SELECT id, 'customer'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.customer_profiles (user_id, display_name)
SELECT
    id,
    COALESCE(
        NULLIF(raw_user_meta_data ->> 'full_name', ''),
        NULLIF(raw_user_meta_data ->> 'name', ''),
        NULLIF(split_part(COALESCE(email, ''), '@', 1), '')
    )
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Atomic B2C reconstruction finalization. The expensive AI call is performed
-- first, then this function persists the result and consumes exactly two credits.
-- Retries with the same request key return the existing head without charging twice.
CREATE OR REPLACE FUNCTION finalize_customer_reconstruction(
    p_user_id UUID,
    p_mesh_url TEXT,
    p_client_name TEXT,
    p_request_key TEXT,
    p_cost INT DEFAULT 2
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    wallet_balance INT;
    existing_head UUID;
    new_head UUID;
BEGIN
    IF p_cost <= 0 OR COALESCE(NULLIF(p_request_key, ''), '') = '' OR COALESCE(NULLIF(p_mesh_url, ''), '') = '' THEN
        RAISE EXCEPTION 'invalid_reconstruction_finalization';
    END IF;

    SELECT id INTO existing_head
    FROM customer_heads
    WHERE request_key = p_request_key;

    IF FOUND THEN
        SELECT balance INTO wallet_balance FROM credit_wallets WHERE user_id = p_user_id;
        RETURN jsonb_build_object(
            'status', 'already_finalized',
            'head_id', existing_head,
            'balance', COALESCE(wallet_balance, 0)
        );
    END IF;

    SELECT balance INTO wallet_balance
    FROM credit_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND OR wallet_balance < p_cost THEN
        RAISE EXCEPTION 'insufficient_credits';
    END IF;

    INSERT INTO customer_heads (user_id, client_name, mesh_3d_url, request_key)
    VALUES (p_user_id, COALESCE(NULLIF(p_client_name, ''), 'Client Afrofade'), p_mesh_url, p_request_key)
    RETURNING id INTO new_head;

    UPDATE credit_wallets
    SET balance = balance - p_cost,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    INSERT INTO credit_transactions (user_id, delta, reason, reference_id, idempotency_key)
    VALUES (p_user_id, -p_cost, 'create_head', new_head, 'reconstruct:' || p_request_key);

    RETURN jsonb_build_object(
        'status', 'finalized',
        'head_id', new_head,
        'balance', wallet_balance - p_cost
    );
END;
$$;

REVOKE ALL ON FUNCTION finalize_customer_reconstruction(UUID, TEXT, TEXT, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finalize_customer_reconstruction(UUID, TEXT, TEXT, TEXT, INT) TO service_role;

-- Atomic salon reconstruction finalization. A successful result consumes one
-- salon quota unit and creates the clients_heads row in the same transaction.
CREATE OR REPLACE FUNCTION finalize_salon_reconstruction(
    p_salon_id UUID,
    p_mesh_url TEXT,
    p_client_name TEXT,
    p_request_key TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    quota_limit_value INT;
    quota_used_value INT;
    existing_head UUID;
    new_head UUID;
BEGIN
    IF COALESCE(NULLIF(p_request_key, ''), '') = '' OR COALESCE(NULLIF(p_mesh_url, ''), '') = '' THEN
        RAISE EXCEPTION 'invalid_reconstruction_finalization';
    END IF;

    SELECT id INTO existing_head
    FROM clients_heads
    WHERE request_key = p_request_key;

    IF FOUND THEN
        SELECT quota_used INTO quota_used_value FROM salons WHERE id = p_salon_id;
        RETURN jsonb_build_object(
            'status', 'already_finalized',
            'head_id', existing_head,
            'quota_used', COALESCE(quota_used_value, 0)
        );
    END IF;

    SELECT quota_limit, quota_used
    INTO quota_limit_value, quota_used_value
    FROM salons
    WHERE id = p_salon_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'salon_not_found';
    END IF;

    IF quota_used_value >= quota_limit_value THEN
        RAISE EXCEPTION 'quota_exhausted';
    END IF;

    INSERT INTO clients_heads (
        salon_id,
        client_name,
        photos_urls,
        mesh_3d_url,
        request_key
    ) VALUES (
        p_salon_id,
        COALESCE(NULLIF(p_client_name, ''), 'Client Salon'),
        '[]'::jsonb,
        p_mesh_url,
        p_request_key
    )
    RETURNING id INTO new_head;

    UPDATE salons
    SET quota_used = quota_used + 1,
        updated_at = NOW()
    WHERE id = p_salon_id;

    RETURN jsonb_build_object(
        'status', 'finalized',
        'head_id', new_head,
        'quota_used', quota_used_value + 1,
        'quota_limit', quota_limit_value
    );
END;
$$;

REVOKE ALL ON FUNCTION finalize_salon_reconstruction(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finalize_salon_reconstruction(UUID, TEXT, TEXT, TEXT) TO service_role;

-- B2C HD downloads consume one credit. A request key makes retries idempotent.
CREATE OR REPLACE FUNCTION consume_customer_download_credit(
    p_user_id UUID,
    p_head_id UUID,
    p_request_key TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    wallet_balance INT;
    existing_tx UUID;
BEGIN
    IF COALESCE(NULLIF(p_request_key, ''), '') = '' THEN
        RAISE EXCEPTION 'invalid_download_request';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM customer_heads
        WHERE id = p_head_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'head_not_found';
    END IF;

    SELECT id INTO existing_tx
    FROM credit_transactions
    WHERE idempotency_key = 'download:' || p_request_key;

    IF FOUND THEN
        SELECT balance INTO wallet_balance FROM credit_wallets WHERE user_id = p_user_id;
        RETURN jsonb_build_object('status', 'already_consumed', 'balance', COALESCE(wallet_balance, 0));
    END IF;

    SELECT balance INTO wallet_balance
    FROM credit_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND OR wallet_balance < 1 THEN
        RAISE EXCEPTION 'insufficient_credits';
    END IF;

    UPDATE credit_wallets
    SET balance = balance - 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    INSERT INTO credit_transactions (user_id, delta, reason, reference_id, idempotency_key)
    VALUES (p_user_id, -1, 'download_hd', p_head_id, 'download:' || p_request_key);

    RETURN jsonb_build_object('status', 'consumed', 'balance', wallet_balance - 1);
END;
$$;

REVOKE ALL ON FUNCTION consume_customer_download_credit(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION consume_customer_download_credit(UUID, UUID, TEXT) TO service_role;

-- -----------------------------------------------------------------------------
-- Marketplace Identity Foundation: professional_profiles & salon_memberships
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS professional_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    headline VARCHAR(255),
    bio TEXT,
    operating_mode VARCHAR(50) NOT NULL DEFAULT 'independent' CHECK (operating_mode IN ('independent', 'salon_staff', 'both')),
    job_seeking_state VARCHAR(50) NOT NULL DEFAULT 'not_seeking' CHECK (job_seeking_state IN ('not_seeking', 'open_to_offers', 'actively_looking')),
    city VARCHAR(100),
    neighborhood VARCHAR(100),
    service_radius_km INT NOT NULL DEFAULT 15 CHECK (service_radius_km >= 0),
    verification_state VARCHAR(50) NOT NULL DEFAULT 'unverified' CHECK (verification_state IN ('unverified', 'pending', 'verified', 'rejected')),
    listing_state VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (listing_state IN ('draft', 'published', 'suspended', 'hidden')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salon_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'manager', 'professional')),
    state VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (state IN ('pending_invite', 'active', 'inactive', 'revoked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_salon_memberships_user_salon UNIQUE (user_id, salon_id)
);

CREATE INDEX IF NOT EXISTS idx_professional_profiles_user_id ON professional_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_listing ON professional_profiles(listing_state, verification_state);
CREATE INDEX IF NOT EXISTS idx_salon_memberships_user_id ON salon_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_salon_memberships_salon_id ON salon_memberships(salon_id);
CREATE INDEX IF NOT EXISTS idx_salon_memberships_role ON salon_memberships(role);

ALTER TABLE professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS professional_profiles_select_own ON professional_profiles;
CREATE POLICY professional_profiles_select_own
    ON professional_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS professional_profiles_select_public ON professional_profiles;
CREATE POLICY professional_profiles_select_public
    ON professional_profiles
    FOR SELECT
    USING (listing_state = 'published' AND verification_state = 'verified');

DROP POLICY IF EXISTS professional_profiles_insert_own ON professional_profiles;
CREATE POLICY professional_profiles_insert_own
    ON professional_profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS professional_profiles_update_own ON professional_profiles;
CREATE POLICY professional_profiles_update_own
    ON professional_profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS salon_memberships_select_member_or_owner ON salon_memberships;
CREATE POLICY salon_memberships_select_member_or_owner
    ON salon_memberships
    FOR SELECT
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM salon_memberships sm
            WHERE sm.salon_id = salon_memberships.salon_id
              AND sm.user_id = auth.uid()
              AND sm.role IN ('owner', 'manager')
              AND sm.state = 'active'
        )
    );

DROP POLICY IF EXISTS salon_memberships_insert_owner_manager ON salon_memberships;
CREATE POLICY salon_memberships_insert_owner_manager
    ON salon_memberships
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM salon_memberships sm
            WHERE sm.salon_id = salon_memberships.salon_id
              AND sm.user_id = auth.uid()
              AND sm.role IN ('owner', 'manager')
              AND sm.state = 'active'
        )
    );

DROP POLICY IF EXISTS salon_memberships_update_owner_manager ON salon_memberships;
CREATE POLICY salon_memberships_update_owner_manager
    ON salon_memberships
    FOR UPDATE
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM salon_memberships sm
            WHERE sm.salon_id = salon_memberships.salon_id
              AND sm.user_id = auth.uid()
              AND sm.role IN ('owner', 'manager')
              AND sm.state = 'active'
        )
    );

-- Backfill procedure for Story 12.2: Legacy salon backfill & compatibility
CREATE OR REPLACE FUNCTION backfill_legacy_salon_memberships()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Ensure professional_profiles exists for all users
    INSERT INTO professional_profiles (user_id, full_name)
    SELECT 
        up.user_id,
        COALESCE(cp.display_name, 'Professionnel Afrofade')
    FROM user_profiles up
    LEFT JOIN customer_profiles cp ON cp.user_id = up.user_id
    ON CONFLICT (user_id) DO NOTHING;

    -- 2. Backfill salon_memberships for existing salon accounts
    INSERT INTO salon_memberships (user_id, salon_id, role, state)
    SELECT 
        up.user_id,
        s.id,
        'owner',
        'active'
    FROM user_profiles up
    CROSS JOIN salons s
    WHERE up.role = 'salon'
    ON CONFLICT (user_id, salon_id) DO NOTHING;
END;
$$;

SELECT backfill_legacy_salon_memberships();


