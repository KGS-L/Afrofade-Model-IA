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

-- -----------------------------------------------------------------------------
-- Epics 13-17: Marketplace Full Platform Schema & RLS Foundations
-- -----------------------------------------------------------------------------

-- 1. Taxonomy, Bookable Services & Portfolio (Epic 13)
CREATE TABLE IF NOT EXISTS hair_skills (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'cut',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS professional_skills (
    professional_profile_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
    skill_id VARCHAR(100) NOT NULL REFERENCES hair_skills(id) ON DELETE CASCADE,
    PRIMARY KEY (professional_profile_id, skill_id)
);

CREATE TABLE IF NOT EXISTS bookable_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN ('salon', 'independent_professional')),
    salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
    professional_profile_id UUID REFERENCES professional_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL DEFAULT 45 CHECK (duration_minutes > 0),
    buffer_before_minutes INT NOT NULL DEFAULT 0 CHECK (buffer_before_minutes >= 0),
    buffer_after_minutes INT NOT NULL DEFAULT 0 CHECK (buffer_after_minutes >= 0),
    price_fcfa INT NOT NULL CHECK (price_fcfa >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    professional_profile_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    title VARCHAR(255),
    description TEXT,
    style_id VARCHAR(100) REFERENCES hairstyles_catalog(id) ON DELETE SET NULL,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Location extensions on salons & professional profiles
ALTER TABLE salons ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7);
ALTER TABLE salons ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);
ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7);
ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);

