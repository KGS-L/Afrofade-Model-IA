"""Live, injectable FAL TRELLIS.2 adapter (server-side only)."""
from __future__ import annotations

from datetime import UTC, datetime
import math
import os
import re
import time
from typing import Any, Mapping, Protocol
from urllib.parse import quote
from uuid import UUID

import requests

from services.hair.providers import (
    BaseHairProvider, HairProviderJob, HairProviderJobStatus, HairProviderMode,
    HairProviderResult,
)

ENDPOINT = "fal-ai/trellis-2-lora"
LORA_FIELDS = {
    "sparse_structure": "sparse_structure_lora_url",
    "geometry": "geometry_lora_url",
    "texture": "texture_lora_url",
}
RESOLUTIONS = {"512", "1024"}
TEXTURE_SIZES = {1024, 2048, 4096}
_PROVIDER_JOB_ID = re.compile(r"^[A-Za-z0-9._:-]{1,200}$")


class FalProviderError(RuntimeError):
    def __init__(self, code: str, message: str, *, retryable: bool) -> None:
        super().__init__(message)
        self.code, self.retryable = code, retryable


class FalTransport(Protocol):
    def request(self, method: str, url: str, **kwargs: Any) -> Any: ...


class Trellis2HairProvider(BaseHairProvider):
    provider_name = "trellis2"
    mode = HairProviderMode.LIVE

    def __init__(self, *, api_key: str, enabled: bool = False, webhook_url: str = "",
                 loras: Mapping[str, str] | None = None, transport: FalTransport | None = None,
                 timeout_seconds: float = 30, required_lora_stages: tuple[str, ...] = ()) -> None:
        super().__init__(enabled=enabled)
        self.api_key = api_key.strip()
        self.webhook_url = webhook_url.strip().rstrip("/")
        raw_loras = [(str(k).strip().lower(), str(v).strip()) for k, v in (loras or {}).items() if str(v).strip()]
        if len({stage for stage, _ in raw_loras}) != len(raw_loras):
            raise FalProviderError("fal_lora_stage_duplicate", "LoRA stages must be unique", retryable=False)
        unknown = sorted(stage for stage, _ in raw_loras if stage not in LORA_FIELDS)
        if unknown:
            raise FalProviderError("fal_lora_stage_invalid", f"Unsupported LoRA stages: {unknown}", retryable=False)
        self.loras = dict(raw_loras)
        for url in self.loras.values():
            if not url.startswith("https://"):
                raise FalProviderError("fal_lora_url_invalid", "LoRA URLs must use HTTPS", retryable=False)
        required = {stage.strip().lower() for stage in required_lora_stages if stage.strip()}
        if not required.issubset(LORA_FIELDS):
            raise FalProviderError("fal_lora_policy_invalid", "Required LoRA policy contains an unknown stage", retryable=False)
        missing = sorted(required - self.loras.keys())
        if missing:
            raise FalProviderError("fal_lora_incomplete", f"Required LoRA stages are missing: {missing}", retryable=False)
        self.transport = transport or requests.Session()
        self.timeout_seconds = float(timeout_seconds)
        if not math.isfinite(self.timeout_seconds) or self.timeout_seconds <= 0:
            raise FalProviderError("fal_timeout_invalid", "FAL timeout must be finite and positive", retryable=False)
        if self.webhook_url and not self.webhook_url.startswith("https://"):
            raise FalProviderError("fal_webhook_url_invalid", "FAL webhook base URL must use HTTPS", retryable=False)

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None, *, transport: FalTransport | None = None):
        e = os.environ if env is None else env
        loras = {k.removeprefix("FAL_TRELLIS2_LORA_").lower(): v for k, v in e.items()
                 if k.startswith("FAL_TRELLIS2_LORA_") and v.strip()}
        try:
            timeout = float(e.get("FAL_TRELLIS2_TIMEOUT_SECONDS", "30"))
        except (TypeError, ValueError) as exc:
            raise FalProviderError("fal_timeout_invalid", "FAL timeout must be numeric", retryable=False) from exc
        enabled = e.get("HAIR_PROVIDER_TRELLIS2_ENABLED", "").lower() in {"1","true","yes","on"}
        required = tuple(part.strip().lower() for part in e.get(
            "FAL_TRELLIS2_REQUIRED_LORA_STAGES", "sparse_structure,geometry,texture"
        ).split(",") if part.strip()) if enabled else ()
        return cls(api_key=e.get("FAL_KEY", ""), enabled=enabled,
                   webhook_url=e.get("FAL_TRELLIS2_WEBHOOK_BASE_URL", e.get("FAL_TRELLIS2_WEBHOOK_URL", "")), loras=loras,
                   transport=transport, timeout_seconds=timeout, required_lora_stages=required)

    @staticmethod
    def _provider_job_id(value: str) -> str:
        clean = value.strip()
        if not _PROVIDER_JOB_ID.fullmatch(clean):
            raise FalProviderError("fal_request_id_invalid", "Invalid FAL request id", retryable=False)
        return clean

    def _call(self, method: str, url: str, **kwargs: Any) -> dict[str, Any]:
        self._require_enabled()
        if not self.api_key:
            raise FalProviderError("fal_not_configured", "FAL_KEY is required", retryable=False)
        try:
            response = self.transport.request(method, url, headers={"Authorization": f"Key {self.api_key}", "Content-Type": "application/json"}, timeout=self.timeout_seconds, **kwargs)
        except requests.RequestException as exc:
            raise FalProviderError("fal_transport_error", str(exc), retryable=True) from exc
        status = int(response.status_code)
        if not 200 <= status < 300:
            raise FalProviderError(f"fal_http_{status}", str(getattr(response, "text", ""))[:300], retryable=status in {408,429} or status >= 500)
        try: payload = response.json()
        except ValueError as exc: raise FalProviderError("fal_invalid_json", "FAL returned invalid JSON", retryable=False) from exc
        if not isinstance(payload, dict): raise FalProviderError("fal_invalid_json", "FAL returned a non-object", retryable=False)
        return payload

    def submit(self, input_data: Mapping[str, Any], *, request_id: str) -> HairProviderJob:
        self._require_enabled()
        try: internal_id = str(UUID(request_id.strip()))
        except (ValueError, AttributeError) as exc: raise FalProviderError("internal_job_id_invalid", "Internal request id must be a UUID", retryable=False) from exc
        image_url = str(input_data.get("image_url", "")).strip()
        if not image_url.startswith("https://"): raise ValueError("trellis2_image_url_must_use_https")
        body: dict[str, Any] = {"image_url": image_url}
        resolution = str(input_data.get("resolution", "1024"))
        if resolution not in RESOLUTIONS: raise ValueError("trellis2_resolution_invalid")
        body["resolution"] = resolution
        if "seed" in input_data:
            seed=input_data["seed"]
            if isinstance(seed,bool) or not isinstance(seed,int) or seed < 0: raise ValueError("trellis2_seed_invalid")
            body["seed"] = seed
        if "decimation_target" in input_data:
            value=input_data["decimation_target"]
            if isinstance(value,bool) or not isinstance(value,int) or value < 1: raise ValueError("trellis2_decimation_target_invalid")
            body["decimation_target"] = value
        if "texture_size" in input_data:
            value=input_data["texture_size"]
            if isinstance(value,bool) or value not in TEXTURE_SIZES: raise ValueError("trellis2_texture_size_invalid")
            body["texture_size"] = value
        body.update({LORA_FIELDS[stage]: url for stage, url in self.loras.items()})
        params = {"fal_webhook": f"{self.webhook_url}/{internal_id}"} if self.webhook_url else None
        payload = self._call("POST", f"https://queue.fal.run/{ENDPOINT}", json=body, params=params)
        provider_id = self._provider_job_id(str(payload.get("request_id", "")))
        return HairProviderJob(self.provider_name, internal_id, provider_id, self.mode, HairProviderJobStatus.SUBMITTED, dict(input_data), datetime.now(UTC))

    def get_status(self, provider_job_id: str) -> HairProviderJobStatus:
        provider_job_id = quote(self._provider_job_id(provider_job_id), safe="")
        payload = self._call("GET", f"https://queue.fal.run/{ENDPOINT}/requests/{provider_job_id}/status")
        status=str(payload.get("status", "")).upper()
        return {"IN_QUEUE": HairProviderJobStatus.SUBMITTED, "IN_PROGRESS": HairProviderJobStatus.RUNNING,
                "COMPLETED": HairProviderJobStatus.SUCCEEDED, "FAILED": HairProviderJobStatus.FAILED,
                "ERROR": HairProviderJobStatus.FAILED}.get(status, HairProviderJobStatus.RUNNING)

    def get_result(self, provider_job_id: str) -> HairProviderResult:
        provider_job_id = self._provider_job_id(provider_job_id)
        encoded_job_id = quote(provider_job_id, safe="")
        payload = self._call("GET", f"https://queue.fal.run/{ENDPOINT}/requests/{encoded_job_id}")
        model = payload.get("model_glb")
        url = model.get("url") if isinstance(model, dict) else model
        if not isinstance(url, str) or not url.startswith("https://"):
            raise FalProviderError("fal_invalid_model_glb", "FAL result omitted HTTPS model_glb", retryable=False)
        return HairProviderResult(self.provider_name, provider_job_id, provider_job_id, self.mode, HairProviderJobStatus.SUCCEEDED, url, metadata=payload)

    def wait_for_completion(self, provider_job_id: str, *, window_seconds: float,
                            poll_seconds: float, monotonic: Any = time.monotonic,
                            sleeper: Any = time.sleep) -> bool:
        if (not math.isfinite(window_seconds) or window_seconds < 0 or
                not math.isfinite(poll_seconds) or poll_seconds <= 0):
            raise FalProviderError("fal_poll_config_invalid", "Polling window/interval is invalid", retryable=False)
        deadline = monotonic() + window_seconds
        while True:
            status = self.get_status(provider_job_id)
            if status is HairProviderJobStatus.SUCCEEDED:
                return True
            if status is HairProviderJobStatus.FAILED:
                raise FalProviderError("fal_generation_failed", "FAL generation failed", retryable=False)
            remaining = deadline - monotonic()
            if remaining <= 0:
                return False
            sleeper(min(poll_seconds, remaining))
