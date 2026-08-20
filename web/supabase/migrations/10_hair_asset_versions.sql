-- Afrofade Database Migration 10: versioned canonical hair assets
-- BMAD Story 8.1 — immutable/auditable catalog versions with one published version per style.

CREATE TABLE IF NOT EXISTS hair_asset_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    style_id VARCHAR(100) NOT NULL REFERENCES hairstyles_catalog(id) ON DELETE RESTRICT,
    version INT NOT NULL CHECK (version >= 1),
    provider VARCHAR(40) NOT NULL CHECK (
        provider IN ('trellis2', 'hunyuan_multiview', 'meshy', 'manual')
    ),
    source_job_id UUID REFERENCES ai_jobs(id) ON DELETE SET NULL,

    -- A version is created as soon as a provider raw artifact exists. Canonical
    -- fields stay nullable while the version is draft so normalization failures
    -- remain auditable instead of losing provider provenance.
    raw_bucket VARCHAR(100) NOT NULL DEFAULT 'hair-assets' CHECK (raw_bucket = 'hair-assets'),
    raw_path TEXT NOT NULL,
    canonical_bucket VARCHAR(100) CHECK (canonical_bucket IS NULL OR canonical_bucket = 'hair-assets'),
    canonical_path TEXT,
    preview_bucket VARCHAR(100) CHECK (preview_bucket IS NULL OR preview_bucket = 'hair-assets'),
    preview_path TEXT,
    anchor_map_bucket VARCHAR(100) CHECK (anchor_map_bucket IS NULL OR anchor_map_bucket = 'hair-assets'),
    anchor_map_path TEXT,

    coordinate_system VARCHAR(40) NOT NULL DEFAULT 'Y_UP_RIGHT_HANDED'
        CHECK (coordinate_system = 'Y_UP_RIGHT_HANDED'),
    unit VARCHAR(20) NOT NULL DEFAULT 'meter' CHECK (unit = 'meter'),
    scalp_anchor_version VARCHAR(100),
    polygon_count INT CHECK (polygon_count IS NULL OR polygon_count >= 0),
    lods JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(lods) = 'array'),
    generation_cost_fcfa INT CHECK (generation_cost_fcfa IS NULL OR generation_cost_fcfa >= 0),
    provider_metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(provider_metadata) = 'object'),
    validation_report JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(validation_report) = 'object'),

    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (
        status IN ('draft', 'validated', 'published', 'retired')
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    retired_at TIMESTAMPTZ,

    CONSTRAINT hair_asset_versions_style_version_unique UNIQUE (style_id, version),
    CONSTRAINT hair_asset_versions_raw_path_contract CHECK (
        raw_path LIKE ('raw/styles/' || style_id || '/v' || version::TEXT || '/%')
        AND raw_path NOT LIKE '/%'
        AND position('//' IN raw_path) = 0
        AND position(chr(92) IN raw_path) = 0
        AND position('/../' IN '/' || raw_path || '/') = 0
        AND position('/./' IN '/' || raw_path || '/') = 0
    ),
    CONSTRAINT hair_asset_versions_canonical_ref_complete CHECK (
        (canonical_bucket IS NULL AND canonical_path IS NULL)
        OR (canonical_bucket IS NOT NULL AND canonical_path IS NOT NULL)
    ),
    CONSTRAINT hair_asset_versions_preview_ref_complete CHECK (
        (preview_bucket IS NULL AND preview_path IS NULL)
        OR (preview_bucket IS NOT NULL AND preview_path IS NOT NULL)
    ),
    CONSTRAINT hair_asset_versions_anchor_ref_complete CHECK (
        (anchor_map_bucket IS NULL AND anchor_map_path IS NULL)
        OR (anchor_map_bucket IS NOT NULL AND anchor_map_path IS NOT NULL)
    ),
    CONSTRAINT hair_asset_versions_canonical_path_contract CHECK (
        canonical_path IS NULL OR (
            canonical_path LIKE ('canonical/styles/' || style_id || '/v' || version::TEXT || '/%')
            AND canonical_path NOT LIKE '/%'
            AND position('//' IN canonical_path) = 0
            AND position(chr(92) IN canonical_path) = 0
            AND position('/../' IN '/' || canonical_path || '/') = 0
            AND position('/./' IN '/' || canonical_path || '/') = 0
        )
    ),
    CONSTRAINT hair_asset_versions_preview_path_contract CHECK (
        preview_path IS NULL OR (
            preview_path LIKE ('canonical/styles/' || style_id || '/v' || version::TEXT || '/%')
            AND preview_path NOT LIKE '/%'
            AND position('//' IN preview_path) = 0
            AND position(chr(92) IN preview_path) = 0
            AND position('/../' IN '/' || preview_path || '/') = 0
            AND position('/./' IN '/' || preview_path || '/') = 0
        )
    ),
    CONSTRAINT hair_asset_versions_anchor_path_contract CHECK (
        anchor_map_path IS NULL OR (
            anchor_map_path LIKE ('canonical/styles/' || style_id || '/v' || version::TEXT || '/%')
            AND anchor_map_path NOT LIKE '/%'
            AND position('//' IN anchor_map_path) = 0
            AND position(chr(92) IN anchor_map_path) = 0
            AND position('/../' IN '/' || anchor_map_path || '/') = 0
            AND position('/./' IN '/' || anchor_map_path || '/') = 0
        )
    ),
    -- A draft can be raw-only. Validation is the gate that proves the provider
    -- output has been normalized into the complete CanonicalHairAsset contract.
    CONSTRAINT hair_asset_versions_validated_payload_complete CHECK (
        status NOT IN ('validated', 'published') OR (
            canonical_bucket IS NOT NULL
            AND canonical_path IS NOT NULL
            AND preview_bucket IS NOT NULL
            AND preview_path IS NOT NULL
            AND anchor_map_bucket IS NOT NULL
            AND anchor_map_path IS NOT NULL
            AND scalp_anchor_version IS NOT NULL
            AND btrim(scalp_anchor_version) <> ''
            AND polygon_count IS NOT NULL
        )
    ),
    CONSTRAINT hair_asset_versions_status_timestamps CHECK (
        (status <> 'published' OR (published_at IS NOT NULL AND retired_at IS NULL))
        AND (status <> 'retired' OR retired_at IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_hair_asset_versions_style
    ON hair_asset_versions(style_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_hair_asset_versions_provider
    ON hair_asset_versions(provider);
CREATE INDEX IF NOT EXISTS idx_hair_asset_versions_source_job
    ON hair_asset_versions(source_job_id)
    WHERE source_job_id IS NOT NULL;

-- Database-level guarantee: a catalog style can expose at most one published version.
CREATE UNIQUE INDEX IF NOT EXISTS idx_hair_asset_versions_one_published_per_style
    ON hair_asset_versions(style_id)
    WHERE status = 'published';

ALTER TABLE hair_asset_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hair_asset_versions_select_published ON hair_asset_versions;
CREATE POLICY hair_asset_versions_select_published
ON hair_asset_versions FOR SELECT
USING (status = 'published');

DROP POLICY IF EXISTS hair_asset_versions_admin_select_all ON hair_asset_versions;
CREATE POLICY hair_asset_versions_admin_select_all
ON hair_asset_versions FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM user_profiles profile
        WHERE profile.user_id = auth.uid()
          AND profile.role = 'admin'
    )
);

REVOKE ALL ON hair_asset_versions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON hair_asset_versions FROM authenticated;
GRANT SELECT ON hair_asset_versions TO anon, authenticated;

-- Published/retired version payloads are immutable. The only permitted published
-- mutation is the lifecycle transition published -> retired.
CREATE OR REPLACE FUNCTION guard_hair_asset_version_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF OLD.status = 'retired' THEN
        IF NEW IS DISTINCT FROM OLD THEN
            RAISE EXCEPTION 'retired_hair_asset_version_is_immutable';
        END IF;
        RETURN NEW;
    END IF;

    IF OLD.status = 'published' THEN
        IF NEW.style_id IS DISTINCT FROM OLD.style_id
           OR NEW.version IS DISTINCT FROM OLD.version
           OR NEW.provider IS DISTINCT FROM OLD.provider
           OR NEW.source_job_id IS DISTINCT FROM OLD.source_job_id
           OR NEW.raw_bucket IS DISTINCT FROM OLD.raw_bucket
           OR NEW.raw_path IS DISTINCT FROM OLD.raw_path
           OR NEW.canonical_bucket IS DISTINCT FROM OLD.canonical_bucket
           OR NEW.canonical_path IS DISTINCT FROM OLD.canonical_path
           OR NEW.preview_bucket IS DISTINCT FROM OLD.preview_bucket
           OR NEW.preview_path IS DISTINCT FROM OLD.preview_path
           OR NEW.anchor_map_bucket IS DISTINCT FROM OLD.anchor_map_bucket
           OR NEW.anchor_map_path IS DISTINCT FROM OLD.anchor_map_path
           OR NEW.coordinate_system IS DISTINCT FROM OLD.coordinate_system
           OR NEW.unit IS DISTINCT FROM OLD.unit
           OR NEW.scalp_anchor_version IS DISTINCT FROM OLD.scalp_anchor_version
           OR NEW.polygon_count IS DISTINCT FROM OLD.polygon_count
           OR NEW.lods IS DISTINCT FROM OLD.lods
           OR NEW.generation_cost_fcfa IS DISTINCT FROM OLD.generation_cost_fcfa
           OR NEW.provider_metadata IS DISTINCT FROM OLD.provider_metadata
           OR NEW.validation_report IS DISTINCT FROM OLD.validation_report
           OR NEW.created_at IS DISTINCT FROM OLD.created_at
           OR NEW.published_at IS DISTINCT FROM OLD.published_at
           OR NEW.retired_at IS DISTINCT FROM OLD.retired_at THEN
            RAISE EXCEPTION 'published_hair_asset_version_payload_is_immutable';
        END IF;
        IF NEW.status NOT IN ('published', 'retired') THEN
            RAISE EXCEPTION 'published_hair_asset_version_invalid_transition';
        END IF;
    ELSIF OLD.status = 'draft' AND NEW.status NOT IN ('draft', 'validated', 'retired') THEN
        RAISE EXCEPTION 'draft_hair_asset_version_invalid_transition';
    ELSIF OLD.status = 'validated' AND NEW.status NOT IN ('validated', 'published', 'retired') THEN
        RAISE EXCEPTION 'validated_hair_asset_version_invalid_transition';
    END IF;

    IF NEW.status = 'published' AND OLD.status <> 'published' THEN
        NEW.published_at := COALESCE(NEW.published_at, NOW());
        NEW.retired_at := NULL;
    END IF;
    IF NEW.status = 'retired' AND OLD.status <> 'retired' THEN
        NEW.retired_at := COALESCE(NEW.retired_at, NOW());
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_hair_asset_version_mutation ON hair_asset_versions;
CREATE TRIGGER trg_guard_hair_asset_version_mutation
BEFORE UPDATE ON hair_asset_versions
FOR EACH ROW
EXECUTE FUNCTION guard_hair_asset_version_mutation();

-- Atomically publish one validated version and retire the previously published
-- version without deleting its row or storage provenance.
CREATE OR REPLACE FUNCTION publish_hair_asset_version(
    p_style_id VARCHAR,
    p_version INT
) RETURNS SETOF hair_asset_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target hair_asset_versions%ROWTYPE;
BEGIN
    IF p_style_id IS NULL OR btrim(p_style_id) = '' OR p_version < 1 THEN
        RAISE EXCEPTION 'invalid_hair_asset_publish_target';
    END IF;

    PERFORM 1
    FROM hairstyles_catalog
    WHERE id = p_style_id
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'hair_style_not_found';
    END IF;

    SELECT * INTO target
    FROM hair_asset_versions
    WHERE style_id = p_style_id
      AND version = p_version
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'hair_asset_version_not_found';
    END IF;
    IF target.status <> 'validated' THEN
        RAISE EXCEPTION 'hair_asset_version_must_be_validated_before_publish';
    END IF;

    UPDATE hair_asset_versions
    SET status = 'retired'
    WHERE style_id = p_style_id
      AND status = 'published'
      AND version <> p_version;

    UPDATE hair_asset_versions
    SET status = 'published'
    WHERE id = target.id;

    RETURN QUERY
    SELECT * FROM hair_asset_versions
    WHERE id = target.id;
END;
$$;

-- Stable catalog resolver. Consumers never need to guess which version is live.
CREATE OR REPLACE FUNCTION resolve_published_hair_asset(
    p_style_id VARCHAR
) RETURNS SETOF hair_asset_versions
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    SELECT *
    FROM hair_asset_versions
    WHERE style_id = p_style_id
      AND status = 'published'
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION publish_hair_asset_version(VARCHAR, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION publish_hair_asset_version(VARCHAR, INT) TO service_role;

REVOKE ALL ON FUNCTION resolve_published_hair_asset(VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_published_hair_asset(VARCHAR) TO anon, authenticated, service_role;
