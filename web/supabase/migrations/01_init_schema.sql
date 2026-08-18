-- Afrofade Database Migration 01: Core Tables Initialization
-- Tables: salons, subscriptions, clients_heads, hairstyles_catalog

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: salons
CREATE TABLE IF NOT EXISTS salons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    country VARCHAR(100) DEFAULT 'Côte d''Ivoire',
    plan VARCHAR(20) NOT NULL DEFAULT 'PRO' CHECK (plan IN ('PRO', 'VIP', 'EXTRA')),
    quota_limit INT NOT NULL DEFAULT 30,
    quota_used INT NOT NULL DEFAULT 0,
    storage_used_bytes BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table: subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('money_fusion', 'genius_pay', 'manual')),
    amount_fcfa INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'expired', 'pending', 'cancelled')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table: hairstyles_catalog
CREATE TABLE IF NOT EXISTS hairstyles_catalog (
    id VARCHAR(100) PRIMARY KEY,
    category VARCHAR(50) NOT NULL CHECK (category IN ('fade', 'locks', 'tresses', 'afro', 'barbe')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT NOT NULL,
    mesh_3d_url TEXT,
    is_premium_upsell BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table: clients_heads
CREATE TABLE IF NOT EXISTS clients_heads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    client_name VARCHAR(255) NOT NULL DEFAULT 'Client Salon',
    photos_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
    mesh_3d_url TEXT,
    saved_hairstyle_id VARCHAR(100) REFERENCES hairstyles_catalog(id) ON DELETE SET NULL,
    is_saved_permanently BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_salons_plan ON salons(plan);
CREATE INDEX IF NOT EXISTS idx_subscriptions_salon_id ON subscriptions(salon_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_clients_heads_salon_id ON clients_heads(salon_id);
CREATE INDEX IF NOT EXISTS idx_clients_heads_is_saved ON clients_heads(is_saved_permanently);
CREATE INDEX IF NOT EXISTS idx_clients_heads_expires_at ON clients_heads(expires_at);

-- Seed hairstyles catalog initial data
INSERT INTO hairstyles_catalog (id, category, title, description, thumbnail_url, is_premium_upsell)
VALUES
    ('fade-1', 'fade', 'Low Taper Fade avec contours', 'Dégradé progressif bas avec ligne rectiligne nette', '/models/afro_taper_fade.png', false),
    ('locks-1', 'locks', 'Short Locks High Top', 'Tresses épaisses sculptées avec contours rasés', '/models/afro_dreadlocks.png', false),
    ('tresses-1', 'tresses', 'Cornrows géométriques', 'Nattes plaquées avec lignes géométriques', '/models/afro_cornrows.png', false),
    ('barbe-1', 'barbe', 'Barbe Sculptée & Contours Razoir', 'Taille au millimètre, contours nets & soin huile', '/models/afro_beard_sculpted.png', true),
    ('afro-1', 'afro', 'Afro Sponge Twists & Taper', 'Texture torsadée au sponge brush avec contours fins', '/models/afro_taper_fade.png', false),
    ('afro-2', 'afro', 'Burst Fade Mohawk Afro', 'Dégradé arrondi autour des oreilles & crête naturelle', '/models/afro_dreadlocks.png', false)
ON CONFLICT (id) DO NOTHING;
