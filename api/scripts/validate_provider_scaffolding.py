#!/usr/bin/env python3
"""Deterministic validation for BMAD Story 8.2 provider scaffolding."""

from __future__ import annotations

import inspect
from pathlib import Path
import sys

API_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = API_ROOT.parent
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from services.hair.providers import (
    HairProviderDisabledError,
    HairProviderJobNotFoundError,
    HairProviderJobStatus,
    HairProviderMode,
    HairProviderNotReadyError,
    HunyuanMultiViewHairProvider,
    ManualHairProvider,
    MeshyHairProvider,
    build_scaffold_registry,
    get_production_provider,
    resolve_provider_name,
)


def assert_manual_provider_uses_submitted_input() -> None:
    provider = ManualHairProvider(enabled=True)
    job = provider.submit(
        {"style_id": "afro-1", "hair_name": "Dense Afro"},
        request_id="request-manual-1",
    )
    result = provider.get_result(job.provider_job_id)

    assert result.request_id == "request-manual-1"
    assert result.provider_job_id == job.provider_job_id
    assert result.metadata["input_keys"] == ["hair_name", "style_id"]
    assert result.status is HairProviderJobStatus.SCAFFOLDED
    assert result.success is False
    assert result.raw_asset_url is None

    source = inspect.getsource(ManualHairProvider.get_result)
    if "input_data = job.input_data" not in source:
        raise AssertionError("ManualHairProvider.get_result must read input_data from its submitted job")
    print("[PASS] ManualHairProvider.get_result uses request-owned input_data; no undefined free variable")


def assert_jobs_and_results_are_per_request() -> None:
    provider = ManualHairProvider(enabled=True)
    job_a = provider.submit({"style_id": "afro-a"}, request_id="request-a")
    job_b = provider.submit({"style_id": "afro-b"}, request_id="request-b")

    assert job_a.provider_job_id != job_b.provider_job_id
    assert provider.get_result(job_a.provider_job_id).request_id == "request-a"
    assert provider.get_result(job_b.provider_job_id).request_id == "request-b"

    try:
        provider.get_result("manual_fake_constant_job")
    except HairProviderJobNotFoundError:
        pass
    else:
        raise AssertionError("Unknown/fake provider job id unexpectedly resolved")

    print("[PASS] provider jobs/results are request-scoped and never use a constant fake id")


def assert_scaffolds_are_fail_closed() -> None:
    providers = [
        ManualHairProvider(enabled=True),
        HunyuanMultiViewHairProvider(enabled=True),
        MeshyHairProvider(enabled=True),
    ]

    for index, provider in enumerate(providers):
        job = provider.submit({"style_id": f"style-{index}"}, request_id=f"req-{index}")
        result = provider.get_result(job.provider_job_id)
        assert provider.mode is HairProviderMode.SCAFFOLD
        assert job.status is HairProviderJobStatus.SCAFFOLDED
        assert result.status is HairProviderJobStatus.SCAFFOLDED
        assert result.success is False
        assert result.raw_asset_url is None
        assert result.error_code == "provider_scaffold_not_ready"

        try:
            get_production_provider(provider.provider_name, registry={provider.provider_name: provider})
        except HairProviderNotReadyError:
            pass
        else:
            raise AssertionError(f"Scaffold provider {provider.provider_name} escaped production gate")

    print("[PASS] scaffold mode is explicit and cannot masquerade as provider success")


def assert_providers_default_disabled() -> None:
    registry = build_scaffold_registry(env={})
    if any(provider.enabled for provider in registry.values()):
        raise AssertionError("A temporary hair provider is enabled by default")

    for name, provider in registry.items():
        try:
            provider.submit({"style_id": "blocked"}, request_id=f"blocked-{name}")
        except HairProviderDisabledError:
            pass
        else:
            raise AssertionError(f"Disabled provider {name} accepted a job")

    print("[PASS] every temporary hair provider is disabled by default")


def assert_provider_remaps_are_explicit() -> None:
    cases = {
        "trellis": ("trellis2", True),
        "trellis2": ("trellis2", False),
        "hunyuan3d": ("hunyuan_multiview", True),
        "hunyuan_multiview": ("hunyuan_multiview", False),
        "meshy": ("meshy", False),
        "manual": ("manual", False),
    }
    for requested, expected in cases.items():
        resolution = resolve_provider_name(requested)
        assert (resolution.resolved, resolution.remapped) == expected

    print("[PASS] provider aliases/remaps are explicit and observable in ProviderResolution")


def assert_scaffold_module_has_no_embedded_live_wiring() -> None:
    source = (API_ROOT / "services" / "hair" / "providers.py").read_text(encoding="utf-8")
    forbidden = [
        "api.fal.ai",
        "fal_client",
        "api.meshy.ai",
        "requests.post(",
        "httpx.post(",
        "HUNYUAN_API_KEY",
        "MESHY_API_KEY",
        "FAL_KEY",
    ]
    found = [fragment for fragment in forbidden if fragment in source]
    if found:
        raise AssertionError(f"Story 8.2 accidentally wired a real provider: {found}")

    print("[PASS] remaining Story 8.2 scaffolds contain no paid/live provider API wiring")


def main() -> None:
    assert_manual_provider_uses_submitted_input()
    assert_jobs_and_results_are_per_request()
    assert_scaffolds_are_fail_closed()
    assert_providers_default_disabled()
    assert_provider_remaps_are_explicit()
    assert_scaffold_module_has_no_embedded_live_wiring()
    print("\nBMAD Story 8.2 provider scaffolding: PASS")


if __name__ == "__main__":
    main()
