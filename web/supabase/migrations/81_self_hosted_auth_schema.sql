-- Migration 81: Self-Hosted Native Auth Schema (PostgreSQL local)
-- Support for Email OTP + NextAuth / Custom Session JWT without Supabase Cloud

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    encrypted_password VARCHAR(255),
    email_confirmed_at TIMESTAMPTZ DEFAULT NOW(),
    raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_users_email ON auth.users(email);

CREATE TABLE IF NOT EXISTS public.auth_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_otps_email_code ON public.auth_otps(email, code);
CREATE INDEX IF NOT EXISTS idx_auth_otps_expires ON public.auth_otps(expires_at);

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'salon', 'admin')),
    salon_id UUID REFERENCES public.salons(id) ON DELETE SET NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compléter la structure de public.user_profiles si la table existait déjà
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100),
  ADD COLUMN IF NOT EXISTS nationality VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- Seed Admin User sokevin7@gmail.com
INSERT INTO auth.users (id, email)
VALUES ('77777777-7777-4777-8777-777777777777', 'sokevin7@gmail.com')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.user_profiles (user_id, email, role, display_name, full_name)
SELECT id, email, 'admin', 'Kevin Sokevin', 'Kevin Sokevin'
FROM auth.users
WHERE email = 'sokevin7@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
