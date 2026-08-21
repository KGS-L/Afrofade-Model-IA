\set ON_ERROR_STOP on
BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
CREATE TABLE auth.users(id UUID PRIMARY KEY);
CREATE TABLE public.salons(
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name TEXT NOT NULL, phone TEXT, country TEXT,
 plan VARCHAR(20) NOT NULL DEFAULT 'PRO', quota_limit INT NOT NULL DEFAULT 30,
 quota_used INT NOT NULL DEFAULT 0, storage_used_bytes BIGINT NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.user_profiles(
 user_id UUID PRIMARY KEY REFERENCES auth.users(id), role VARCHAR(20) NOT NULL CHECK(role IN('customer','salon','admin')),
 salon_id UUID REFERENCES public.salons(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.subscriptions(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), salon_id UUID NOT NULL REFERENCES public.salons(id));
CREATE TABLE public.clients_heads(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), salon_id UUID NOT NULL REFERENCES public.salons(id));
CREATE TABLE public.payment_transactions(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), salon_id UUID REFERENCES public.salons(id));

INSERT INTO auth.users VALUES
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222'),
 ('33333333-3333-4333-8333-333333333333'),
 ('44444444-4444-4444-8444-444444444444');
INSERT INTO public.salons(id,name,plan,quota_limit,quota_used) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Legacy A','VIP',90,17),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Legacy B','PRO',30,3);
INSERT INTO public.user_profiles(user_id,role,salon_id,created_at) VALUES
 ('11111111-1111-4111-8111-111111111111','salon','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',NOW()-INTERVAL '100 days'),
 ('22222222-2222-4222-8222-222222222222','salon','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',NOW()-INTERVAL '50 days'),
 ('33333333-3333-4333-8333-333333333333','salon',NULL,NOW()-INTERVAL '20 days'),
 ('44444444-4444-4444-8444-444444444444','admin',NULL,NOW());
INSERT INTO public.subscriptions(salon_id) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
INSERT INTO public.clients_heads(salon_id) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
INSERT INTO public.payment_transactions(salon_id) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

\ir ../migrations/20_marketplace_identity_foundation.sql

-- Existing live relationship must be upgraded rather than duplicated.
INSERT INTO public.salon_memberships(salon_id,user_id,role,status,started_at)
VALUES('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','manager','invited',NOW()-INTERVAL '5 days');
-- Historical ended relationship must remain historical; a new live owner can coexist.
INSERT INTO public.salon_memberships(salon_id,user_id,role,status,started_at,ended_at)
VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','professional','ended',NOW()-INTERVAL '200 days',NOW()-INTERVAL '150 days');

\ir ../migrations/21_marketplace_legacy_salon_backfill.sql

CREATE FUNCTION pg_temp.assert_true(v BOOLEAN,m TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN IF NOT COALESCE(v,FALSE) THEN RAISE EXCEPTION 'assertion failed: %',m; END IF; END $$;

SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.salon_memberships WHERE salon_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND user_id='11111111-1111-4111-8111-111111111111' AND status='active' AND role='owner'),'legacy A owner created');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.salon_memberships WHERE salon_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' AND user_id='22222222-2222-4222-8222-222222222222' AND status='active' AND role='owner'),'existing live membership upgraded');
SELECT pg_temp.assert_true((SELECT count(*)=2 FROM public.salon_memberships WHERE salon_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND user_id='11111111-1111-4111-8111-111111111111'),'ended history preserved plus live owner');
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM public.salon_memberships WHERE user_id='33333333-3333-4333-8333-333333333333'),'unmatched salon user not guessed');
SELECT pg_temp.assert_true((SELECT count(*)=0 FROM public.salon_memberships WHERE user_id='44444444-4444-4444-8444-444444444444'),'admin not converted');
SELECT pg_temp.assert_true((SELECT role='salon' AND salon_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' FROM public.user_profiles WHERE user_id='11111111-1111-4111-8111-111111111111'),'legacy role remains');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.subscriptions WHERE salon_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'subscription preserved');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.clients_heads WHERE salon_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'3D ownership preserved');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.payment_transactions WHERE salon_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'payment preserved');
SELECT pg_temp.assert_true((SELECT legacy_salon_users=3 AND legacy_salon_users_with_salon=2 AND unmatched_legacy_salon_users=1 AND migrated_active_owner_memberships=2 AND missing_owner_memberships=0 FROM public.marketplace_legacy_backfill_report),'validation report correct');

-- Idempotency: apply again and verify live counts do not change.
\ir ../migrations/21_marketplace_legacy_salon_backfill.sql
SELECT pg_temp.assert_true((SELECT count(*)=2 FROM public.salon_memberships WHERE status='active' AND role='owner'),'rerun idempotent');
SELECT pg_temp.assert_true((SELECT count(*)=3 FROM public.salon_memberships),'no duplicate rows on rerun');

ROLLBACK;
\echo 'Marketplace legacy salon backfill PostgreSQL contract: PASS'
