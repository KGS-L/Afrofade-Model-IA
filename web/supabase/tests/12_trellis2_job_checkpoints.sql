\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
END $$;
CREATE TABLE ai_jobs(id UUID PRIMARY KEY, status TEXT NOT NULL, locked_by TEXT, lease_expires_at TIMESTAMPTZ);
CREATE TABLE hair_asset_versions(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), style_id VARCHAR NOT NULL, version INT NOT NULL,
 provider TEXT NOT NULL, source_job_id UUID, raw_bucket TEXT NOT NULL, raw_path TEXT NOT NULL,
 generation_cost_fcfa INT, provider_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 UNIQUE(style_id,version)
);
\ir ../migrations/12_trellis2_job_checkpoints.sql

CREATE FUNCTION pg_temp.assert_true(value BOOLEAN, message TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN IF NOT COALESCE(value,FALSE) THEN RAISE EXCEPTION 'assertion failed: %',message; END IF; END $$;

INSERT INTO ai_jobs VALUES
 ('11111111-1111-4111-8111-111111111111','running','worker-a',NOW()+interval '5 minutes'),
 ('22222222-2222-4222-8222-222222222222','running','worker-a',NOW()-interval '1 second'),
 ('33333333-3333-4333-8333-333333333333','running','worker-a',NOW()+interval '5 minutes');

SELECT pg_temp.assert_true((SELECT count(*)=1 FROM checkpoint_trellis2_job(
 '11111111-1111-4111-8111-111111111111','worker-a',jsonb_build_object('submission_intended_at',NOW()))),'live owned lease');
DO $$ BEGIN
 BEGIN PERFORM checkpoint_trellis2_job('11111111-1111-4111-8111-111111111111','wrong','{}'); RAISE EXCEPTION 'wrong worker accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='wrong worker accepted' THEN RAISE; END IF; END;
 BEGIN PERFORM checkpoint_trellis2_job('22222222-2222-4222-8222-222222222222','worker-a','{}'); RAISE EXCEPTION 'expired lease accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='expired lease accepted' THEN RAISE; END IF; END;
 BEGIN PERFORM checkpoint_trellis2_job('11111111-1111-4111-8111-111111111111','worker-a','{"unknown":1}'); RAISE EXCEPTION 'unsupported key accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='unsupported key accepted' THEN RAISE; END IF; END;
 BEGIN PERFORM checkpoint_trellis2_job('11111111-1111-4111-8111-111111111111','worker-a','[]'); RAISE EXCEPTION 'invalid patch type accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='invalid patch type accepted' THEN RAISE; END IF; END;
 BEGIN PERFORM checkpoint_trellis2_job('11111111-1111-4111-8111-111111111111','worker-a','{"raw_bucket":"hair-assets"}'); RAISE EXCEPTION 'incomplete raw ref accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='incomplete raw ref accepted' THEN RAISE; END IF; END;
END $$;

SELECT pg_temp.assert_true(NOT accept_trellis2_webhook('33333333-3333-4333-8333-333333333333','fal-early','{"request_id":"fal-early"}'),'webhook before checkpoint rejected');

SELECT * FROM checkpoint_trellis2_job('11111111-1111-4111-8111-111111111111','worker-a',
 '{"raw_bucket":"hair-assets","raw_path":"raw/styles/a/v1/raw.glb"}');
DO $$ BEGIN
 BEGIN PERFORM checkpoint_trellis2_job('11111111-1111-4111-8111-111111111111','worker-a',
  '{"raw_bucket":"other","raw_path":"raw/styles/a/v1/other.glb"}'); RAISE EXCEPTION 'immutable conflict accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='immutable conflict accepted' THEN RAISE; END IF; END;
END $$;

SELECT pg_temp.assert_true(accept_trellis2_webhook('11111111-1111-4111-8111-111111111111','fal-1','{"request_id":"fal-1","status":"OK"}'),'webhook correlation');
SELECT pg_temp.assert_true((SELECT provider_request_id='fal-1' FROM trellis2_job_checkpoints WHERE job_id='11111111-1111-4111-8111-111111111111'),'request id recovered');
SELECT pg_temp.assert_true(accept_trellis2_webhook('11111111-1111-4111-8111-111111111111','fal-1','{"request_id":"fal-1","status":"OK"}'),'identical replay');
DO $$ BEGIN
 BEGIN PERFORM accept_trellis2_webhook('11111111-1111-4111-8111-111111111111','fal-2','{"request_id":"fal-2"}'); RAISE EXCEPTION 'request conflict accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='request conflict accepted' THEN RAISE; END IF; END;
 BEGIN PERFORM accept_trellis2_webhook('11111111-1111-4111-8111-111111111111','fal-1','{"request_id":"fal-1","status":"DIFFERENT"}'); RAISE EXCEPTION 'payload conflict accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='payload conflict accepted' THEN RAISE; END IF; END;
 BEGIN PERFORM accept_trellis2_webhook('11111111-1111-4111-8111-111111111111','fal-1','{"request_id":"wrong"}'); RAISE EXCEPTION 'payload identity mismatch accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='payload identity mismatch accepted' THEN RAISE; END IF; END;
 BEGIN PERFORM accept_trellis2_webhook('11111111-1111-4111-8111-111111111111','fal-1',jsonb_build_object('request_id','fal-1','padding',repeat('x',1048577))); RAISE EXCEPTION 'oversize payload accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='oversize payload accepted' THEN RAISE; END IF; END;
END $$;

SELECT pg_temp.assert_true((SELECT count(*) FROM create_trellis2_hair_asset_draft('style-a',1,
 '11111111-1111-4111-8111-111111111111','hair-assets','raw/styles/style-a/v1/raw.glb',600,'{"lora":"v1"}'))=1,'draft create');
SELECT pg_temp.assert_true((SELECT count(*) FROM create_trellis2_hair_asset_draft('style-a',1,
 '11111111-1111-4111-8111-111111111111','hair-assets','raw/styles/style-a/v1/raw.glb',600,'{"lora":"v1"}'))=1,'draft replay');
SELECT pg_temp.assert_true((SELECT count(*)=1 FROM hair_asset_versions WHERE style_id='style-a' AND version=1),'one draft');
DO $$ BEGIN
 BEGIN PERFORM create_trellis2_hair_asset_draft('style-a',1,'22222222-2222-4222-8222-222222222222','hair-assets','raw/styles/style-a/v1/raw.glb',600,'{"lora":"v1"}'); RAISE EXCEPTION 'identity conflict accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='identity conflict accepted' THEN RAISE; END IF; END;
 BEGIN PERFORM create_trellis2_hair_asset_draft('style-a',1,'11111111-1111-4111-8111-111111111111','hair-assets','raw/styles/style-a/v1/other.glb',600,'{"lora":"v2"}'); RAISE EXCEPTION 'provenance conflict accepted';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM='provenance conflict accepted' THEN RAISE; END IF; END;
END $$;
ROLLBACK;
\echo 'TRELLIS.2 PostgreSQL contract: PASS'
