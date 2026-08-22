from __future__ import annotations

from abc import ABC, abstractmethod
import os
from typing import Any
from uuid import UUID

import requests
from pydantic import ValidationError

from models.jobs import AIJobRecord, AIJobType


class JobQueueError(RuntimeError):
    """Raised when the durable job queue cannot satisfy an operation."""


class JobQueue(ABC):
    @abstractmethod
    def enqueue(
        self,
        *,
        job_type: AIJobType,
        provider: str,
        input_payload: dict[str, Any],
        idempotency_key: str,
        user_id: UUID | None = None,
        salon_id: UUID | None = None,
        max_attempts: int = 3,
        priority: int = 0,
    ) -> AIJobRecord:
        raise NotImplementedError

    @abstractmethod
    def get(self, job_id: UUID) -> AIJobRecord | None:
        raise NotImplementedError

    @abstractmethod
    def claim(
        self,
        *,
        worker_id: str,
        limit: int = 1,
        lease_seconds: int = 300,
    ) -> list[AIJobRecord]:
        raise NotImplementedError

    @abstractmethod
    def heartbeat(
        self,
        *,
        job_id: UUID,
        worker_id: str,
        lease_seconds: int = 300,
    ) -> AIJobRecord:
        raise NotImplementedError

    @abstractmethod
    def complete(
        self,
        *,
        job_id: UUID,
        worker_id: str,
        output_payload: dict[str, Any],
    ) -> AIJobRecord:
        raise NotImplementedError

    @abstractmethod
    def fail(
        self,
        *,
        job_id: UUID,
        worker_id: str,
        error_code: str,
        error_message: str,
        retryable: bool = True,
        retry_delay_seconds: int = 30,
    ) -> AIJobRecord:
        raise NotImplementedError

    @abstractmethod
    def recover_expired(self, *, limit: int = 100) -> list[AIJobRecord]:
        raise NotImplementedError