-- 2. Availability, Scheduling & Bookings (Epic 14)
CREATE TABLE IF NOT EXISTS provider_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
    professional_profile_id UUID REFERENCES professional_profiles(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    open_time TIME NOT NULL DEFAULT '08:00',
    close_time TIME NOT NULL DEFAULT '19:00',
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_provider_day UNIQUE (salon_id, professional_profile_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS time_off_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
    professional_profile_id UUID REFERENCES professional_profiles(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_number VARCHAR(50) NOT NULL UNIQUE,
    idempotency_key TEXT UNIQUE,
    customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN ('salon', 'independent_professional')),
    salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
    professional_profile_id UUID REFERENCES professional_profiles(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES bookable_services(id) ON DELETE CASCADE,
    assigned_professional_id UUID REFERENCES professional_profiles(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
    total_price_fcfa INT NOT NULL CHECK (total_price_fcfa >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'XOF',
    tryon_head_id UUID REFERENCES customer_heads(id) ON DELETE SET NULL,
    saved_hairstyle_id VARCHAR(100) REFERENCES hairstyles_catalog(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS booking_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_outbox (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    attempts INT NOT NULL DEFAULT 0,
    dedupe_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- 3. Trust, Reviews & Moderation (Epic 15)
CREATE TABLE IF NOT EXISTS verified_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
    professional_profile_id UUID REFERENCES professional_profiles(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('review', 'portfolio_item', 'job_posting', 'professional_profile')),
    target_id UUID NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
    moderator_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Careers & Recruitment (Epic 16)
CREATE TABLE IF NOT EXISTS job_postings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    city VARCHAR(100),
    work_mode VARCHAR(50) NOT NULL DEFAULT 'full_time' CHECK (work_mode IN ('full_time', 'part_time', 'chair_rental', 'freelance')),
    compensation_range VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    applicant_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'shortlisted', 'interviewing', 'hired', 'rejected')),
    cover_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_job_applicant UNIQUE (job_id, applicant_user_id)
);

-- 5. Analytics & Funnel Telemetry (Epic 17)
CREATE TABLE IF NOT EXISTS marketplace_analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance & search
CREATE INDEX IF NOT EXISTS idx_bookable_services_salon ON bookable_services(salon_id);
CREATE INDEX IF NOT EXISTS idx_bookable_services_pro ON bookable_services(professional_profile_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_pro ON portfolio_items(professional_profile_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_salon ON bookings(salon_id);
CREATE INDEX IF NOT EXISTS idx_bookings_pro ON bookings(professional_profile_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_reviews_salon ON verified_reviews(salon_id);
CREATE INDEX IF NOT EXISTS idx_reviews_pro ON verified_reviews(professional_profile_id);
CREATE INDEX IF NOT EXISTS idx_jobs_salon ON job_postings(salon_id);
CREATE INDEX IF NOT EXISTS idx_job_apps_user ON job_applications(applicant_user_id);

-- RLS Enforcement
ALTER TABLE hair_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookable_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE verified_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_analytics_events ENABLE ROW LEVEL SECURITY;

-- Public READ policies for search & catalog
DROP POLICY IF EXISTS hair_skills_select_public ON hair_skills;
CREATE POLICY hair_skills_select_public ON hair_skills FOR SELECT USING (true);

DROP POLICY IF EXISTS bookable_services_select_public ON bookable_services;
CREATE POLICY bookable_services_select_public ON bookable_services FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS portfolio_items_select_public ON portfolio_items;
CREATE POLICY portfolio_items_select_public ON portfolio_items FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS verified_reviews_select_public ON verified_reviews;
CREATE POLICY verified_reviews_select_public ON verified_reviews FOR SELECT USING (is_hidden = false);

DROP POLICY IF EXISTS job_postings_select_public ON job_postings;
CREATE POLICY job_postings_select_public ON job_postings FOR SELECT USING (status = 'active');

-- Owner / Participant CRUD policies
DROP POLICY IF EXISTS bookings_select_participant ON bookings;
CREATE POLICY bookings_select_participant ON bookings FOR SELECT
USING (auth.uid() = customer_id OR EXISTS (
    SELECT 1 FROM salon_memberships sm
    WHERE sm.salon_id = bookings.salon_id AND sm.user_id = auth.uid()
));

DROP POLICY IF EXISTS bookings_insert_customer ON bookings;
CREATE POLICY bookings_insert_customer ON bookings FOR INSERT
WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS job_applications_select_applicant_or_salon ON job_applications;
CREATE POLICY job_applications_select_applicant_or_salon ON job_applications FOR SELECT
USING (auth.uid() = applicant_user_id OR EXISTS (
    SELECT 1 FROM job_postings jp
    JOIN salon_memberships sm ON sm.salon_id = jp.salon_id
    WHERE jp.id = job_applications.job_id AND sm.user_id = auth.uid()
));

-- Concurrency-safe Booking Creation Procedure (Epic 14.3)
CREATE OR REPLACE FUNCTION create_booking_transaction(
    p_idempotency_key TEXT,
    p_customer_id UUID,
    p_provider_type VARCHAR(50),
    p_salon_id UUID,
    p_professional_profile_id UUID,
    p_service_id UUID,
    p_start_time TIMESTAMPTZ,
    p_tryon_head_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_service_duration INT;
    v_service_price INT;
    v_end_time TIMESTAMPTZ;
    v_existing_booking UUID;
    v_booking_id UUID;
    v_booking_num VARCHAR(50);
BEGIN
    -- Check idempotency
    SELECT id INTO v_existing_booking FROM bookings WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
        RETURN jsonb_build_object('status', 'exists', 'booking_id', v_existing_booking);
    END IF;

    -- Fetch service details
    SELECT duration_minutes, price_fcfa INTO v_service_duration, v_service_price
    FROM bookable_services
    WHERE id = p_service_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'service_not_found_or_inactive';
    END IF;

    v_end_time := p_start_time + (v_service_duration || ' minutes')::INTERVAL;

    -- Check slot availability (no overlapping confirmed/pending booking)
    IF EXISTS (
        SELECT 1 FROM bookings
        WHERE (salon_id = p_salon_id OR professional_profile_id = p_professional_profile_id)
          AND status IN ('pending', 'confirmed')
          AND start_time < v_end_time
          AND end_time > p_start_time
    ) THEN
        RAISE EXCEPTION 'slot_unavailable';
    END IF;

    v_booking_num := 'BK-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));

    INSERT INTO bookings (
        booking_number, idempotency_key, customer_id, provider_type,
        salon_id, professional_profile_id, service_id, start_time, end_time,
        status, total_price_fcfa, tryon_head_id
    ) VALUES (
        v_booking_num, p_idempotency_key, p_customer_id, p_provider_type,
        p_salon_id, p_professional_profile_id, p_service_id, p_start_time, v_end_time,
        'confirmed', v_service_price, p_tryon_head_id
    ) RETURNING id INTO v_booking_id;

    -- Record booking event
    INSERT INTO booking_events (booking_id, actor_id, previous_status, new_status, note)
    VALUES (v_booking_id, p_customer_id, NULL, 'confirmed', 'Reservation effectuee par le client');

    -- Insert notification into outbox
    INSERT INTO notification_outbox (event_type, payload, dedupe_key)
    VALUES ('booking_confirmed', jsonb_build_object('booking_id', v_booking_id, 'customer_id', p_customer_id), 'notif:' || v_booking_id);

    RETURN jsonb_build_object('status', 'created', 'booking_id', v_booking_id, 'booking_number', v_booking_num);
END;
$$;



