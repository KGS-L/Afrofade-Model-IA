\set ON_ERROR_STOP on
BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;

-- Minimal pre-12 production-compatible identity/business baseline. These fixtures
-- intentionally preserve the legacy user_profiles role model while migration 12
-- adds the future relationship model beside it.
CREATE TABLE auth.users (
  id UUID PRIMARY KEY
);

CREATE TABLE public.salons (
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

CREATE TABLE public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'salon', 'admin')),
  salon_id UUID REFERENCES public.salons(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  marker TEXT NOT NULL DEFAULT 'legacy-subscription'
);

CREATE TABLE public.clients_heads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  marker TEXT NOT NULL DEFAULT 'legacy-head'
);

CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID REFERENCES public.salons(id) ON DELETE SET NULL,
  marker TEXT NOT NULL DEFAULT 'legacy-payment'
);

INSERT INTO auth.users(id) VALUES
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222'),
  ('33333333-3333-4333-8333-333333333333');

INSERT INTO public.salons(id, name, plan, quota_limit, quota_used) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Legacy Salon A', 'VIP', 90, 17),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Legacy Salon B', 'PRO', 30, 4);

INSERT INTO public.user_profiles(user_id, role, salon_id) VALUES
  ('11111111-1111-4111-8111-111111111111', 'salon', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  ('22222222-2222-4222-8222-222222222222', 'customer', NULL),
  ('33333333-3333-4333-8333-333333333333', 'admin', NULL);

INSERT INTO public.subscriptions(salon_id) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
INSERT INTO public.clients_heads(salon_id) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
INSERT INTO public.payment_transactions(salon_id) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

\ir ../migrations/12_marketplace_identity_foundation.sql

CREATE FUNCTION pg_temp.assert_true(value BOOLEAN, message TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT COALESCE(value, FALSE) THEN
    RAISE EXCEPTION 'assertion failed: %', message;
  END IF;
END $$;

-- Schema and legacy preservation.
SELECT pg_temp.assert_true(to_regclass('public.professional_profiles') IS NOT NULL, 'professional_profiles exists');
SELECT pg_temp.assert_true(to_regclass('public.salon_memberships') IS NOT NULL, 'salon_memberships exists');
SELECT pg_temp.assert_true(
  (SELECT plan = 'VIP' AND quota_limit = 90 AND quota_used = 17
   FROM public.salons WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'legacy salon id/plan/quota preserved'
);
SELECT pg_temp.assert_true(
  (SELECT role = 'salon' AND salon_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
   FROM public.user_profiles WHERE user_id = '11111111-1111-4111-8111-111111111111'),
  'legacy salon role mapping preserved'
);
SELECT pg_temp.assert_true(
  (SELECT role = 'admin' FROM public.user_profiles WHERE user_id = '33333333-3333-4333-8333-333333333333'),
  'legacy admin preserved'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.subscriptions WHERE salon_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'subscription FK preserved'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.clients_heads WHERE salon_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'client head FK preserved'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.payment_transactions WHERE salon_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'payment FK preserved'
);

-- Marketplace salon columns are additive and defaults are safe for legacy rows.
SELECT pg_temp.assert_true(
  (SELECT verification_status = 'unverified' AND listing_status = 'draft'
          AND booking_confirmation_mode = 'manual'
   FROM public.salons WHERE id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'legacy salon receives only safe structural defaults'
);

-- One professional profile per auth user.
INSERT INTO public.professional_profiles(
  user_id, slug, professional_name, operating_mode, city
) VALUES (
  '11111111-1111-4111-8111-111111111111', 'aicha-hair', 'Aïcha Hair', 'independent', 'Ouagadougou'
);

DO $$
BEGIN
  BEGIN
    INSERT INTO public.professional_profiles(user_id, professional_name)
    VALUES ('11111111-1111-4111-8111-111111111111', 'Duplicate');
    RAISE EXCEPTION 'duplicate professional profile accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END $$;

-- A single user can belong to multiple salons, and one salon can contain several users.
INSERT INTO public.salon_memberships(
  salon_id, user_id, professional_profile_id, role, status, started_at
) VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111',
  (SELECT id FROM public.professional_profiles WHERE user_id = '11111111-1111-4111-8111-111111111111'),
  'professional', 'active', NOW()
), (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '11111111-1111-4111-8111-111111111111',
  (SELECT id FROM public.professional_profiles WHERE user_id = '11111111-1111-4111-8111-111111111111'),
  'owner', 'active', NOW()
), (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '22222222-2222-4222-8222-222222222222',
  NULL,
  'manager', 'active', NOW()
);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 2 FROM public.salon_memberships
   WHERE user_id = '11111111-1111-4111-8111-111111111111' AND status = 'active'),
  'one user may have active memberships in multiple salons'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 2 FROM public.salon_memberships
   WHERE salon_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND status = 'active'),
  'one salon may have several active members'
);