class SupabasePostgresJobQueue(JobQueue):
    """Thin service-role client for the PostgreSQL queue RPCs exposed by Supabase/PostgREST."""

    def __init__(
        self,
        supabase_url: str,
        service_role_key: str,
        *,
        session: Any | None = None,
        timeout_seconds: float = 10.0,
    ) -> None:
        base_url = supabase_url.strip().rstrip("/")
        key = service_role_key.strip()

        if not base_url.startswith(("https://", "http://")):
            raise JobQueueError("SUPABASE_URL must be an HTTP(S) URL")
        if os.getenv("FASTAPI_ENV", "").strip().lower() == "production" and not base_url.startswith("https://"):
            raise JobQueueError("SUPABASE_URL must use HTTPS in production")
        if not key:
            raise JobQueueError("SUPABASE_SERVICE_ROLE_KEY is required")
        if timeout_seconds <= 0:
            raise JobQueueError("timeout_seconds must be positive")

        self._rest_url = f"{base_url}/rest/v1"
        self._service_role_key = key
        self._session = session or requests.Session()
        self._timeout_seconds = timeout_seconds

    @classmethod
    def from_env(cls) -> "SupabasePostgresJobQueue":
        raw_public_url = (os.getenv("NEXT_PUBLIC_SUPABASE_URL") or "").strip()
        public_url = raw_public_url if raw_public_url and "localhost" not in raw_public_url else None

        supabase_url = (
            os.getenv("SUPABASE_URL")
            or public_url
            or "http://postgrest-gateway:8080"
        ).strip()
        service_role_key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "local-dev-service-key").strip()

        if not supabase_url or not service_role_key:
            raise JobQueueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured")

        return cls(supabase_url, service_role_key)

    def _headers(self) -> dict[str, str]:
        return {
            "apikey": self._service_role_key,
            "Authorization": f"Bearer {self._service_role_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        url = f"{self._rest_url}/{path.lstrip('/')}"
        try:
            response = self._session.request(
                method,
                url,
                headers=self._headers(),
                timeout=self._timeout_seconds,
                **kwargs,
            )
        except requests.RequestException as exc:
            raise JobQueueError(f"Job queue request failed: {exc}") from exc

        if not 200 <= int(response.status_code) < 300:
            body = str(getattr(response, "text", ""))[:400]
            raise JobQueueError(f"Job queue HTTP {response.status_code}: {body}")

        try:
            return response.json()
        except ValueError as exc:
            raise JobQueueError("Job queue returned invalid JSON") from exc

    @staticmethod
    def _validate_job(payload: Any) -> AIJobRecord:
        if not isinstance(payload, dict):
            raise JobQueueError("Job queue returned an unexpected job payload")
        try:
            return AIJobRecord.model_validate(payload)
        except ValidationError as exc:
            raise JobQueueError("Job queue returned a job payload that violates the AIJobRecord contract") from exc

    @classmethod
    def _first_job(cls, payload: Any) -> AIJobRecord | None:
        if isinstance(payload, list):
            if not payload:
                return None
            payload = payload[0]
        return cls._validate_job(payload)

    @classmethod
    def _required_job(cls, payload: Any, operation: str) -> AIJobRecord:
        job = cls._first_job(payload)
        if job is None:
            raise JobQueueError(f"{operation} returned no job")
        return job

    def enqueue(
        self,
        *,
        job_type: AIJobType,
        provider: str,
        input_payload: dict[str, Any],
        idempotency_key: str,
        user_id: UUID | None = None,
        salon_id: UUID | None = None,
        max_attempts: int = 3,
        priority: int = 0,
    ) -> AIJobRecord:
        provider = provider.strip()
        idempotency_key = idempotency_key.strip()

        if user_id is None and salon_id is None:
            raise JobQueueError("A user_id and/or salon_id owner is required")
        if not provider:
            raise JobQueueError("provider is required")
        if not idempotency_key:
            raise JobQueueError("idempotency_key is required")
        if max_attempts < 1:
            raise JobQueueError("max_attempts must be at least 1")

        payload = self._request(
            "POST",
            "rpc/enqueue_ai_job",
            json={
                "p_job_type": job_type.value,
                "p_user_id": str(user_id) if user_id else None,
                "p_salon_id": str(salon_id) if salon_id else None,
                "p_provider": provider,
                "p_input_payload": input_payload,
                "p_idempotency_key": idempotency_key,
                "p_max_attempts": max_attempts,
                "p_priority": priority,
            },
        )
        return self._required_job(payload, "enqueue_ai_job")

    def get(self, job_id: UUID) -> AIJobRecord | None:
        payload = self._request(
            "GET",
            "ai_jobs",
            params={
                "id": f"eq.{job_id}",
                "select": "*",
                "limit": "1",
            },
        )
        return self._first_job(payload)

    def claim(
        self,
        *,
        worker_id: str,
        limit: int = 1,
        lease_seconds: int = 300,
    ) -> list[AIJobRecord]:
        worker_id = worker_id.strip()
        if not worker_id:
            raise JobQueueError("worker_id is required")
        if limit < 1 or limit > 50:
            raise JobQueueError("limit must be between 1 and 50")
        if lease_seconds < 10 or lease_seconds > 3600:
            raise JobQueueError("lease_seconds must be between 10 and 3600")

        payload = self._request(
            "POST",
            "rpc/claim_ai_jobs",
            json={
                "p_worker_id": worker_id,
                "p_limit": limit,
                "p_lease_seconds": lease_seconds,
            },
        )
        if not isinstance(payload, list):
            raise JobQueueError("claim_ai_jobs returned an unexpected payload")
        return [self._validate_job(item) for item in payload]

    def checkpoint_trellis2(self, *, job_id: UUID, worker_id: str, patch: dict[str, Any]) -> dict[str, Any]:
        payload = self._request("POST", "rpc/checkpoint_trellis2_job", json={
            "p_job_id": str(job_id), "p_worker_id": worker_id, "p_patch": patch})
        if not isinstance(payload, list) or len(payload) != 1 or not isinstance(payload[0], dict):
            raise JobQueueError("checkpoint_trellis2_job returned an invalid payload")
        return payload[0]

    def get_trellis2_checkpoint(self, provider_request_id: str) -> dict[str, Any] | None:
        payload = self._request("GET", "trellis2_job_checkpoints", params={
            "provider_request_id": f"eq.{provider_request_id}", "select": "*", "limit": "1"})
        if not isinstance(payload, list): raise JobQueueError("Invalid checkpoint response")
        return payload[0] if payload else None

    def get_trellis2_checkpoint_for_job(self, job_id: UUID) -> dict[str, Any] | None:
        payload = self._request("GET", "trellis2_job_checkpoints", params={
            "job_id": f"eq.{job_id}", "select": "*", "limit": "1"})
        if not isinstance(payload, list): raise JobQueueError("Invalid checkpoint response")
        return payload[0] if payload else None

    def accept_trellis2_webhook(self, job_id: UUID, provider_request_id: str, payload_data: dict[str, Any]) -> bool:
        payload = self._request("POST", "rpc/accept_trellis2_webhook", json={
            "p_job_id": str(job_id), "p_provider_request_id": provider_request_id, "p_payload": payload_data})
        return payload is True or payload == [True]

    def heartbeat(
        self,
        *,
        job_id: UUID,
        worker_id: str,
        lease_seconds: int = 300,
    ) -> AIJobRecord:
        worker_id = worker_id.strip()
        if not worker_id:
            raise JobQueueError("worker_id is required")
        if lease_seconds < 10 or lease_seconds > 3600:
            raise JobQueueError("lease_seconds must be between 10 and 3600")

        payload = self._request(
            "POST",
            "rpc/heartbeat_ai_job",
            json={
                "p_job_id": str(job_id),
                "p_worker_id": worker_id,
                "p_lease_seconds": lease_seconds,
            },
        )
        return self._required_job(payload, "heartbeat_ai_job")

    def complete(
        self,
        *,
        job_id: UUID,
        worker_id: str,
        output_payload: dict[str, Any],
    ) -> AIJobRecord:
        worker_id = worker_id.strip()
        if not worker_id:
            raise JobQueueError("worker_id is required")

        payload = self._request(
            "POST",
            "rpc/complete_ai_job",
            json={
                "p_job_id": str(job_id),
                "p_worker_id": worker_id,
                "p_output_payload": output_payload,
            },
        )
        return self._required_job(payload, "complete_ai_job")

    def fail(
        self,
        *,
        job_id: UUID,
        worker_id: str,
        error_code: str,
        error_message: str,
        retryable: bool = True,
        retry_delay_seconds: int = 30,
    ) -> AIJobRecord:
        worker_id = worker_id.strip()
        error_code = error_code.strip() or "worker_error"
        if not worker_id:
            raise JobQueueError("worker_id is required")
        if retry_delay_seconds < 0 or retry_delay_seconds > 3600:
            raise JobQueueError("retry_delay_seconds must be between 0 and 3600")

        payload = self._request(
            "POST",
            "rpc/fail_ai_job",
            json={
                "p_job_id": str(job_id),
                "p_worker_id": worker_id,
                "p_error_code": error_code,
                "p_error_message": error_message,
                "p_retryable": retryable,
                "p_retry_delay_seconds": retry_delay_seconds,
            },
        )
        return self._required_job(payload, "fail_ai_job")

    def recover_expired(self, *, limit: int = 100) -> list[AIJobRecord]:
        if limit < 1 or limit > 500:
            raise JobQueueError("limit must be between 1 and 500")

        payload = self._request(
            "POST",
            "rpc/recover_expired_ai_jobs",
            json={"p_limit": limit},
        )
        if not isinstance(payload, list):
            raise JobQueueError("recover_expired_ai_jobs returned an unexpected payload")
        return [self._validate_job(item) for item in payload]
