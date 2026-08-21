-- Afrofade Database Migration 13: Marketplace Identity Foundation
-- Tables: professional_profiles, salon_memberships

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: professional_profiles
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

-- 2. Table: salon_memberships
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

-- Indexes for fast query performance & foreign keys
CREATE INDEX IF NOT EXISTS idx_professional_profiles_user_id ON professional_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_listing ON professional_profiles(listing_state, verification_state);
CREATE INDEX IF NOT EXISTS idx_salon_memberships_user_id ON salon_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_salon_memberships_salon_id ON salon_memberships(salon_id);
CREATE INDEX IF NOT EXISTS idx_salon_memberships_role ON salon_memberships(role);

-- Enable Row Level Security (RLS)
ALTER TABLE professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_memberships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for professional_profiles
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

-- RLS Policies for salon_memberships
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
