-- Afrofade Database Migration 08: durable canonical head assets
-- BMAD Story 7.5 — persist FLAME output metadata after durable object upload.

CREATE TABLE IF NOT EXISTS head_assets (
    id UUID PRIMARY KEY,
    source_job_id UUID NOT NULL UNIQUE REFERENCES ai_jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
    owner_type VARCHAR(20) NOT NULL CHECK (owner_type IN ('customer', 'salon_client')),
    owner_id UUID NOT NULL,
    provider VARCHAR(100) NOT NULL,
    mesh_bucket VARCHAR(100) NOT NULL,
    mesh_path TEXT NOT NULL,
    coordinate_system VARCHAR(40) NOT NULL DEFAULT 'Y_UP_RIGHT_HANDED'
        CHECK (coordinate_system = 'Y_UP_RIGHT_HANDED'),
    unit VARCHAR(20) NOT NULL DEFAULT 'meter' CHECK (unit = 'meter'),
    scalp_anchor_version VARCHAR(100) NOT NULL,
    scalp_anchors_bucket VARCHAR(100),
    scalp_anchors_path TEXT,
    preview_bucket VARCHAR(100),
    preview_path TEXT,
    vertex_count INT CHECK (vertex_count IS NULL OR vertex_count >= 0),
    polygon_count INT CHECK (polygon_count IS NULL OR polygon_count >= 0),
    fit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT head_assets_owner_required CHECK (user_id IS NOT NULL OR salon_id IS NOT NULL),
    CONSTRAINT head_assets_scalp_ref_complete CHECK (
        (scalp_anchors_bucket IS NULL AND scalp_anchors_path IS NULL)
        OR (scalp_anchors_bucket IS NOT NULL AND scalp_anchors_path IS NOT NULL)
    ),
    CONSTRAINT head_assets_preview_ref_complete CHECK (
        (preview_bucket IS NULL AND preview_path IS NULL)
        OR (preview_bucket IS NOT NULL AND preview_path IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_head_assets_user_id ON head_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_head_assets_salon_id ON head_assets(salon_id);
CREATE INDEX IF NOT EXISTS idx_head_assets_source_job_id ON head_assets(source_job_id);

ALTER TABLE head_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS head_assets_select_own_user ON head_assets;
CREATE POLICY head_assets_select_own_user
ON head_assets FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS head_assets_select_own_salon ON head_assets;
CREATE POLICY head_assets_select_own_salon
ON head_assets FOR SELECT
USING (
    salon_id IS NOT NULL
    AND EXISTS (
        SELECT 1
        FROM user_profiles profile
        WHERE profile.user_id = auth.uid()
          AND profile.salon_id = head_assets.salon_id
          AND profile.role IN ('salon', 'admin')
    )
);

DROP POLICY IF EXISTS head_assets_admin_select_all ON head_assets;
CREATE POLICY head_assets_admin_select_all
ON head_assets FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM user_profiles profile
        WHERE profile.user_id = auth.uid()
          AND profile.role = 'admin'
    )
);

REVOKE ALL ON head_assets FROM anon;
REVOKE INSERT, UPDATE, DELETE ON head_assets FROM authenticated;
GRANT SELECT ON head_assets TO authenticated;

CREATE OR REPLACE FUNCTION persist_head_asset(
    p_id UUID,
    p_source_job_id UUID,
    p_provider VARCHAR,
    p_mesh_bucket VARCHAR,
    p_mesh_path TEXT,
    p_scalp_anchor_version VARCHAR,
    p_vertex_count INT,
    p_polygon_count INT,
    p_fit_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS SETOF head_assets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    job ai_jobs%ROWTYPE;
    derived_owner_type VARCHAR(20);
    derived_owner_id UUID;
BEGIN
    SELECT * INTO job
    FROM ai_jobs
    WHERE id = p_source_job_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'source_job_not_found';
    END IF;

    IF job.job_type <> 'head_reconstruction' THEN
        RAISE EXCEPTION 'source_job_not_head_reconstruction';
    END IF;

    IF job.status NOT IN ('running', 'completed') THEN
        RAISE EXCEPTION 'source_job_not_persistable';
    END IF;

    IF p_id IS NULL OR p_provider IS NULL OR btrim(p_provider) = ''
       OR p_mesh_bucket IS NULL OR btrim(p_mesh_bucket) = ''
       OR p_mesh_path IS NULL OR btrim(p_mesh_path) = ''
       OR p_scalp_anchor_version IS NULL OR btrim(p_scalp_anchor_version) = '' THEN
        RAISE EXCEPTION 'invalid_head_asset_payload';
    END IF;

    IF p_vertex_count IS NOT NULL AND p_vertex_count < 0 THEN
        RAISE EXCEPTION 'invalid_vertex_count';
    END IF;
    IF p_polygon_count IS NOT NULL AND p_polygon_count < 0 THEN
        RAISE EXCEPTION 'invalid_polygon_count';
    END IF;

    IF job.salon_id IS NOT NULL THEN
        derived_owner_type := 'salon_client';
        derived_owner_id := job.salon_id;
    ELSE
        derived_owner_type := 'customer';
        derived_owner_id := job.user_id;
    END IF;

    INSERT INTO head_assets (
        id,
        source_job_id,
        user_id,
        salon_id,
        owner_type,
        owner_id,
        provider,
        mesh_bucket,
        mesh_path,
        coordinate_system,
        unit,
        scalp_anchor_version,
        vertex_count,
        polygon_count,
        fit_metadata
    ) VALUES (
        p_id,
        p_source_job_id,
        job.user_id,
        job.salon_id,
        derived_owner_type,
        derived_owner_id,
        p_provider,
        p_mesh_bucket,
        p_mesh_path,
        'Y_UP_RIGHT_HANDED',
        'meter',
        p_scalp_anchor_version,
        p_vertex_count,
        p_polygon_count,
        COALESCE(p_fit_metadata, '{}'::jsonb)
    )
    ON CONFLICT (source_job_id) DO UPDATE SET
        provider = EXCLUDED.provider,
        mesh_bucket = EXCLUDED.mesh_bucket,
        mesh_path = EXCLUDED.mesh_path,
        scalp_anchor_version = EXCLUDED.scalp_anchor_version,
        vertex_count = EXCLUDED.vertex_count,
        polygon_count = EXCLUDED.polygon_count,
        fit_metadata = EXCLUDED.fit_metadata,
        updated_at = NOW()
    WHERE head_assets.id = EXCLUDED.id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'head_asset_idempotency_conflict';
    END IF;

    RETURN QUERY SELECT * FROM head_assets WHERE source_job_id = p_source_job_id;
END;
$$;

REVOKE ALL ON FUNCTION persist_head_asset(UUID, UUID, VARCHAR, VARCHAR, TEXT, VARCHAR, INT, INT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION persist_head_asset(UUID, UUID, VARCHAR, VARCHAR, TEXT, VARCHAR, INT, INT, JSONB) TO service_role;
