#!/usr/bin/env python3
"""Offline validation harness for Story 8.5 Hunyuan3D Multi-View provider."""
from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
import sys
from types import SimpleNamespace
from uuid import UUID

API_ROOT = Path(__file__).resolve().parents[1]
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from services.hair.hunyuan_provider import HunyuanMultiViewHairProvider, HunyuanProviderError
from services.hair.providers import (
    HairProviderDisabledError,
    HairProviderJobStatus,
    HairProviderMode,
    build_scaffold_registry,
    get_production_provider,
)

JOB_ID = UUID("22222222-2222-4222-8222-222222222222")


class MockResponse:
    def __init__(self, status_code: int, data: dict):
        self.status_code = status_code
        self._data = data
        self.text = str(data)

    def json(self):
        return self._data


class MockTransport:
    def __init__(self):
        self.calls = []

    def request(self, method: str, url: str, **kwargs):
        self.calls.append((method, url, kwargs))
        if "status" in url:
            return MockResponse(200, {"status": "COMPLETED"})
        if method == "GET":
            return MockResponse(200, {"model_glb": {"url": "https://fal.media/hunyuan_mesh.glb"}})
        return MockResponse(200, {"request_id": "hunyuan-req-101"})


def test_fail_closed_by_default():
    provider = HunyuanMultiViewHairProvider.from_env({})
    assert provider.enabled is False
    assert provider.mode is HairProviderMode.LIVE
    try:
        provider.submit({"image_urls": ["https://input.example/1.png"]}, request_id=str(JOB_ID))
        raise AssertionError("Expected HairProviderDisabledError")
    except HairProviderDisabledError:
        pass
    print("[PASS] Hunyuan3D provider disabled by default")


def test_input_validation():
    p = HunyuanMultiViewHairProvider(api_key="test-key", enabled=True)

    # Missing URLs
    try:
        p.submit({}, request_id=str(JOB_ID))
        raise AssertionError("Expected ValueError for missing multi-view images")
    except ValueError:
        pass

    # Non-HTTPS URL
    try:
        p.submit({"image_urls": ["http://insecure.example/1.png"]}, request_id=str(JOB_ID))
        raise AssertionError("Expected ValueError for HTTP image URL")
    except ValueError:
        pass

    print("[PASS] Hunyuan3D input validation (HTTPS multi-view images required)")


def test_submit_status_result():
    transport = MockTransport()
    provider = HunyuanMultiViewHairProvider(
        api_key="test-key", enabled=True, transport=transport, webhook_url="https://api.afrofade.pro/webhooks"
    )

    input_payload = {
        "image_urls": ["https://input.example/front.png", "https://input.example/side.png"],
        "texture_size": 1024,
    }
    job = provider.submit(input_payload, request_id=str(JOB_ID))
    assert job.provider == "hunyuan_multiview"
    assert job.request_id == str(JOB_ID)
    assert job.provider_job_id == "hunyuan-req-101"
    assert job.status is HairProviderJobStatus.SUBMITTED

    status = provider.get_status("hunyuan-req-101")
    assert status is HairProviderJobStatus.SUCCEEDED

    result = provider.get_result("hunyuan-req-101")
    assert result.success is True
    assert result.raw_asset_url == "https://fal.media/hunyuan_mesh.glb"

    print("[PASS] Hunyuan3D submit -> status -> result flow")


def test_production_registry():
    env = {"HUNYUAN_API_KEY": "test-key", "HAIR_PROVIDER_HUNYUAN_MULTIVIEW_ENABLED": "true"}
    registry = build_scaffold_registry(env)
    provider, res = get_production_provider("hunyuan3d", registry=registry)
    assert res.resolved == "hunyuan_multiview"
    assert provider.mode is HairProviderMode.LIVE
    assert provider.enabled is True
    print("[PASS] Hunyuan3D registered and resolvable via alias 'hunyuan3d'")


def main():
    test_fail_closed_by_default()
    test_input_validation()
    test_submit_status_result()
    test_production_registry()
    print("\nBMAD Story 8.5 Hunyuan3D Multi-View provider: PASS")


if __name__ == "__main__":
    main()
