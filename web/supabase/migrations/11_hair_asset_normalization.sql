-- Afrofade Database Migration 11: durable HairAssetNormalizer commit/audit RPCs
-- BMAD Story 8.3 — draft raw provenance -> validated canonical hair asset.

CREATE OR REPLACE FUNCTION persist_hair_asset_normalization(
    p_style_id VARCHAR,
    p_version INT,
    p_provider VARCHAR,
    p_raw_bucket VARCHAR,
    p_raw_path TEXT,
    p_canonical_bucket VARCHAR,
    p_canonical_path TEXT,
    p_preview_bucket VARCHAR,
    p_preview_path TEXT,
    p_anchor_map_bucket VARCHAR,
    p_anchor_map_path TEXT,
    p_scalp_anchor_version VARCHAR,
    p_polygon_count INT,
    p_lods JSONB,
    p_provider_metadata JSONB,
    p_validation_report JSONB
) RETURNS SETOF hair_asset_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target hair_asset_versions%ROWTYPE;
BEGIN
    IF p_style_id IS NULL OR btrim(p_style_id) = '' OR p_version < 1 THEN
        RAISE EXCEPTION 'invalid_hair_asset_normalization_target';
    END IF;
    IF p_provider IS NULL OR btrim(p_provider) = '' THEN
        RAISE EXCEPTION 'hair_asset_normalization_provider_required';
    END IF;
    IF p_raw_bucket <> 'hair-assets' OR p_canonical_bucket <> 'hair-assets'
       OR p_preview_bucket <> 'hair-assets' OR p_anchor_map_bucket <> 'hair-assets' THEN
        RAISE EXCEPTION 'hair_asset_normalization_bucket_invalid';
    END IF;
    IF p_scalp_anchor_version IS NULL OR btrim(p_scalp_anchor_version) = '' THEN
        RAISE EXCEPTION 'hair_asset_normalization_anchor_version_required';
    END IF;
    IF p_polygon_count IS NULL OR p_polygon_count < 1 THEN
        RAISE EXCEPTION 'hair_asset_normalization_polygon_count_invalid';
    END IF;
    IF jsonb_typeof(COALESCE(p_lods, '[]'::jsonb)) <> 'array' THEN
        RAISE EXCEPTION 'hair_asset_normalization_lods_must_be_array';
    END IF;
    IF jsonb_typeof(COALESCE(p_provider_metadata, '{}'::jsonb)) <> 'object' THEN
        RAISE EXCEPTION 'hair_asset_normalization_provider_metadata_must_be_object';
    END IF;
    IF jsonb_typeof(COALESCE(p_validation_report, '{}'::jsonb)) <> 'object' THEN
        RAISE EXCEPTION 'hair_asset_normalization_validation_report_must_be_object';
    END IF;
    IF NOT (COALESCE(p_validation_report, '{}'::jsonb) @> '{"valid": true}'::jsonb) THEN
        RAISE EXCEPTION 'hair_asset_normalization_report_must_be_valid';
    END IF;

    SELECT * INTO target
    FROM hair_asset_versions
    WHERE style_id = p_style_id
      AND version = p_version
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'hair_asset_version_not_found';
    END IF;
    IF target.status <> 'draft' THEN
        RAISE EXCEPTION 'hair_asset_version_must_be_draft_for_normalization';
    END IF;
    IF target.provider <> p_provider THEN
        RAISE EXCEPTION 'hair_asset_normalization_provider_provenance_mismatch';
    END IF;
    IF target.raw_bucket <> p_raw_bucket OR target.raw_path <> p_raw_path THEN
        RAISE EXCEPTION 'hair_asset_normalization_raw_provenance_mismatch';
    END IF;

    UPDATE hair_asset_versions
    SET canonical_bucket = p_canonical_bucket,
        canonical_path = p_canonical_path,
        preview_bucket = p_preview_bucket,
        preview_path = p_preview_path,
        anchor_map_bucket = p_anchor_map_bucket,
        anchor_map_path = p_anchor_map_path,
        coordinate_system = 'Y_UP_RIGHT_HANDED',
        unit = 'meter',
        scalp_anchor_version = p_scalp_anchor_version,
        polygon_count = p_polygon_count,
        lods = COALESCE(p_lods, '[]'::jsonb),
        provider_metadata = provider_metadata || COALESCE(p_provider_metadata, '{}'::jsonb),
        validation_report = p_validation_report,
        status = 'validated'
    WHERE id = target.id;

    RETURN QUERY
    SELECT *
    FROM hair_asset_versions
    WHERE id = target.id;
END;
$$;

-- A failed normalization remains a draft, but the failure report is durable so
-- provider cost/provenance is not lost and retries can be investigated.
CREATE OR REPLACE FUNCTION record_hair_asset_normalization_failure(
    p_style_id VARCHAR,
    p_version INT,
    p_validation_report JSONB
) RETURNS SETOF hair_asset_versions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    target hair_asset_versions%ROWTYPE;
BEGIN
    IF p_style_id IS NULL OR btrim(p_style_id) = '' OR p_version < 1 THEN
        RAISE EXCEPTION 'invalid_hair_asset_normalization_target';
    END IF;
    IF jsonb_typeof(COALESCE(p_validation_report, '{}'::jsonb)) <> 'object' THEN
        RAISE EXCEPTION 'hair_asset_normalization_validation_report_must_be_object';
    END IF;
    IF NOT (COALESCE(p_validation_report, '{}'::jsonb) @> '{"valid": false}'::jsonb) THEN
        RAISE EXCEPTION 'hair_asset_normalization_failure_report_must_be_invalid';
    END IF;

    SELECT * INTO target
    FROM hair_asset_versions
    WHERE style_id = p_style_id
      AND version = p_version
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'hair_asset_version_not_found';
    END IF;
    IF target.status <> 'draft' THEN
        RAISE EXCEPTION 'hair_asset_version_failure_audit_requires_draft';
    END IF;

    UPDATE hair_asset_versions
    SET validation_report = p_validation_report
    WHERE id = target.id;

    RETURN QUERY
    SELECT *
    FROM hair_asset_versions
    WHERE id = target.id;
END;
$$;

REVOKE ALL ON FUNCTION persist_hair_asset_normalization(
    VARCHAR, INT, VARCHAR, VARCHAR, TEXT, VARCHAR, TEXT, VARCHAR, TEXT,
    VARCHAR, TEXT, VARCHAR, INT, JSONB, JSONB, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION persist_hair_asset_normalization(
    VARCHAR, INT, VARCHAR, VARCHAR, TEXT, VARCHAR, TEXT, VARCHAR, TEXT,
    VARCHAR, TEXT, VARCHAR, INT, JSONB, JSONB, JSONB
) TO service_role;

REVOKE ALL ON FUNCTION record_hair_asset_normalization_failure(VARCHAR, INT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_hair_asset_normalization_failure(VARCHAR, INT, JSONB) TO service_role;
