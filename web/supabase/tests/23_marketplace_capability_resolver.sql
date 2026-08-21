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
 plan VARCHAR(20) NOT NULL DEFAULT 'PRO', quota_limit INT NOT NULL DEFAULT 30, quota_used INT NOT NULL DEFAULT 0,
 storage_used_bytes BIGINT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.user_profiles(
 user_id UUID PRIMARY KEY REFERENCES auth.users(id), role VARCHAR(20) NOT NULL CHECK(role IN('customer','salon','admin')),
 salon_id UUID REFERENCES public.salons(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.subscriptions(
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), salon_id UUID NOT NULL REFERENCES public.salons(id), provider TEXT NOT NULL DEFAULT 'manual',
 amount_fcfa INT NOT NULL DEFAULT 1, status VARCHAR(20) NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.payment_transactions(id UUID PRIMARY KEY DEFAULT uuid_generate_v4());

INSERT INTO auth.users VALUES
 ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222'),
 ('33333333-3333-4333-8333-333333333333'),('44444444-4444-4444-8444-444444444444'),
 ('55555555-5555-4555-8555-555555555555');
INSERT INTO public.user_profiles(user_id,role) VALUES
 ('11111111-1111-4111-8111-111111111111','customer'),('22222222-2222-4222-8222-222222222222','customer'),
 ('33333333-3333-4333-8333-333333333333','customer'),('44444444-4444-4444-8444-444444444444','customer'),
 ('55555555-5555-4555-8555-555555555555','admin');
INSERT INTO public.salons(id,name,plan) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Salon A','EXTRA');

\ir ../migrations/20_marketplace_identity_foundation.sql
\ir ../migrations/23_marketplace_capability_resolver.sql

CREATE FUNCTION pg_temp.assert_true(v BOOLEAN,m TEXT) RETURNS VOID LANGUAGE plpgsql AS $$ BEGIN IF NOT COALESCE(v,FALSE) THEN RAISE EXCEPTION 'assertion failed: %',m; END IF; END $$;

INSERT INTO public.professional_profiles(id,user_id,professional_name,operating_mode)
VALUES('99999999-9999-4999-8999-999999999999','11111111-1111-4111-8111-111111111111','Pro A','independent');
SELECT pg_temp.assert_true(public.resolve_marketplace_capability('11111111-1111-4111-8111-111111111111','professional.profile.manage','professional','99999999-9999-4999-8999-999999999999'),'owner manages profile without subscription');
SELECT pg_temp.assert_true(NOT public.resolve_marketplace_capability('11111111-1111-4111-8111-111111111111','professional.independent.list','professional','99999999-9999-4999-8999-999999999999'),'independent listing gated');
SELECT pg_temp.assert_true(NOT public.resolve_marketplace_capability('22222222-2222-4222-8222-222222222222','professional.profile.manage','professional','99999999-9999-4999-8999-999999999999'),'foreign profile denied');

INSERT INTO public.professional_subscriptions(professional_profile_id,user_id,product_id,status,starts_at,expires_at)
VALUES('99999999-9999-4999-8999-999999999999','11111111-1111-4111-8111-111111111111','PROFESSIONAL_PRO','active',NOW()-INTERVAL '1 day',NOW()+INTERVAL '30 days');
SELECT pg_temp.assert_true(public.resolve_marketplace_capability('11111111-1111-4111-8111-111111111111','professional.independent.list','professional','99999999-9999-4999-8999-999999999999'),'active pro entitlement lists');
SELECT pg_temp.assert_true(public.resolve_marketplace_capability('11111111-1111-4111-8111-111111111111','professional.independent.book','professional','99999999-9999-4999-8999-999999999999'),'active pro entitlement books');

INSERT INTO public.salon_memberships(salon_id,user_id,role,status,started_at) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','owner','active',NOW()),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222','manager','active',NOW()),
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','33333333-3333-4333-8333-333333333333','professional','active',NOW());
SELECT pg_temp.assert_true(public.resolve_marketplace_capability('11111111-1111-4111-8111-111111111111','salon.team.manage','salon','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'owner team manage');
SELECT pg_temp.assert_true(public.resolve_marketplace_capability('22222222-2222-4222-8222-222222222222','salon.team.manage','salon','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'manager team manage');
SELECT pg_temp.assert_true(NOT public.resolve_marketplace_capability('33333333-3333-4333-8333-333333333333','salon.team.manage','salon','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'professional team denied');
SELECT pg_temp.assert_true(NOT public.resolve_marketplace_capability('11111111-1111-4111-8111-111111111111','salon.booking.work','salon','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'booking gated without salon subscription');

INSERT INTO public.subscriptions(salon_id,status,expires_at) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','active',NOW()+INTERVAL '30 days');
SELECT pg_temp.assert_true(public.resolve_marketplace_capability('11111111-1111-4111-8111-111111111111','salon.booking.work','salon','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'owner inherits active salon entitlement');
SELECT pg_temp.assert_true(public.resolve_marketplace_capability('33333333-3333-4333-8333-333333333333','salon.booking.work','salon','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'professional inherits active salon entitlement');
SELECT pg_temp.assert_true(public.resolve_marketplace_capability('11111111-1111-4111-8111-111111111111','salon.location.create','salon','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'EXTRA owner can create location');
SELECT pg_temp.assert_true(NOT public.resolve_marketplace_capability('22222222-2222-4222-8222-222222222222','salon.location.create','salon','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'manager cannot create location');
SELECT pg_temp.assert_true(public.resolve_marketplace_capability('55555555-5555-4555-8555-555555555555','admin.marketplace.manage','admin',NULL),'admin capability explicit');

ROLLBACK;
\echo 'Marketplace capability resolver PostgreSQL contract: PASS'
