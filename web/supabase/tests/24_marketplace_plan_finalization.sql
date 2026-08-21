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
 plan VARCHAR(20) NOT NULL DEFAULT 'PRO' CHECK(plan IN('PRO','VIP','EXTRA')), quota_limit INT NOT NULL DEFAULT 30,
 quota_used INT NOT NULL DEFAULT 0, storage_used_bytes BIGINT NOT NULL DEFAULT 0,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.user_profiles(user_id UUID PRIMARY KEY REFERENCES auth.users(id),role VARCHAR(20) NOT NULL CHECK(role IN('customer','salon','admin')),salon_id UUID REFERENCES public.salons(id),created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE public.payment_transactions(
 id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), user_id UUID NOT NULL REFERENCES auth.users(id), salon_id UUID REFERENCES public.salons(id),
 provider VARCHAR(50) NOT NULL DEFAULT 'money_fusion', purpose VARCHAR(20) NOT NULL CHECK(purpose IN('subscription','credits')),
 product_id VARCHAR(100) NOT NULL, term_id VARCHAR(20), amount_fcfa INT NOT NULL, currency VARCHAR(10) NOT NULL DEFAULT 'XOF',
 status VARCHAR(20) NOT NULL DEFAULT 'pending', provider_token TEXT, provider_transaction_id TEXT, metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), paid_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.subscriptions(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),salon_id UUID NOT NULL REFERENCES public.salons(id),provider VARCHAR(50) NOT NULL,amount_fcfa INT NOT NULL,status VARCHAR(20) NOT NULL,expires_at TIMESTAMPTZ NOT NULL,created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE public.credit_wallets(user_id UUID PRIMARY KEY REFERENCES auth.users(id),balance INT NOT NULL DEFAULT 0,updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE public.credit_transactions(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),user_id UUID NOT NULL REFERENCES auth.users(id),delta INT NOT NULL,reason TEXT NOT NULL,reference_id UUID,idempotency_key TEXT UNIQUE,created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE public.credit_purchases(id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),user_id UUID NOT NULL REFERENCES auth.users(id),payment_transaction_id UUID NOT NULL UNIQUE REFERENCES public.payment_transactions(id),pack_id TEXT NOT NULL,credits INT NOT NULL,status TEXT NOT NULL,created_at TIMESTAMPTZ DEFAULT NOW(),credited_at TIMESTAMPTZ);

INSERT INTO auth.users VALUES('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
INSERT INTO public.user_profiles(user_id,role) VALUES('11111111-1111-4111-8111-111111111111','customer'),('22222222-2222-4222-8222-222222222222','customer');
INSERT INTO public.salons(id,name) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Salon A');

\ir ../migrations/20_marketplace_identity_foundation.sql
\ir ../migrations/23_marketplace_capability_resolver.sql
\ir ../migrations/24_marketplace_plan_finalization.sql

CREATE FUNCTION pg_temp.assert_true(v BOOLEAN,m TEXT) RETURNS VOID LANGUAGE plpgsql AS $$ BEGIN IF NOT COALESCE(v,FALSE) THEN RAISE EXCEPTION 'assertion failed: %',m; END IF; END $$;
INSERT INTO public.professional_profiles(id,user_id,professional_name,operating_mode)
VALUES('99999999-9999-4999-8999-999999999999','11111111-1111-4111-8111-111111111111','Pro A','independent'),
      ('88888888-8888-4888-8888-888888888888','22222222-2222-4222-8222-222222222222','Pro B','independent');

INSERT INTO public.payment_transactions(id,user_id,purpose,product_id,term_id,amount_fcfa,metadata)
VALUES('10000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','subscription','PROFESSIONAL_PRO','mensuel',1500,'{"professionalProfileId":"99999999-9999-4999-8999-999999999999","months":"1"}');
SELECT public.finalize_afrofade_payment('10000000-0000-4000-8000-000000000001','provider-pro-1');
SELECT pg_temp.assert_true((SELECT status='paid' FROM public.payment_transactions WHERE id='10000000-0000-4000-8000-000000000001'),'pro payment paid');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.professional_subscriptions WHERE professional_profile_id='99999999-9999-4999-8999-999999999999' AND status='active'),'pro entitlement created');

INSERT INTO public.payment_transactions(id,user_id,purpose,product_id,term_id,amount_fcfa,metadata)
VALUES('10000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','subscription','PROFESSIONAL_PRO','3mois',4000,'{"professionalProfileId":"99999999-9999-4999-8999-999999999999","months":"3"}');
SELECT public.finalize_afrofade_payment('10000000-0000-4000-8000-000000000002','provider-pro-2');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.professional_subscriptions WHERE professional_profile_id='99999999-9999-4999-8999-999999999999' AND status='active'),'pro renewal reuses active entitlement');
SELECT pg_temp.assert_true((SELECT expires_at > NOW()+INTERVAL '3 months' FROM public.professional_subscriptions WHERE professional_profile_id='99999999-9999-4999-8999-999999999999' AND status='active'),'pro renewal extends expiry');

INSERT INTO public.payment_transactions(id,user_id,salon_id,purpose,product_id,term_id,amount_fcfa,metadata)
VALUES('10000000-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','subscription','SALON_VIP','mensuel',4900,'{"months":"1"}');
SELECT public.finalize_afrofade_payment('10000000-0000-4000-8000-000000000003','provider-salon-1');
SELECT pg_temp.assert_true((SELECT plan='VIP' AND marketplace_product_id='SALON_VIP' FROM public.salons WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'stable salon product maps to legacy plan');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM public.subscriptions WHERE salon_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' AND status='active'),'salon subscription created');

INSERT INTO public.payment_transactions(id,user_id,purpose,product_id,amount_fcfa,metadata)
VALUES('10000000-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111111','credits','pack-test',500,'{"credits":"5"}');
SELECT public.finalize_afrofade_payment('10000000-0000-4000-8000-000000000004','provider-credit');
SELECT pg_temp.assert_true((SELECT balance=5 FROM public.credit_wallets WHERE user_id='11111111-1111-4111-8111-111111111111'),'consumer credits unchanged');

INSERT INTO public.payment_transactions(id,user_id,purpose,product_id,amount_fcfa,metadata)
VALUES('10000000-0000-4000-8000-000000000005','11111111-1111-4111-8111-111111111111','subscription','PROFESSIONAL_PRO',1500,'{"professionalProfileId":"88888888-8888-4888-8888-888888888888","months":"1"}');
DO $$ BEGIN
 BEGIN PERFORM public.finalize_afrofade_payment('10000000-0000-4000-8000-000000000005','forged'); RAISE EXCEPTION 'foreign pro entitlement accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='foreign pro entitlement accepted' OR SQLERRM NOT LIKE '%professional_subscription_owner_mismatch%' THEN RAISE; END IF; END;
END $$;
SELECT pg_temp.assert_true((SELECT status='pending' FROM public.payment_transactions WHERE id='10000000-0000-4000-8000-000000000005'),'failed finalization rolls back payment state');

ROLLBACK;
\echo 'Marketplace plan finalization PostgreSQL contract: PASS'