-- Duplicate live relationship must fail.
DO $$
BEGIN
  BEGIN
    INSERT INTO public.salon_memberships(salon_id, user_id, role, status)
    VALUES (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      'professional', 'invited'
    );
    RAISE EXCEPTION 'duplicate live membership accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END $$;

-- Professional profile ownership mismatch must fail closed.
DO $$
BEGIN
  BEGIN
    UPDATE public.salon_memberships
    SET professional_profile_id = (
      SELECT id FROM public.professional_profiles
      WHERE user_id = '11111111-1111-4111-8111-111111111111'
    )
    WHERE salon_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      AND user_id = '22222222-2222-4222-8222-222222222222';
    RAISE EXCEPTION 'cross-user professional profile accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'cross-user professional profile accepted' THEN RAISE; END IF;
    IF SQLERRM NOT LIKE '%membership_professional_profile_owner_mismatch%' THEN RAISE; END IF;
  END;
END $$;

-- Ended history remains and does not prevent a later rejoin.
UPDATE public.salon_memberships
SET status = 'ended', ended_at = NOW()
WHERE salon_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  AND user_id = '11111111-1111-4111-8111-111111111111';

INSERT INTO public.salon_memberships(
  salon_id, user_id, professional_profile_id, role, status, started_at
) VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111',
  (SELECT id FROM public.professional_profiles WHERE user_id = '11111111-1111-4111-8111-111111111111'),
  'professional', 'active', NOW()
);

SELECT pg_temp.assert_true(
  (SELECT count(*) = 2 FROM public.salon_memberships
   WHERE salon_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
     AND user_id = '11111111-1111-4111-8111-111111111111'),
  'ended history and active rejoin coexist'
);

-- RLS and ACL foundation.
SELECT pg_temp.assert_true(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.professional_profiles'::regclass),
  'professional profile RLS enabled'
);
SELECT pg_temp.assert_true(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.salon_memberships'::regclass),
  'membership RLS enabled'
);
SELECT pg_temp.assert_true(
  NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.salons'::regclass),
  'Story 12.1 leaves legacy salons RLS state unchanged'
);
SELECT pg_temp.assert_true(
  NOT has_table_privilege('anon', 'public.professional_profiles', 'SELECT'),
  'anon cannot enumerate private professional profiles'
);
SELECT pg_temp.assert_true(
  NOT has_table_privilege('anon', 'public.salon_memberships', 'SELECT'),
  'anon cannot enumerate private memberships'
);
SELECT pg_temp.assert_true(
  has_table_privilege('authenticated', 'public.professional_profiles', 'SELECT'),
  'authenticated has profile SELECT subject to RLS'
);
SELECT pg_temp.assert_true(
  NOT has_table_privilege('authenticated', 'public.salon_memberships', 'INSERT'),
  'authenticated direct membership INSERT fails closed'
);

-- Verify own-row filtering with emulated Supabase auth.uid().
GRANT USAGE ON SCHEMA public TO authenticated;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 FROM public.professional_profiles),
  'authenticated user sees only own professional profile'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 3 FROM public.salon_memberships),
  'authenticated user sees own current and historical memberships only'
);
RESET ROLE;

ROLLBACK;
\echo 'Marketplace identity foundation PostgreSQL contract: PASS'
