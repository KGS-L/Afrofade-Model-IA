#!/usr/bin/env python3
"""Offline validation harness for Story 9.3 Line-Up & Durable Export."""
from __future__ import annotations

from pathlib import Path
import sys
from uuid import UUID

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from services.fitting.lineup_export import (
    LineUpConfig,
    LineUpExportEngine,
    LineUpInvalidConfigError,
)

USER_ID = UUID("11111111-1111-4111-8111-111111111111")
EXPORT_ID = UUID("33333333-3333-4333-8333-333333333333")


def test_lineup_config_bounds():
    # Valid config
    cfg = LineUpConfig(hairline_offset_mm=-5.0, taper_fade_intensity=0.8, sideburn_contour_sharpness=0.9)
    assert cfg.hairline_offset_mm == -5.0

    # Invalid hairline offset (> 15mm)
    try:
        LineUpConfig(hairline_offset_mm=25.0)
        raise AssertionError("Expected LineUpInvalidConfigError")
    except LineUpInvalidConfigError:
        pass

    # Invalid taper fade (< 0)
    try:
        LineUpConfig(taper_fade_intensity=-0.1)
        raise AssertionError("Expected LineUpInvalidConfigError")
    except LineUpInvalidConfigError:
        pass

    print("[PASS] LineUpConfig bounds validation (-15mm..+15mm hairline, 0..1 fade/contour)")


def test_durable_tryon_export_creation():
    engine = LineUpExportEngine()
    cfg = LineUpConfig(hairline_offset_mm=2.5, taper_fade_intensity=0.7)

    record = engine.create_export(
        export_id=EXPORT_ID,
        user_id=USER_ID,
        head_id="head-007",
        head_version=1,
        style_id="afro-taper-fade",
        style_version=2,
        lineup_config=cfg,
        filename="tryon-look.png",
    )

    assert record.export_id == EXPORT_ID
    assert record.user_id == USER_ID
    assert record.head_id == "head-007"
    assert record.head_version == 1
    assert record.style_id == "afro-taper-fade"
    assert record.style_version == 2
    assert record.export_ref.bucket == "tryons"
    assert record.export_ref.path == f"exports/users/{USER_ID}/{EXPORT_ID}/tryon-look.png"
    print("[PASS] Durable try-on export references exact head/hair versions and tryons storage bucket")


def test_export_idempotency():
    engine = LineUpExportEngine()
    cfg = LineUpConfig(hairline_offset_mm=0.0)

    rec1 = engine.create_export(
        export_id=EXPORT_ID,
        user_id=USER_ID,
        head_id="head-007",
        head_version=1,
        style_id="afro-taper-fade",
        style_version=2,
        lineup_config=cfg,
    )

    rec2 = engine.create_export(
        export_id=EXPORT_ID,
        user_id=USER_ID,
        head_id="head-007",
        head_version=1,
        style_id="afro-taper-fade",
        style_version=2,
        lineup_config=cfg,
    )

    assert rec1.idempotency_key == rec2.idempotency_key
    assert rec1 is rec2
    print("[PASS] Try-on export creation is idempotent for identical parameters")


def main():
    test_lineup_config_bounds()
    test_durable_tryon_export_creation()
    test_export_idempotency()
    print("\nBMAD Story 9.3 Line-Up & Durable Export: PASS")


if __name__ == "__main__":
    main()
