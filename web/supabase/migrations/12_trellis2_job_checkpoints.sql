-- Story 8.4: lease-protected, restart-safe TRELLIS.2 checkpoints.
CREATE TABLE IF NOT EXISTS trellis2_job_checkpoints (
  job_id UUID PRIMARY KEY REFERENCES ai_jobs(id) ON DELETE CASCADE,
  submission_intended_at TIMESTAMPTZ,
  provider_request_id TEXT UNIQUE,
  provider_submitted_at TIMESTAMPTZ,
  webhook_payload JSONB,
  raw_bucket TEXT, raw_path TEXT,
  draft_asset_id UUID REFERENCES hair_asset_versions(id) ON DELETE SET NULL,
  canonical_asset_id UUID REFERENCES hair_asset_versions(id) ON DELETE SET NULL,
  duplicate_risk BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trellis_raw_ref_complete CHECK ((raw_bucket IS NULL) = (raw_path IS NULL))
);
ALTER TABLE trellis2_job_checkpoints ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON trellis2_job_checkpoints FROM anon, authenticated;

CREATE OR REPLACE FUNCTION checkpoint_trellis2_job(p_job_id UUID, p_worker_id TEXT,
  p_patch JSONB) RETURNS SETOF trellis2_job_checkpoints LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public AS $$
BEGIN
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' THEN RAISE EXCEPTION 'trellis2_checkpoint_patch_invalid'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(COALESCE(p_patch,'{}'::jsonb)) key
    WHERE key NOT IN ('submission_intended_at','provider_request_id','provider_submitted_at','raw_bucket','raw_path','draft_asset_id','canonical_asset_id','duplicate_risk'))
  THEN RAISE EXCEPTION 'trellis2_checkpoint_key_unsupported'; END IF;
  IF NOT EXISTS (SELECT 1 FROM ai_jobs WHERE id=p_job_id AND status='running'
    AND locked_by=p_worker_id AND lease_expires_at > NOW()) THEN RAISE EXCEPTION 'trellis2_lease_required'; END IF;
  INSERT INTO trellis2_job_checkpoints(job_id) VALUES(p_job_id) ON CONFLICT DO NOTHING;
  IF p_patch ? 'provider_request_id' AND EXISTS (
    SELECT 1 FROM trellis2_job_checkpoints WHERE job_id=p_job_id AND provider_request_id IS NOT NULL
      AND provider_request_id <> p_patch->>'provider_request_id'
  ) THEN RAISE EXCEPTION 'fal_request_id_conflict'; END IF;
  IF EXISTS (SELECT 1 FROM trellis2_job_checkpoints c WHERE c.job_id=p_job_id AND (
    (p_patch ? 'submission_intended_at' AND c.submission_intended_at IS NOT NULL AND c.submission_intended_at IS DISTINCT FROM (p_patch->>'submission_intended_at')::timestamptz) OR
    (p_patch ? 'provider_submitted_at' AND c.provider_submitted_at IS NOT NULL AND c.provider_submitted_at IS DISTINCT FROM (p_patch->>'provider_submitted_at')::timestamptz) OR
    (p_patch ? 'raw_bucket' AND c.raw_bucket IS NOT NULL AND c.raw_bucket IS DISTINCT FROM p_patch->>'raw_bucket') OR
    (p_patch ? 'raw_path' AND c.raw_path IS NOT NULL AND c.raw_path IS DISTINCT FROM p_patch->>'raw_path') OR
    (p_patch ? 'draft_asset_id' AND c.draft_asset_id IS NOT NULL AND c.draft_asset_id IS DISTINCT FROM (p_patch->>'draft_asset_id')::uuid) OR
    (p_patch ? 'canonical_asset_id' AND c.canonical_asset_id IS NOT NULL AND c.canonical_asset_id IS DISTINCT FROM (p_patch->>'canonical_asset_id')::uuid)
  )) THEN RAISE EXCEPTION 'trellis2_checkpoint_immutable_conflict'; END IF;
  RETURN QUERY UPDATE trellis2_job_checkpoints c SET
    submission_intended_at=COALESCE(submission_intended_at,(p_patch->>'submission_intended_at')::timestamptz),
    provider_request_id=COALESCE(provider_request_id,p_patch->>'provider_request_id'),
    provider_submitted_at=COALESCE(provider_submitted_at,(p_patch->>'provider_submitted_at')::timestamptz),
    raw_bucket=COALESCE(raw_bucket,p_patch->>'raw_bucket'), raw_path=COALESCE(raw_path,p_patch->>'raw_path'),
    draft_asset_id=COALESCE(draft_asset_id,(p_patch->>'draft_asset_id')::uuid),
    canonical_asset_id=COALESCE(canonical_asset_id,(p_patch->>'canonical_asset_id')::uuid),
    duplicate_risk=duplicate_risk OR COALESCE((p_patch->>'duplicate_risk')::boolean,FALSE), updated_at=NOW()
  WHERE c.job_id=p_job_id RETURNING c.*;
