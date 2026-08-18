-- Afrofade Database Migration 04: operational role dashboards
-- Adds persisted customer profiles and automatically provisions safe customer roles.

CREATE TABLE IF NOT EXISTS customer_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name VARCHAR(120),
    phone VARCHAR(50),
    country VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

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

-- Backfill accounts created before this migration without overwriting the admin
-- or salon assignments that already exist.
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
