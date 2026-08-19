-- Afrofade Database Migration 09: product hardening before Epic 7.6
-- Admin-controlled payment providers + explicit first-login role onboarding.

CREATE TABLE IF NOT EXISTS payment_provider_settings (
    provider VARCHAR(50) PRIMARY KEY CHECK (provider IN ('money_fusion', 'genius_pay')),
    display_name VARCHAR(100) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO payment_provider_settings (provider, display_name, enabled, sort_order)
VALUES
    ('money_fusion', 'Money Fusion', TRUE, 10),
    ('genius_pay', 'GeniusPay', FALSE, 20)
ON CONFLICT (provider) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    sort_order = EXCLUDED.sort_order;

ALTER TABLE payment_provider_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON payment_provider_settings FROM anon, authenticated;
GRANT ALL ON payment_provider_settings TO service_role;

-- New accounts must explicitly choose Particulier or Salon before entering a
-- dashboard. Existing users keep their already-persisted role/profile.
CREATE OR REPLACE FUNCTION public.handle_afrofade_auth_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_afrofade_auth_user_created ON auth.users;
CREATE TRIGGER on_afrofade_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_afrofade_auth_user_created();
