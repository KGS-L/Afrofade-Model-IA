-- Afrofade Database Migration 04: persistent AI jobs
-- BMAD Story 7.2 — PostgreSQL/Supabase-backed queue with atomic claims.

CREATE TABLE IF NOT EXISTS ai_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type VARCHAR(40) NOT NULL CHECK (
        job_type IN ('head_reconstruction', 'hair_generation', 'hair_normalization', 'hair_fit')
    ),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    salon_id UUID REFERENCES salons(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (
        status IN ('queued', 'running', 'completed', 'failed', 'cancelled')
    ),
    provider VARCHAR(100) NOT NULL,
    input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_payload JSONB,
    progress_percent SMALLINT NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
    attempts INT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    max_attempts INT NOT NULL DEFAULT 3 CHECK (max_attempts >= 1),
    priority SMALLINT NOT NULL DEFAULT 0,
    idempotency_key TEXT NOT NULL UNIQUE,
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    locked_by TEXT,
    lease_expires_at TIMESTAMPTZ,
    error_code VARCHAR(100),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ai_jobs_owner_required CHECK (user_id IS NOT NULL OR salon_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_queue
    ON ai_jobs(status, available_at, priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_id ON ai_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_salon_id ON ai_jobs(salon_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_job_type ON ai_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_lease_expires_at ON ai_jobs(lease_expires_at)
    WHERE status = 'running';

ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_jobs_select_own_user ON ai_jobs;
CREATE POLICY ai_jobs_select_own_user
ON ai_jobs FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS ai_jobs_select_own_salon ON ai_jobs;
CREATE POLICY ai_jobs_select_own_salon
ON ai_jobs FOR SELECT
USING (
    salon_id IS NOT NULL
    AND EXISTS (
        SELECT 1
        FROM user_profiles profile
        WHERE profile.user_id = auth.uid()
          AND profile.salon_id = ai_jobs.salon_id
          AND profile.role IN ('salon', 'admin')
    )
);

DROP POLICY IF EXISTS ai_jobs_admin_select_all ON ai_jobs;
CREATE POLICY ai_jobs_admin_select_all
ON ai_jobs FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM user_profiles profile
        WHERE profile.user_id = auth.uid()
          AND profile.role = 'admin'
    )
);

-- Browser/authenticated roles intentionally receive no INSERT/UPDATE/DELETE policy.

CREATE OR REPLACE FUNCTION enqueue_ai_job(
    p_job_type VARCHAR,
    p_user_id UUID,
    p_salon_id UUID,
    p_provider VARCHAR,
    p_input_payload JSONB,
    p_idempotency_key TEXT,
    p_max_attempts INT DEFAULT 3,
    p_priority SMALLINT DEFAULT 0
) RETURNS SETOF ai_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    existing ai_jobs%ROWTYPE;
BEGIN
    IF p_job_type NOT IN ('head_reconstruction', 'hair_generation', 'hair_normalization', 'hair_fit') THEN
        RAISE EXCEPTION 'unsupported_job_type';
    END IF;

    IF p_user_id IS NULL AND p_salon_id IS NULL THEN
        RAISE EXCEPTION 'job_owner_required';
    END IF;

    IF p_provider IS NULL OR btrim(p_provider) = '' THEN
        RAISE EXCEPTION 'job_provider_required';
    END IF;

    IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
        RAISE EXCEPTION 'idempotency_key_required';
    END IF;

    IF p_max_attempts < 1 THEN
        RAISE EXCEPTION 'invalid_max_attempts';
    END IF;

    SELECT * INTO existing
    FROM ai_jobs
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
        IF existing.job_type IS DISTINCT FROM p_job_type
           OR existing.user_id IS DISTINCT FROM p_user_id
           OR existing.salon_id IS DISTINCT FROM p_salon_id
           OR existing.provider IS DISTINCT FROM p_provider THEN
            RAISE EXCEPTION 'idempotency_key_conflict';
        END IF;

        RETURN NEXT existing;
        RETURN;
    END IF;

    RETURN QUERY
    INSERT INTO ai_jobs (
        job_type,
        user_id,
        salon_id,
        provider,
        input_payload,
        idempotency_key,
        max_attempts,
        priority
    ) VALUES (
        p_job_type,
        p_user_id,
        p_salon_id,
        p_provider,
        COALESCE(p_input_payload, '{}'::jsonb),
        p_idempotency_key,
        p_max_attempts,
        p_priority
    )
    RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION claim_ai_jobs(
    p_worker_id TEXT,
    p_limit INT DEFAULT 1,
    p_lease_seconds INT DEFAULT 300
) RETURNS SETOF ai_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_worker_id IS NULL OR btrim(p_worker_id) = '' THEN
        RAISE EXCEPTION 'worker_id_required';
    END IF;

    RETURN QUERY
    WITH candidates AS (
        SELECT job.id
        FROM ai_jobs job
        WHERE job.status = 'queued'
          AND job.available_at <= NOW()
          AND job.attempts < job.max_attempts
        ORDER BY job.priority DESC, job.created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT LEAST(GREATEST(p_limit, 1), 50)
    )
    UPDATE ai_jobs job
    SET status = 'running',
        attempts = job.attempts + 1,
        locked_at = NOW(),
        locked_by = p_worker_id,
        lease_expires_at = NOW() + make_interval(secs => LEAST(GREATEST(p_lease_seconds, 10), 3600)),
        started_at = COALESCE(job.started_at, NOW()),
        updated_at = NOW()
    FROM candidates
    WHERE job.id = candidates.id
    RETURNING job.*;
END;
$$;

REVOKE ALL ON FUNCTION enqueue_ai_job(VARCHAR, UUID, UUID, VARCHAR, JSONB, TEXT, INT, SMALLINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION claim_ai_jobs(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION enqueue_ai_job(VARCHAR, UUID, UUID, VARCHAR, JSONB, TEXT, INT, SMALLINT) TO service_role;
GRANT EXECUTE ON FUNCTION claim_ai_jobs(TEXT, INT, INT) TO service_role;

-- Direct mutations remain reserved for trusted server/service-role code.
REVOKE INSERT, UPDATE, DELETE ON ai_jobs FROM anon, authenticated;
