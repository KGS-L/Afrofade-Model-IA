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
CREATE TABLE auth.users(id UUID PRIMARY KEY, email TEXT);
CREATE TABLE public.salons(
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name VARCHAR(255) NOT NULL, phone VARCHAR(50), country VARCHAR(100),
 plan VARCHAR(20) NOT NULL DEFAULT 'PRO', quota_limit INT NOT NULL DEFAULT 30, quota_used INT NOT NULL DEFAULT 0,
 storage_used_bytes BIGINT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.user_profiles(
 user_id UUID PRIMARY KEY REFERENCES auth.users(id), role VARCHAR(20) NOT NULL CHECK(role IN('customer','salon','admin')),
 salon_id UUID REFERENCES public.salons(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO auth.users VALUES
 ('11111111-1111-4111-8111-111111111111','owner@example.com'),
 ('22222222-2222-4222-8222-222222222222','manager@example.com'),
 ('33333333-3333-4333-8333-333333333333','pro@example.com');
INSERT INTO public.user_profiles(user_id,role) VALUES
 ('11111111-1111-4111-8111-111111111111','customer'),
 ('22222222-2222-4222-8222-222222222222','customer'),
 ('33333333-3333-4333-8333-333333333333','customer');

\ir ../migrations/20_marketplace_identity_foundation.sql
\ir ../migrations/22_marketplace_salon_membership_ops.sql

CREATE FUNCTION pg_temp.assert_true(v BOOLEAN,m TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN IF NOT COALESCE(v,FALSE) THEN RAISE EXCEPTION 'assertion failed: %',m; END IF; END $$;

DO $$
DECLARE r JSONB; s1 UUID; s2 UUID;
BEGIN
  r := public.create_marketplace_salon('11111111-1111-4111-8111-111111111111','Salon Alpha','Burkina Faso','+22670000001');
  s1 := (r->>'salon_id')::uuid;
  PERFORM pg_temp.assert_true(EXISTS(SELECT 1 FROM public.salon_memberships WHERE salon_id=s1 AND user_id='11111111-1111-4111-8111-111111111111' AND role='owner' AND status='active'),'creator owner membership');
  PERFORM pg_temp.assert_true((SELECT role='customer' AND salon_id IS NULL FROM public.user_profiles WHERE user_id='11111111-1111-4111-8111-111111111111'),'personal role preserved');

  r := public.create_marketplace_salon('11111111-1111-4111-8111-111111111111','Salon Beta','Burkina Faso','+22670000002');
  s2 := (r->>'salon_id')::uuid;
  PERFORM pg_temp.assert_true(s1<>s2,'distinct salons created');
  PERFORM pg_temp.assert_true((SELECT count(*)=2 FROM public.salon_memberships WHERE user_id='11111111-1111-4111-8111-111111111111' AND role='owner' AND status='active'),'multi-location ownership');

  PERFORM public.create_salon_invitation('11111111-1111-4111-8111-111111111111',s1,'manager@example.com','manager','hash-manager',NOW()+INTERVAL '1 day');
  r := public.accept_salon_invitation('22222222-2222-4222-8222-222222222222','manager@example.com','hash-manager');
  PERFORM pg_temp.assert_true(r->>'role'='manager','manager invitation accepted');

  BEGIN
    PERFORM public.create_salon_invitation('22222222-2222-4222-8222-222222222222',s1,'other@example.com','manager','hash-no',NOW()+INTERVAL '1 day');
    RAISE EXCEPTION 'manager granted manager';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='manager granted manager' OR SQLERRM NOT LIKE '%manager_cannot_grant_manager%' THEN RAISE; END IF;
  END;

  PERFORM public.create_salon_invitation('22222222-2222-4222-8222-222222222222',s1,'pro@example.com','professional','hash-pro',NOW()+INTERVAL '1 day');
  BEGIN
    PERFORM public.accept_salon_invitation('33333333-3333-4333-8333-333333333333','wrong@example.com','hash-pro');
    RAISE EXCEPTION 'email mismatch accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='email mismatch accepted' OR SQLERRM NOT LIKE '%invitation_email_mismatch%' THEN RAISE; END IF;
  END;
  r := public.accept_salon_invitation('33333333-3333-4333-8333-333333333333','pro@example.com','hash-pro');
  PERFORM pg_temp.assert_true(r->>'role'='professional','professional invitation accepted');
  PERFORM pg_temp.assert_true((SELECT count(*)=3 FROM public.salon_memberships WHERE salon_id=s1 AND status='active'),'owner manager professional active');
  PERFORM pg_temp.assert_true(public.marketplace_can_manage_salon('11111111-1111-4111-8111-111111111111',s1),'owner can manage');
  PERFORM pg_temp.assert_true(public.marketplace_can_manage_salon('22222222-2222-4222-8222-222222222222',s1),'manager can manage');
  PERFORM pg_temp.assert_true(NOT public.marketplace_can_manage_salon('33333333-3333-4333-8333-333333333333',s1),'professional cannot manage');
END $$;

SELECT pg_temp.assert_true(NOT has_table_privilege('authenticated','public.salon_invitations','SELECT'),'authenticated cannot enumerate invitations');
SELECT pg_temp.assert_true((SELECT count(*)=2 FROM public.salon_invitations WHERE status='accepted'),'accepted invitations audited');

ROLLBACK;
\echo 'Marketplace salon membership operations PostgreSQL contract: PASS'
