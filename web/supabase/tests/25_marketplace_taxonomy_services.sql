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
CREATE TABLE public.salons(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),name TEXT NOT NULL,phone TEXT,country TEXT,plan VARCHAR(20) NOT NULL DEFAULT 'PRO',quota_limit INT NOT NULL DEFAULT 30,quota_used INT NOT NULL DEFAULT 0,storage_used_bytes BIGINT NOT NULL DEFAULT 0,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE public.user_profiles(user_id UUID PRIMARY KEY REFERENCES auth.users(id),role VARCHAR(20) NOT NULL CHECK(role IN('customer','salon','admin')),salon_id UUID REFERENCES public.salons(id),created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE public.hairstyles_catalog(id VARCHAR(100) PRIMARY KEY,category VARCHAR(50) NOT NULL,title TEXT NOT NULL,description TEXT,thumbnail_url TEXT NOT NULL,mesh_3d_url TEXT,is_premium_upsell BOOLEAN NOT NULL DEFAULT FALSE,created_at TIMESTAMPTZ DEFAULT NOW());
INSERT INTO public.hairstyles_catalog(id,category,title,thumbnail_url) VALUES
 ('fade-1','fade','Fade','/fade.png'),('locks-1','locks','Locks','/locks.png'),('tresses-1','tresses','Cornrows','/cornrows.png'),('barbe-1','barbe','Barbe','/beard.png'),('afro-1','afro','Twists','/twists.png'),('afro-2','afro','Mohawk','/mohawk.png');
INSERT INTO auth.users VALUES('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
INSERT INTO public.user_profiles(user_id,role) VALUES('11111111-1111-4111-8111-111111111111','customer'),('22222222-2222-4222-8222-222222222222','customer');
INSERT INTO public.salons(id,name) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Salon A'),('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Salon B');
\ir ../migrations/20_marketplace_identity_foundation.sql
\ir ../migrations/25_marketplace_taxonomy_services.sql
CREATE FUNCTION pg_temp.assert_true(v BOOLEAN,m TEXT) RETURNS VOID LANGUAGE plpgsql AS $$ BEGIN IF NOT COALESCE(v,FALSE) THEN RAISE EXCEPTION 'assertion failed: %',m; END IF; END $$;

SELECT pg_temp.assert_true((SELECT count(*)=6 FROM public.hair_taxonomy WHERE kind='category'),'six categories seeded');
SELECT pg_temp.assert_true((SELECT count(*)=7 FROM public.hair_taxonomy WHERE kind='style'),'style seeds present');
SELECT pg_temp.assert_true((SELECT count(*)=6 FROM public.hair_style_taxonomy_bridge),'legacy styles bridged');
SELECT pg_temp.assert_true((SELECT tax.slug='low-taper-fade' FROM public.hair_style_taxonomy_bridge b JOIN public.hair_taxonomy tax ON tax.id=b.taxonomy_id WHERE b.legacy_style_id='fade-1'),'3D fade bridge correct');
\ir ../migrations/25_marketplace_taxonomy_services.sql
SELECT pg_temp.assert_true((SELECT count(*)=13 FROM public.hair_taxonomy),'taxonomy rerun idempotent');

INSERT INTO public.professional_profiles(id,user_id,professional_name,operating_mode) VALUES('99999999-9999-4999-8999-999999999999','11111111-1111-4111-8111-111111111111','Pro A','independent');
INSERT INTO public.salon_memberships(id,salon_id,user_id,role,status,started_at) VALUES
 ('70000000-0000-4000-8000-000000000001','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','professional','active',NOW()),
 ('70000000-0000-4000-8000-000000000002','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','professional','active',NOW());
INSERT INTO public.marketplace_services(id,provider_type,professional_profile_id,name,duration_minutes,price_amount) VALUES('60000000-0000-4000-8000-000000000001','professional','99999999-9999-4999-8999-999999999999','Knotless Braids',240,15000);
INSERT INTO public.marketplace_services(id,provider_type,salon_id,name,duration_minutes,price_amount) VALUES('60000000-0000-4000-8000-000000000002','salon','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Cornrows',120,8000);
DO $$ BEGIN
 BEGIN INSERT INTO public.marketplace_services(provider_type,salon_id,professional_profile_id,name,duration_minutes,price_amount) VALUES('salon','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','99999999-9999-4999-8999-999999999999','Bad',30,1000); RAISE EXCEPTION 'mixed context accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
INSERT INTO public.salon_service_professionals(service_id,membership_id) VALUES('60000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000001');
DO $$ BEGIN
 BEGIN INSERT INTO public.salon_service_professionals(service_id,membership_id) VALUES('60000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000002'); RAISE EXCEPTION 'foreign salon membership accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='foreign salon membership accepted' OR SQLERRM NOT LIKE '%service_professional_membership_invalid%' THEN RAISE; END IF; END;
END $$;

ROLLBACK;
\echo 'Marketplace taxonomy/services PostgreSQL contract: PASS'
