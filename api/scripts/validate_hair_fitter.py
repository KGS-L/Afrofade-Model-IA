#!/usr/bin/env python3
"""Offline validation harness for Story 9.1 HairFitter contract."""
from __future__ import annotations

from pathlib import Path
import sys

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from services.fitting.hair_fitter import (
    HairFitter,
    HairFitterAssetUnpublishedError,
    HairFitterError,
)


def test_reject_unpublished():
    fitter = HairFitter()
    try:
        fitter.fit(
            head_id="head-1",
            style_id="afro-taper",
            version=1,
            status="draft",
        )
        raise AssertionError("Expected HairFitterAssetUnpublishedError for draft asset")
    except HairFitterAssetUnpublishedError:
        pass
    print("[PASS] HairFitter rejects unpublished hair assets fail-closed")


def test_fit_with_scalp_anchors():
    fitter = HairFitter()
    head_anchors = {"crown": {"x": 0.0, "y": 0.18, "z": 0.02}}
    hair_anchors = {"crown": {"x": 0.0, "y": 0.05, "z": 0.01}}

    res = fitter.fit(
        head_id="head-101",
        style_id="afro-fade-v1",
        version=1,
        status="published",
        head_scalp_anchors=head_anchors,
        hair_scalp_anchors=hair_anchors,
        head_reference_scale=1.0,
        hair_reference_scale=1.0,
    )

    assert res.head_id == "head-101"
    assert res.style_id == "afro-fade-v1"
    assert res.used_fallback_alignment is False
    assert res.transform.translation == (0.0, 0.13, 0.01)
    assert res.transform.scale == (1.0, 1.0, 1.0)
    print("[PASS] HairFitter computes 3D transform matrix from scalp anchors")


def test_cache_determinism():
    fitter = HairFitter()
    head_anchors = {"crown": {"x": 0.0, "y": 0.18, "z": 0.02}}
    hair_anchors = {"crown": {"x": 0.0, "y": 0.05, "z": 0.01}}

    res1 = fitter.fit(
        head_id="head-101",
        style_id="afro-fade-v1",
        version=1,
        head_scalp_anchors=head_anchors,
        hair_scalp_anchors=hair_anchors,
    )

    res2 = fitter.fit(
        head_id="head-101",
        style_id="afro-fade-v1",
        version=1,
        head_scalp_anchors=head_anchors,
        hair_scalp_anchors=hair_anchors,
    )

    assert res1.cache_key == res2.cache_key
    assert res1 is res2  # Exact object instance from cache hit
    print("[PASS] HairFitter returns deterministic results and cache hits")


def test_fallback_alignment():
    fitter = HairFitter()
    res = fitter.fit(
        head_id="head-fallback",
        style_id="braids-short",
        version=2,
        status="published",
    )
    assert res.used_fallback_alignment is True
    assert res.transform.translation == (0.0, 0.0, 0.0)
    print("[PASS] HairFitter fallback alignment handles missing scalp anchors gracefully")


def main():
    test_reject_unpublished()
    test_fit_with_scalp_anchors()
    test_cache_determinism()
    test_fallback_alignment()
    print("\nBMAD Story 9.1 HairFitter contract: PASS")


if __name__ == "__main__":
    main()
