#!/usr/bin/env python3
"""Provider-independent validation for Afrofade canonical 3D contracts."""

from datetime import UTC, datetime
from pathlib import Path
import sys

from pydantic import ValidationError

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from models.canonical_assets import CanonicalHairAsset, CanonicalHead, TryOnAsset


NOW = datetime.now(UTC).isoformat()


def expect_validation_error(name: str, model, payload: dict) -> None:
    try:
        model.model_validate(payload)
    except ValidationError:
        print(f"[PASS] {name}")
        return
    raise AssertionError(f"[FAIL] {name}: payload unexpectedly validated")


def main() -> None:
    head_payload = {
        "id": "head_demo_001",
        "ownerType": "customer",
        "ownerId": "user_demo_001",
        "sourceJobId": "job_head_001",
        "provider": "flame_pytorch",
        "meshUrl": "https://assets.afrofade.pro/heads/head_demo_001.glb",
        "previewUrl": "https://assets.afrofade.pro/heads/head_demo_001.webp",
        "coordinateSystem": "Y_UP_RIGHT_HANDED",
        "unit": "meter",
        "scalpAnchorVersion": "scalp-v1",
        "scalpAnchorsUrl": "https://assets.afrofade.pro/heads/head_demo_001-anchors.json",
        "vertexCount": 5023,
        "polygonCount": 9976,
        "textureUrls": ["https://assets.afrofade.pro/heads/head_demo_001-albedo.webp"],
        "createdAt": NOW,
    }

    hair_payload = {
        "id": "hair_asset_001",
        "styleId": "locks_short_high_top",
        "version": 1,
        "provider": "manual",
        "sourceJobId": None,
        "meshUrl": "https://assets.afrofade.pro/hair/locks_short_high_top/v1.glb",
        "previewUrl": "https://assets.afrofade.pro/hair/locks_short_high_top/v1.webp",
        "coordinateSystem": "Y_UP_RIGHT_HANDED",
        "unit": "meter",
        "scalpAnchorVersion": "scalp-v1",
        "anchorMapUrl": "https://assets.afrofade.pro/hair/locks_short_high_top/v1-anchors.json",
        "polygonCount": 15000,
        "lods": ["https://assets.afrofade.pro/hair/locks_short_high_top/v1-lod1.glb"],
        "generationCostFcfa": 0,
        "status": "validated",
        "createdAt": NOW,
    }

    try_on_payload = {
        "id": "tryon_001",
        "headId": head_payload["id"],
        "hairAssetId": hair_payload["id"],
        "fitJobId": None,
        "transform": {
            "position": [0.0, 0.0, 0.0],
            "rotation": [0.0, 0.0, 0.0],
            "scale": [1.0, 1.0, 1.0],
        },
        "fittedMeshUrl": None,
        "createdAt": NOW,
    }

    head = CanonicalHead.model_validate(head_payload)
    hair = CanonicalHairAsset.model_validate(hair_payload)
    try_on = TryOnAsset.model_validate(try_on_payload)

    assert CanonicalHead.model_validate(head.model_dump(mode="json")).id == head.id
    assert CanonicalHairAsset.model_validate(hair.model_dump(mode="json")).id == hair.id
    assert TryOnAsset.model_validate(try_on.model_dump(mode="json")).id == try_on.id
    print("[PASS] canonical samples validate and round-trip")

    invalid_frame = {**head_payload, "coordinateSystem": "Z_UP_RIGHT_HANDED"}
    expect_validation_error("invalid coordinate system rejected", CanonicalHead, invalid_frame)

    invalid_unit = {**head_payload, "unit": "centimeter"}
    expect_validation_error("invalid unit rejected", CanonicalHead, invalid_unit)

    invalid_local_mesh = {**head_payload, "meshUrl": "/tmp/generated_models/head.glb"}
    expect_validation_error("local filesystem mesh rejected", CanonicalHead, invalid_local_mesh)

    invalid_anchor_version = {**hair_payload, "scalpAnchorVersion": ""}
    expect_validation_error("empty anchor version rejected", CanonicalHairAsset, invalid_anchor_version)

    print("\nCanonical 3D contracts: PASS")


if __name__ == "__main__":
    main()
