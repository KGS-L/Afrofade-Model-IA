"""Live, injectable Hunyuan3D Multi-View hair provider adapter (server-side only)."""
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
    BaseHairProvider,
    HairProviderJob,
    HairProviderJobStatus,
    HairProviderMode,
    HairProviderResult,
)

ENDPOINT = "fal-ai/hunyuan-3d/v2/multi-view"
_PROVIDER_JOB_ID = re.compile(r"^[A-Za-z0-9._:-]{1,200}$")


class HunyuanProviderError(RuntimeError):
    def __init__(self, code: str, message: str, *, retryable: bool) -> None:
        super().__init__(message)
        self.code = code
        self.retryable = retryable


class HunyuanTransport(Protocol):
    def request(self, method: str, url: str, **kwargs: Any) -> Any: ...


class HunyuanMultiViewHairProvider(BaseHairProvider):
    provider_name = "hunyuan_multiview"
    mode = HairProviderMode.LIVE

    def __init__(
        self,
        *,
        api_key: str,
        enabled: bool = False,
        webhook_url: str = "",
        transport: HunyuanTransport | None = None,
        timeout_seconds: float = 30.0,
    ) -> None:
        super().__init__(enabled=enabled)
        self.api_key = api_key.strip()
        self.webhook_url = webhook_url.strip().rstrip("/")
        self.transport = transport or requests.Session()
        self.timeout_seconds = float(timeout_seconds)

        if not math.isfinite(self.timeout_seconds) or self.timeout_seconds <= 0:
            raise HunyuanProviderError(
                "hunyuan_timeout_invalid",
                "Hunyuan timeout must be finite and positive",
                retryable=False,
            )

        if self.webhook_url and not self.webhook_url.startswith("https://"):
            raise HunyuanProviderError(
                "hunyuan_webhook_url_invalid",
                "Hunyuan webhook base URL must use HTTPS",
                retryable=False,
            )

    @classmethod
    def from_env(
        cls,
        env: Mapping[str, str] | None = None,
        *,
        transport: HunyuanTransport | None = None,
    ) -> HunyuanMultiViewHairProvider:
        e = os.environ if env is None else env
        api_key = e.get("HUNYUAN_API_KEY", e.get("FAL_KEY", "")).strip()
        enabled = e.get("HAIR_PROVIDER_HUNYUAN_MULTIVIEW_ENABLED", "").lower() in {
            "1",
            "true",
            "yes",
            "on",
        }
        try:
            timeout = float(e.get("HUNYUAN_TIMEOUT_SECONDS", "30"))
        except (TypeError, ValueError) as exc:
            raise HunyuanProviderError(
                "hunyuan_timeout_invalid", "Hunyuan timeout must be numeric", retryable=False
            ) from exc

        webhook_url = e.get("HUNYUAN_WEBHOOK_BASE_URL", e.get("HUNYUAN_WEBHOOK_URL", "")).strip()
        return cls(
            api_key=api_key,
            enabled=enabled,
            webhook_url=webhook_url,
            transport=transport,
            timeout_seconds=timeout,
        )

    @staticmethod
    def _provider_job_id(value: str) -> str:
        clean = value.strip()
        if not _PROVIDER_JOB_ID.fullmatch(clean):
            raise HunyuanProviderError(
                "hunyuan_request_id_invalid", "Invalid Hunyuan request id", retryable=False
            )
        return clean

    def _call(self, method: str, url: str, **kwargs: Any) -> dict[str, Any]:
        self._require_enabled()
        if not self.api_key:
            raise HunyuanProviderError(
                "hunyuan_not_configured", "HUNYUAN_API_KEY / FAL_KEY is required", retryable=False
            )
        try:
            response = self.transport.request(
                method,
                url,
                headers={
                    "Authorization": f"Key {self.api_key}",
                    "Content-Type": "application/json",
                },
                timeout=self.timeout_seconds,
                **kwargs,
            )
        except requests.RequestException as exc:
            raise HunyuanProviderError(
                "hunyuan_transport_error", str(exc), retryable=True
            ) from exc

        status = int(response.status_code)
        if not 200 <= status < 300:
            raise HunyuanProviderError(
                f"hunyuan_http_{status}",
                str(getattr(response, "text", ""))[:300],
                retryable=status in {408, 429} or status >= 500,
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise HunyuanProviderError(
                "hunyuan_invalid_json", "Hunyuan returned invalid JSON", retryable=False
            ) from exc

        if not isinstance(payload, dict):
            raise HunyuanProviderError(
                "hunyuan_invalid_json", "Hunyuan returned a non-object", retryable=False
            )
        return payload

    def submit(self, input_data: Mapping[str, Any], *, request_id: str) -> HairProviderJob:
        self._require_enabled()
        try:
            internal_id = str(UUID(request_id.strip()))
        except (ValueError, AttributeError) as exc:
            raise HunyuanProviderError(
                "internal_job_id_invalid",
                "Internal request id must be a UUID",
                retryable=False,
            ) from exc

        # Multi-view validation
        image_urls: list[str] = []
        raw_urls = input_data.get("image_urls") or input_data.get("views")
        if isinstance(raw_urls, dict):
            image_urls = [str(v).strip() for v in raw_urls.values() if str(v).strip()]
        elif isinstance(raw_urls, (list, tuple)):
            image_urls = [str(v).strip() for v in raw_urls if str(v).strip()]
        elif "image_url" in input_data:
            image_urls = [str(input_data["image_url"]).strip()]

        if not image_urls:
            raise ValueError("hunyuan_multi_view_images_required")

        for url in image_urls:
            if not url.startswith("https://"):
                raise ValueError("hunyuan_image_url_must_use_https")

        body: dict[str, Any] = {"image_urls": image_urls}

        if "texture_size" in input_data:
            tex_size = input_data["texture_size"]
            if isinstance(tex_size, bool) or not isinstance(tex_size, int) or tex_size < 256:
                raise ValueError("hunyuan_texture_size_invalid")
            body["texture_size"] = tex_size

        params = (
            {"fal_webhook": f"{self.webhook_url}/{internal_id}"} if self.webhook_url else None
        )
        payload = self._call(
            "POST", f"https://queue.fal.run/{ENDPOINT}", json=body, params=params
        )
        provider_id = self._provider_job_id(str(payload.get("request_id", "")))
        return HairProviderJob(
            self.provider_name,
            internal_id,
            provider_id,
            self.mode,
            HairProviderJobStatus.SUBMITTED,
            dict(input_data),
            datetime.now(UTC),
        )

    def get_status(self, provider_job_id: str) -> HairProviderJobStatus:
        encoded_job_id = quote(self._provider_job_id(provider_job_id), safe="")
        payload = self._call(
            "GET", f"https://queue.fal.run/{ENDPOINT}/requests/{encoded_job_id}/status"
        )
        status = str(payload.get("status", "")).upper()
        return {
            "IN_QUEUE": HairProviderJobStatus.SUBMITTED,
            "IN_PROGRESS": HairProviderJobStatus.RUNNING,
            "COMPLETED": HairProviderJobStatus.SUCCEEDED,
            "FAILED": HairProviderJobStatus.FAILED,
            "ERROR": HairProviderJobStatus.FAILED,
        }.get(status, HairProviderJobStatus.RUNNING)

    def get_result(self, provider_job_id: str) -> HairProviderResult:
        provider_job_id = self._provider_job_id(provider_job_id)
        encoded_job_id = quote(provider_job_id, safe="")
        payload = self._call(
            "GET", f"https://queue.fal.run/{ENDPOINT}/requests/{encoded_job_id}"
        )
        model = payload.get("model_mesh") or payload.get("model_glb")
        url = model.get("url") if isinstance(model, dict) else model
        if not isinstance(url, str) or not url.startswith("https://"):
            raise HunyuanProviderError(
                "hunyuan_invalid_model_glb",
                "Hunyuan result omitted HTTPS model_glb/model_mesh",
                retryable=False,
            )
        return HairProviderResult(
            self.provider_name,
            provider_job_id,
            provider_job_id,
            self.mode,
            HairProviderJobStatus.SUCCEEDED,
            url,
            metadata=payload,
        )

    def wait_for_completion(
        self,
        provider_job_id: str,
        *,
        window_seconds: float,
        poll_seconds: float,
        monotonic: Any = time.monotonic,
        sleeper: Any = time.sleep,
    ) -> bool:
        if (
            not math.isfinite(window_seconds)
            or window_seconds < 0
            or not math.isfinite(poll_seconds)
            or poll_seconds <= 0
        ):
            raise HunyuanProviderError(
                "hunyuan_poll_config_invalid",
                "Polling window/interval is invalid",
                retryable=False,
            )
        deadline = monotonic() + window_seconds
        while True:
            status = self.get_status(provider_job_id)
            if status is HairProviderJobStatus.SUCCEEDED:
                return True
            if status is HairProviderJobStatus.FAILED:
                raise HunyuanProviderError(
                    "hunyuan_generation_failed", "Hunyuan generation failed", retryable=False
                )
            remaining = deadline - monotonic()
            if remaining <= 0:
                return False
            sleeper(min(poll_seconds, remaining))
