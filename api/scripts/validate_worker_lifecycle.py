#!/usr/bin/env python3
"""Provider-independent validation for BMAD Story 7.3 restart-safe worker lifecycle."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path
import sys
import threading
import time
from typing import Any
from uuid import UUID

API_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = API_ROOT.parent
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from models.jobs import AIJobRecord, AIJobStatus, AIJobType
from services.jobs.job_queue import JobQueue, JobQueueError
from services.jobs.worker import (
    DurableJobWorker,
    PermanentJobError,
    TransientJobError,
    WorkerConfig,
)


USER_ID = UUID("11111111-1111-4111-8111-111111111111")
JOB_ID = UUID("22222222-2222-4222-8222-222222222222")


def make_job(job_type: AIJobType = AIJobType.HEAD_RECONSTRUCTION) -> AIJobRecord:
    now = datetime.now(UTC)
    return AIJobRecord.model_validate({
        "id": str(JOB_ID),
        "job_type": job_type.value,
        "user_id": str(USER_ID),
        "salon_id": None,
        "status": "running",
        "provider": "flame_pytorch",
        "input_payload": {"photos_urls": ["https://assets.afrofade.pro/photo.jpg"]},
        "output_payload": None,
        "progress_percent": 0,
        "attempts": 1,
        "max_attempts": 3,
        "priority": 0,
        "idempotency_key": "head:user:worker-validation",
        "available_at": now.isoformat(),
        "locked_at": now.isoformat(),
        "locked_by": "worker-test",
        "lease_expires_at": (now + timedelta(seconds=60)).isoformat(),
        "error_code": None,
        "error_message": None,
        "created_at": now.isoformat(),
        "started_at": now.isoformat(),
        "completed_at": None,
        "updated_at": now.isoformat(),
    })


class FakeQueue(JobQueue):
    def __init__(self) -> None:
        self.completed: list[dict[str, Any]] = []
        self.failed: list[dict[str, Any]] = []
        self.heartbeats = 0
        self.recovered = 0
        self.claimed: list[AIJobRecord] = []
        self.heartbeat_error: Exception | None = None

    def enqueue(self, **kwargs) -> AIJobRecord:  # type: ignore[override]
        raise NotImplementedError

    def get(self, job_id: UUID) -> AIJobRecord | None:
        return None

    def claim(self, *, worker_id: str, limit: int = 1, lease_seconds: int = 300) -> list[AIJobRecord]:
        jobs = self.claimed[:limit]
        self.claimed = self.claimed[limit:]
        return jobs

    def heartbeat(self, *, job_id: UUID, worker_id: str, lease_seconds: int = 300) -> AIJobRecord:
        self.heartbeats += 1
        if self.heartbeat_error:
            raise self.heartbeat_error
        return make_job()

    def complete(self, *, job_id: UUID, worker_id: str, output_payload: dict[str, Any]) -> AIJobRecord:
        self.completed.append({
            "job_id": job_id,
            "worker_id": worker_id,
            "output_payload": output_payload,
        })
        return make_job().model_copy(update={"status": AIJobStatus.COMPLETED, "output_payload": output_payload})

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
        self.failed.append({
            "job_id": job_id,
            "worker_id": worker_id,
            "error_code": error_code,
            "error_message": error_message,
            "retryable": retryable,
            "retry_delay_seconds": retry_delay_seconds,
        })
        status = AIJobStatus.QUEUED if retryable else AIJobStatus.FAILED
        return make_job().model_copy(update={"status": status})

    def recover_expired(self, *, limit: int = 100) -> list[AIJobRecord]:
        self.recovered += 1
        return []


def config(**overrides: Any) -> WorkerConfig:
    values = {
        "worker_id": "worker-test",
        "claim_limit": 1,
        "lease_seconds": 10,
        "heartbeat_interval_seconds": 0.05,
        "poll_interval_seconds": 0.01,
        "recover_limit": 10,
    }
    values.update(overrides)
    return WorkerConfig(**values)


def assert_migration_contract() -> None:
    sql = (REPO_ROOT / "web" / "supabase" / "migrations" / "06_ai_job_worker_lifecycle.sql").read_text(encoding="utf-8")
    required = [
        "CREATE OR REPLACE FUNCTION heartbeat_ai_job",
        "CREATE OR REPLACE FUNCTION complete_ai_job",
        "CREATE OR REPLACE FUNCTION fail_ai_job",
        "CREATE OR REPLACE FUNCTION recover_expired_ai_jobs",
        "job.locked_by = p_worker_id",
        "job.lease_expires_at > NOW()",
        "job_lease_not_owned",
        "FOR UPDATE SKIP LOCKED",
        "worker_lease_expired",
        "job.attempts < job.max_attempts",
        "TO service_role",
    ]
    missing = [fragment for fragment in required if fragment not in sql]
    if missing:
        raise AssertionError(f"Worker lifecycle migration missing: {missing}")
    print("[PASS] lifecycle migration enforces lease ownership, recovery and bounded retry")


def assert_fastapi_uses_durable_queue() -> None:
    source = (API_ROOT / "main.py").read_text(encoding="utf-8")
    if "AsyncJobQueueManager" in source:
        raise AssertionError("FastAPI still references the legacy in-memory AsyncJobQueueManager")
    required = [
        "get_persistent_job_queue",
        "queue.enqueue(",
        "AIJobType.HEAD_RECONSTRUCTION",
        "@app.post(\"/api/v1/heads\", status_code=202)",
        "queue.get(parsed_job_id)",
    ]
    missing = [fragment for fragment in required if fragment not in source]
    if missing:
        raise AssertionError(f"FastAPI durable job endpoint missing: {missing}")
    print("[PASS] FastAPI head endpoints use the persistent JobQueue")


def assert_success_path() -> None:
    queue = FakeQueue()
    worker = DurableJobWorker(
        queue,
        {AIJobType.HEAD_RECONSTRUCTION: lambda _job: {"mesh": "ok"}},
        config(),
    )
    assert worker.process_job(make_job()) is True
    assert len(queue.completed) == 1
    assert queue.completed[0]["output_payload"] == {"mesh": "ok"}
    assert not queue.failed
    print("[PASS] successful handler completes the owned job")


def assert_transient_retry() -> None:
    queue = FakeQueue()

    def handler(_job: AIJobRecord) -> dict[str, Any]:
        raise TransientJobError("provider_timeout", "temporary provider timeout", retry_delay_seconds=45)

    worker = DurableJobWorker(queue, {AIJobType.HEAD_RECONSTRUCTION: handler}, config())
    assert worker.process_job(make_job()) is True
    assert queue.failed[-1]["retryable"] is True
    assert queue.failed[-1]["retry_delay_seconds"] == 45
    print("[PASS] transient handler error schedules bounded retry")


def assert_permanent_failure() -> None:
    queue = FakeQueue()

    def handler(_job: AIJobRecord) -> dict[str, Any]:
        raise PermanentJobError("invalid_input", "permanent invalid input")

    worker = DurableJobWorker(queue, {AIJobType.HEAD_RECONSTRUCTION: handler}, config())
    assert worker.process_job(make_job()) is True
    assert queue.failed[-1]["retryable"] is False
    assert queue.failed[-1]["error_code"] == "invalid_input"
    print("[PASS] permanent handler error does not retry")


def assert_unsupported_handler_failure() -> None:
    queue = FakeQueue()
    worker = DurableJobWorker(queue, {}, config())
    assert worker.process_job(make_job(AIJobType.HAIR_FIT)) is True
    assert queue.failed[-1]["retryable"] is False
    assert queue.failed[-1]["error_code"] == "unsupported_job_handler"
    print("[PASS] unsupported job type fails permanently instead of looping")


def assert_lost_lease_prevents_terminal_write() -> None:
    queue = FakeQueue()
    queue.heartbeat_error = JobQueueError("lease lost")

    def slow_handler(_job: AIJobRecord) -> dict[str, Any]:
        time.sleep(0.12)
        return {"mesh": "stale-result"}

    worker = DurableJobWorker(
        queue,
        {AIJobType.HEAD_RECONSTRUCTION: slow_handler},
        config(heartbeat_interval_seconds=0.02),
    )
    assert worker.process_job(make_job()) is False
    assert queue.heartbeats >= 1
    assert not queue.completed
    assert not queue.failed
    print("[PASS] lost lease prevents stale worker completion/failure mutation")


def assert_recovery_happens_before_claim() -> None:
    queue = FakeQueue()
    queue.claimed = []
    worker = DurableJobWorker(queue, {}, config())
    assert worker.run_once() == 0
    assert queue.recovered == 1
    print("[PASS] worker recovers expired leases before claiming new jobs")


def main() -> None:
    assert_migration_contract()
    assert_fastapi_uses_durable_queue()
    assert_success_path()
    assert_transient_retry()
    assert_permanent_failure()
    assert_unsupported_handler_failure()
    assert_lost_lease_prevents_terminal_write()
    assert_recovery_happens_before_claim()
    print("\nRestart-safe AI worker lifecycle: PASS")


if __name__ == "__main__":
    main()
