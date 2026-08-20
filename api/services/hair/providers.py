"""Fail-closed hair provider scaffolds for BMAD Story 8.2.

No class in this module performs a real provider API call. Stories 8.4/8.5 (and a
future Meshy benchmark story) must replace a scaffold with a LIVE provider before
it can be returned by ``get_production_provider``.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum
import logging
import os
from typing import Any, Mapping
from uuid import uuid4

logger = logging.getLogger("afrofade.hair.providers")


class HairProviderError(RuntimeError):
    """Base error for provider selection/scaffolding failures."""


class HairProviderDisabledError(HairProviderError):
    """Raised when a provider has not been explicitly enabled."""


class HairProviderNotReadyError(HairProviderError):
    """Raised when a scaffold is requested as a production provider."""


class HairProviderJobNotFoundError(HairProviderError):
    """Raised when a provider-local job identifier is unknown."""


class HairProviderMode(str, Enum):
    SCAFFOLD = "scaffold"
    LIVE = "live"


class HairProviderJobStatus(str, Enum):
    SCAFFOLDED = "scaffolded"
    SUBMITTED = "submitted"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


@dataclass(frozen=True)
class ProviderResolution:
    requested: str
    resolved: str
    remapped: bool


@dataclass(frozen=True)
class HairProviderJob:
    provider: str
    request_id: str
    provider_job_id: str
    mode: HairProviderMode
    status: HairProviderJobStatus
    input_data: dict[str, Any]
    created_at: datetime


@dataclass(frozen=True)
class HairProviderResult:
    provider: str
    request_id: str
    provider_job_id: str
    mode: HairProviderMode
    status: HairProviderJobStatus
    raw_asset_url: str | None = None
    error_code: str | None = None
    error_message: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def success(self) -> bool:
        return self.status is HairProviderJobStatus.SUCCEEDED and bool(self.raw_asset_url)


class BaseHairProvider(ABC):
    """Minimal boundary shared by future real and current scaffold providers."""

    provider_name: str
    mode: HairProviderMode

    def __init__(self, *, enabled: bool = False) -> None:
        self.enabled = bool(enabled)

    def _require_enabled(self) -> None:
        if not self.enabled:
            raise HairProviderDisabledError(f"hair_provider_disabled:{self.provider_name}")

    @abstractmethod
    def submit(self, input_data: Mapping[str, Any], *, request_id: str) -> HairProviderJob:
        raise NotImplementedError

    @abstractmethod
    def get_result(self, provider_job_id: str) -> HairProviderResult:
        raise NotImplementedError


class _InMemoryScaffoldHairProvider(BaseHairProvider):
    """Request-scoped scaffold that can never manufacture a successful asset."""

    mode = HairProviderMode.SCAFFOLD

    def __init__(self, *, enabled: bool = False) -> None:
        super().__init__(enabled=enabled)
        self._jobs: dict[str, HairProviderJob] = {}

    def submit(self, input_data: Mapping[str, Any], *, request_id: str) -> HairProviderJob:
        self._require_enabled()
        clean_request_id = request_id.strip()
        if not clean_request_id:
            raise ValueError("hair_provider_request_id_required")
        if not isinstance(input_data, Mapping):
            raise TypeError("hair_provider_input_must_be_mapping")

        provider_job_id = f"{self.provider_name}_{uuid4().hex}"
        job = HairProviderJob(
            provider=self.provider_name,
            request_id=clean_request_id,
            provider_job_id=provider_job_id,
            mode=self.mode,
            status=HairProviderJobStatus.SCAFFOLDED,
            input_data=dict(input_data),
            created_at=datetime.now(UTC),
        )
        self._jobs[provider_job_id] = job
        logger.warning(
            "hair_provider_scaffold_submit provider=%s request_id=%s provider_job_id=%s",
            self.provider_name,
            clean_request_id,
            provider_job_id,
        )
        return job

    def _get_job(self, provider_job_id: str) -> HairProviderJob:
        self._require_enabled()
        clean_job_id = provider_job_id.strip()
        if not clean_job_id:
            raise HairProviderJobNotFoundError("hair_provider_job_id_required")
        job = self._jobs.get(clean_job_id)
        if job is None:
            raise HairProviderJobNotFoundError(
                f"hair_provider_job_not_found:{self.provider_name}:{clean_job_id}"
            )
        return job

    def _scaffold_result(
        self,
        job: HairProviderJob,
        *,
        metadata: Mapping[str, Any] | None = None,
    ) -> HairProviderResult:
        return HairProviderResult(
            provider=self.provider_name,
            request_id=job.request_id,
            provider_job_id=job.provider_job_id,
            mode=self.mode,
            status=HairProviderJobStatus.SCAFFOLDED,
            raw_asset_url=None,
            error_code="provider_scaffold_not_ready",
            error_message=(
                f"{self.provider_name} is scaffold-only and cannot produce a production hair asset."
            ),
            metadata=dict(metadata or {"scaffold": True}),
        )

    def get_result(self, provider_job_id: str) -> HairProviderResult:
        job = self._get_job(provider_job_id)
        return self._scaffold_result(job)


class ManualHairProvider(_InMemoryScaffoldHairProvider):
    """Manual-import scaffold retained for provenance, explicitly not production-ready."""

    provider_name = "manual"

    def get_result(self, provider_job_id: str) -> HairProviderResult:
        job = self._get_job(provider_job_id)
        # Story 8.2 defect fix: input_data comes from the submitted request/job;
        # it is never an undefined free variable and is never shared across jobs.
        input_data = job.input_data
        return self._scaffold_result(
            job,
            metadata={
                "scaffold": True,
                "manual_import": True,
                "input_keys": sorted(str(key) for key in input_data),
            },
        )


class Trellis2HairProvider(_InMemoryScaffoldHairProvider):
    provider_name = "trellis2"


class HunyuanMultiViewHairProvider(_InMemoryScaffoldHairProvider):
    provider_name = "hunyuan_multiview"


class MeshyHairProvider(_InMemoryScaffoldHairProvider):
    provider_name = "meshy"


PROVIDER_ALIASES: dict[str, str] = {
    "manual": "manual",
    "trellis": "trellis2",
    "trellis2": "trellis2",
    "trellis_2": "trellis2",
    "hunyuan": "hunyuan_multiview",
    "hunyuan3d": "hunyuan_multiview",
    "hunyuan_multiview": "hunyuan_multiview",
    "meshy": "meshy",
}

PROVIDER_ENABLE_FLAGS: dict[str, str] = {
    "manual": "HAIR_PROVIDER_MANUAL_ENABLED",
    "trellis2": "HAIR_PROVIDER_TRELLIS2_ENABLED",
    "hunyuan_multiview": "HAIR_PROVIDER_HUNYUAN_MULTIVIEW_ENABLED",
    "meshy": "HAIR_PROVIDER_MESHY_ENABLED",
}


def resolve_provider_name(requested_name: str) -> ProviderResolution:
    requested = requested_name.strip().lower().replace("-", "_")
    if not requested:
        raise ValueError("hair_provider_name_required")
    resolved = PROVIDER_ALIASES.get(requested)
    if resolved is None:
        raise ValueError(f"unknown_hair_provider:{requested}")
    remapped = requested != resolved
    if remapped:
        logger.info("hair_provider_remap requested=%s resolved=%s", requested, resolved)
    return ProviderResolution(requested=requested, resolved=resolved, remapped=remapped)


def _env_enabled(env: Mapping[str, str], key: str) -> bool:
    return str(env.get(key, "")).strip().lower() in {"1", "true", "yes", "on"}


def build_scaffold_registry(
    env: Mapping[str, str] | None = None,
) -> dict[str, BaseHairProvider]:
    source = os.environ if env is None else env
    return {
        "manual": ManualHairProvider(
            enabled=_env_enabled(source, PROVIDER_ENABLE_FLAGS["manual"])
        ),
        "trellis2": Trellis2HairProvider(
            enabled=_env_enabled(source, PROVIDER_ENABLE_FLAGS["trellis2"])
        ),
        "hunyuan_multiview": HunyuanMultiViewHairProvider(
            enabled=_env_enabled(source, PROVIDER_ENABLE_FLAGS["hunyuan_multiview"])
        ),
        "meshy": MeshyHairProvider(
            enabled=_env_enabled(source, PROVIDER_ENABLE_FLAGS["meshy"])
        ),
    }


def get_production_provider(
    requested_name: str,
    *,
    registry: Mapping[str, BaseHairProvider] | None = None,
) -> tuple[BaseHairProvider, ProviderResolution]:
    """Resolve a provider for production, rejecting disabled or scaffold implementations."""

    resolution = resolve_provider_name(requested_name)
    providers = dict(registry or build_scaffold_registry())
    provider = providers.get(resolution.resolved)
    if provider is None:
        raise HairProviderError(f"hair_provider_not_registered:{resolution.resolved}")
    provider._require_enabled()
    if provider.mode is not HairProviderMode.LIVE:
        raise HairProviderNotReadyError(
            f"hair_provider_not_live:{resolution.resolved}:{provider.mode.value}"
        )
    return provider, resolution