END $$;

CREATE OR REPLACE FUNCTION create_trellis2_hair_asset_draft(
  p_style_id VARCHAR, p_version INT, p_source_job_id UUID, p_raw_bucket TEXT,
  p_raw_path TEXT, p_generation_cost_fcfa INT, p_provider_metadata JSONB
) RETURNS SETOF hair_asset_versions LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE existing hair_asset_versions%ROWTYPE;
BEGIN
  INSERT INTO hair_asset_versions(style_id,version,provider,source_job_id,raw_bucket,raw_path,generation_cost_fcfa,provider_metadata)
  VALUES(p_style_id,p_version,'trellis2',p_source_job_id,p_raw_bucket,p_raw_path,p_generation_cost_fcfa,COALESCE(p_provider_metadata,'{}'::jsonb))
  ON CONFLICT(style_id,version) DO NOTHING RETURNING * INTO existing;
  IF NOT FOUND THEN
    SELECT * INTO existing FROM hair_asset_versions WHERE style_id=p_style_id AND version=p_version FOR UPDATE;
    IF existing.provider <> 'trellis2' OR existing.source_job_id IS DISTINCT FROM p_source_job_id
      OR existing.raw_bucket IS DISTINCT FROM p_raw_bucket OR existing.raw_path IS DISTINCT FROM p_raw_path
      OR existing.generation_cost_fcfa IS DISTINCT FROM p_generation_cost_fcfa
      OR existing.provider_metadata IS DISTINCT FROM COALESCE(p_provider_metadata,'{}'::jsonb)
    THEN RAISE EXCEPTION 'hair_asset_draft_identity_conflict'; END IF;
  END IF;
  RETURN NEXT existing;
END $$;

DROP FUNCTION IF EXISTS accept_trellis2_webhook(TEXT,JSONB);
CREATE OR REPLACE FUNCTION accept_trellis2_webhook(p_job_id UUID, p_provider_request_id TEXT, p_payload JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE current_request_id TEXT; current_payload JSONB;
BEGIN
 IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN RAISE EXCEPTION 'fal_webhook_payload_invalid'; END IF;
 IF pg_column_size(p_payload) > 1048576 THEN RAISE EXCEPTION 'fal_webhook_payload_too_large'; END IF;
 IF p_provider_request_id IS NULL OR btrim(p_provider_request_id)='' THEN RAISE EXCEPTION 'fal_request_id_required'; END IF;
 IF p_payload->>'request_id' IS DISTINCT FROM p_provider_request_id THEN RAISE EXCEPTION 'fal_webhook_identity_invalid'; END IF;
 SELECT provider_request_id, webhook_payload INTO current_request_id, current_payload
 FROM trellis2_job_checkpoints WHERE job_id=p_job_id FOR UPDATE;
 IF NOT FOUND THEN RETURN FALSE; END IF;
 IF current_request_id IS NOT NULL AND current_request_id <> p_provider_request_id THEN
   RAISE EXCEPTION 'fal_request_id_conflict';
 END IF;
 IF current_payload IS NOT NULL AND current_payload IS DISTINCT FROM p_payload THEN
   RAISE EXCEPTION 'fal_webhook_replay_conflict';
 END IF;
 UPDATE trellis2_job_checkpoints SET provider_request_id=COALESCE(provider_request_id,p_provider_request_id),
   provider_submitted_at=COALESCE(provider_submitted_at,NOW()), webhook_payload=COALESCE(webhook_payload,p_payload),updated_at=NOW()
 WHERE job_id=p_job_id;
 RETURN TRUE;
END $$;
REVOKE ALL ON FUNCTION checkpoint_trellis2_job(UUID,TEXT,JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION create_trellis2_hair_asset_draft(VARCHAR,INT,UUID,TEXT,TEXT,INT,JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION accept_trellis2_webhook(UUID,TEXT,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION checkpoint_trellis2_job(UUID,TEXT,JSONB), accept_trellis2_webhook(UUID,TEXT,JSONB), create_trellis2_hair_asset_draft(VARCHAR,INT,UUID,TEXT,TEXT,INT,JSONB) TO service_role;
