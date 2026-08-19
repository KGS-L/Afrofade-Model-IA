-- Afrofade Database Migration 05: restart-safe AI worker lifecycle
-- BMAD Story 7.3 — leases, heartbeat, completion, retry and expired-job recovery.

CREATE OR REPLACE FUNCTION heartbeat_ai_job(
    p_job_id UUID,
    p_worker_id TEXT,
    p_lease_seconds INT DEFAULT 300
) RETURNS SETOF ai_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    updated_job ai_jobs%ROWTYPE;
BEGIN
    IF p_worker_id IS NULL OR btrim(p_worker_id) = '' THEN
        RAISE EXCEPTION 'worker_id_required';
    END IF;

    UPDATE ai_jobs job
    SET locked_at = NOW(),
        lease_expires_at = NOW() + make_interval(secs => LEAST(GREATEST(p_lease_seconds, 10), 3600)),
        updated_at = NOW()
    WHERE job.id = p_job_id
      AND job.status = 'running'
      AND job.locked_by = p_worker_id
      AND job.lease_expires_at > NOW()
    RETURNING job.* INTO updated_job;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'job_lease_not_owned';
    END IF;

    RETURN NEXT updated_job;
END;
$$;

CREATE OR REPLACE FUNCTION complete_ai_job(
    p_job_id UUID,
    p_worker_id TEXT,
    p_output_payload JSONB DEFAULT '{}'::jsonb
) RETURNS SETOF ai_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    updated_job ai_jobs%ROWTYPE;
BEGIN
    IF p_worker_id IS NULL OR btrim(p_worker_id) = '' THEN
        RAISE EXCEPTION 'worker_id_required';
    END IF;

    UPDATE ai_jobs job
    SET status = 'completed',
        output_payload = COALESCE(p_output_payload, '{}'::jsonb),
        progress_percent = 100,
        locked_at = NULL,
        locked_by = NULL,
        lease_expires_at = NULL,
        error_code = NULL,
        error_message = NULL,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE job.id = p_job_id
      AND job.status = 'running'
      AND job.locked_by = p_worker_id
      AND job.lease_expires_at > NOW()
    RETURNING job.* INTO updated_job;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'job_lease_not_owned';
    END IF;

    RETURN NEXT updated_job;
END;
$$;

CREATE OR REPLACE FUNCTION fail_ai_job(
    p_job_id UUID,
    p_worker_id TEXT,
    p_error_code TEXT,
    p_error_message TEXT,
    p_retryable BOOLEAN DEFAULT TRUE,
    p_retry_delay_seconds INT DEFAULT 30
) RETURNS SETOF ai_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    updated_job ai_jobs%ROWTYPE;
BEGIN
    IF p_worker_id IS NULL OR btrim(p_worker_id) = '' THEN
        RAISE EXCEPTION 'worker_id_required';
    END IF;

    UPDATE ai_jobs job
    SET status = CASE
            WHEN p_retryable AND job.attempts < job.max_attempts THEN 'queued'
            ELSE 'failed'
        END,
        available_at = CASE
            WHEN p_retryable AND job.attempts < job.max_attempts
                THEN NOW() + make_interval(secs => LEAST(GREATEST(p_retry_delay_seconds, 0), 3600))
            ELSE job.available_at
        END,
        locked_at = NULL,
        locked_by = NULL,
        lease_expires_at = NULL,
        error_code = LEFT(COALESCE(NULLIF(btrim(p_error_code), ''), 'worker_error'), 100),
        error_message = LEFT(COALESCE(p_error_message, 'Worker handler failed.'), 4000),
        completed_at = CASE
            WHEN p_retryable AND job.attempts < job.max_attempts THEN NULL
            ELSE NOW()
        END,
        updated_at = NOW()
    WHERE job.id = p_job_id
      AND job.status = 'running'
      AND job.locked_by = p_worker_id
      AND job.lease_expires_at > NOW()
    RETURNING job.* INTO updated_job;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'job_lease_not_owned';
    END IF;

    RETURN NEXT updated_job;
END;
$$;

CREATE OR REPLACE FUNCTION recover_expired_ai_jobs(
    p_limit INT DEFAULT 100
) RETURNS SETOF ai_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH candidates AS (
        SELECT job.id
        FROM ai_jobs job
        WHERE job.status = 'running'
          AND job.lease_expires_at IS NOT NULL
          AND job.lease_expires_at <= NOW()
        ORDER BY job.lease_expires_at ASC, job.created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT LEAST(GREATEST(p_limit, 1), 500)
    )
    UPDATE ai_jobs job
    SET status = CASE
            WHEN job.attempts < job.max_attempts THEN 'queued'
            ELSE 'failed'
        END,
        available_at = NOW(),
        locked_at = NULL,
        locked_by = NULL,
        lease_expires_at = NULL,
        error_code = 'worker_lease_expired',
        error_message = 'Worker lease expired before the job reached a terminal state.',
        completed_at = CASE
            WHEN job.attempts < job.max_attempts THEN NULL
            ELSE NOW()
        END,
        updated_at = NOW()
    FROM candidates
    WHERE job.id = candidates.id
    RETURNING job.*;
END;
$$;

REVOKE ALL ON FUNCTION heartbeat_ai_job(UUID, TEXT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION complete_ai_job(UUID, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION fail_ai_job(UUID, TEXT, TEXT, TEXT, BOOLEAN, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION recover_expired_ai_jobs(INT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION heartbeat_ai_job(UUID, TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION complete_ai_job(UUID, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION fail_ai_job(UUID, TEXT, TEXT, TEXT, BOOLEAN, INT) TO service_role;
GRANT EXECUTE ON FUNCTION recover_expired_ai_jobs(INT) TO service_role;
