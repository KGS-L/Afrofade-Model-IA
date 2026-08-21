\set ON_ERROR_STOP on
BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;

CREATE TABLE auth.users(id UUID PRIMARY KEY);
CREATE TABLE public.salons(
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(255) NOT NULL,
  phone VARCHAR(50), country VARCHAR(100), plan VARCHAR(20) NOT NULL DEFAULT 'PRO',
  quota_limit INT NOT NULL DEFAULT 30, quota_used INT NOT NULL DEFAULT 0,
  storage_used_bytes BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.user_profiles(
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK(role IN ('customer','salon','admin')),
  salon_id UUID REFERENCES public.salons(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.subscriptions(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), salon_id UUID NOT NULL REFERENCES public.salons(id));
CREATE TABLE public.clients_heads(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), salon_id UUID NOT NULL REFERENCES public.salons(id));
CREATE TABLE public.payment_transactions(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), salon_id UUID REFERENCES public.salons(id));

INSERT INTO auth.users VALUES
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222'),
 ('33333333-3333-4333-8333-333333333333');
INSERT INTO public.salons(id,name,plan,quota_limit,quota_used) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Legacy A','VIP',90,17),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Legacy B','PRO',30,4);
INSERT INTO public.user_profiles VALUES
 ('11111111-1111-4111-8111-111111111111','salon','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',NOW(),NOW()),
 ('22222222-2222-4222-8222-222222222222','customer',NULL,NOW(),NOW()),
 ('33333333-3333-4333-8333-333333333333','admin',NULL,NOW(),NOW());
INSERT INTO public.subscriptions(salon_id) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
INSERT INTO public.clients_heads(salon_id) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
INSERT INTO public.payment_transactions(salon_id) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

\ir ../migrations/20_marketplace_identity_foundation.sql

CREATE FUNCTION pg_temp.assert_true(v BOOLEAN, m TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN IF NOT COALESCE(v,FALSE) THEN RAISE EXCEPTION 'assertion failed: %',m; END IF; END $$;

SELECT pg_temp.assert_true(to_regclass('public.professional_profiles') IS NOT NULL,'professional_profiles exists');
SELECT pg_temp.assert_true(to_regclass('public.salon_memberships') IS NOT NULL,'salon_memberships exists');
SELECT pg_temp.assert_true((SELECT plan='VIP' AND quota_limit=90 AND quota_used=17 FROM public.salons WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'legacy salon preserved');
SELECT pg_temp.assert_true((SELECT role='salon' FROM public.user_profiles WHERE user_id='11111111-1111-4111-8111-111111111111'),'legacy salon role preserved');
SELECT pg_temp.assert_true((SELECT role='admin' FROM public.user_profiles WHERE user_id='33333333-3333-4333-8333-333333333333'),'admin preserved');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.subscriptions WHERE salon_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'subscription relation preserved');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.clients_heads WHERE salon_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'3D relation preserved');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.payment_transactions WHERE salon_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'payment relation preserved');

INSERT INTO public.professional_profiles(user_id,slug,professional_name,operating_mode)
VALUES('11111111-1111-4111-8111-111111111111','aicha-hair','Aïcha Hair','independent');
DO $$ BEGIN
  BEGIN INSERT INTO public.professional_profiles(user_id) VALUES('11111111-1111-4111-8111-111111111111'); RAISE EXCEPTION 'duplicate accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;

INSERT INTO public.salon_memberships(salon_id,user_id,professional_profile_id,role,status,started_at) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',(SELECT id FROM public.professional_profiles WHERE user_id='11111111-1111-4111-8111-111111111111'),'professional','active',NOW()),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111',(SELECT id FROM public.professional_profiles WHERE user_id='11111111-1111-4111-8111-111111111111'),'owner','active',NOW()),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222',NULL,'manager','active',NOW());
SELECT pg_temp.assert_true((SELECT count(*)=2 FROM public.salon_memberships WHERE user_id='11111111-1111-4111-8111-111111111111' AND status='active'),'multi-salon works');
SELECT pg_temp.assert_true((SELECT count(*)=2 FROM public.salon_memberships WHERE salon_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND status='active'),'multi-member salon works');

DO $$ BEGIN
  BEGIN INSERT INTO public.salon_memberships(salon_id,user_id,role,status) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','professional','invited'); RAISE EXCEPTION 'duplicate live membership accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
END $$;
DO $$ BEGIN
  BEGIN UPDATE public.salon_memberships SET professional_profile_id=(SELECT id FROM public.professional_profiles WHERE user_id='11111111-1111-4111-8111-111111111111') WHERE user_id='22222222-2222-4222-8222-222222222222'; RAISE EXCEPTION 'cross-user profile accepted';
  EXCEPTION WHEN OTHERS THEN IF SQLERRM='cross-user profile accepted' OR SQLERRM NOT LIKE '%membership_professional_profile_owner_mismatch%' THEN RAISE; END IF; END;
END $$;

UPDATE public.salon_memberships SET status='ended',ended_at=NOW()
WHERE salon_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND user_id='11111111-1111-4111-8111-111111111111';
INSERT INTO public.salon_memberships(salon_id,user_id,professional_profile_id,role,status,started_at)
VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111',(SELECT id FROM public.professional_profiles WHERE user_id='11111111-1111-4111-8111-111111111111'),'professional','active',NOW());
SELECT pg_temp.assert_true((SELECT count(*)=2 FROM public.salon_memberships WHERE salon_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND user_id='11111111-1111-4111-8111-111111111111'),'history plus rejoin works');

SELECT pg_temp.assert_true((SELECT relrowsecurity FROM pg_class WHERE oid='public.professional_profiles'::regclass),'profile RLS');
SELECT pg_temp.assert_true((SELECT relrowsecurity FROM pg_class WHERE oid='public.salon_memberships'::regclass),'membership RLS');
SELECT pg_temp.assert_true(NOT has_table_privilege('anon','public.professional_profiles','SELECT'),'anon profile denied');
SELECT pg_temp.assert_true(NOT has_table_privilege('anon','public.salon_memberships','SELECT'),'anon membership denied');

ROLLBACK;
\echo 'Marketplace identity foundation PostgreSQL contract: PASS'
