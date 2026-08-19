#!/usr/bin/env python3
"""Provider-independent validation for BMAD Story 7.2 persistent job queue."""

from __future__ import annotations

from datetime import UTC, datetime
import json
import os
from pathlib import Path
import sys
from typing import Any
from uuid import UUID

API_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = API_ROOT.parent
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from models.jobs import AIJobStatus, AIJobType
from services.jobs.job_queue import JobQueueError, SupabasePostgresJobQueue


NOW = datetime.now(UTC).isoformat()
USER_ID = UUID("11111111-1111-4111-8111-111111111111")
JOB_ID = UUID("22222222-2222-4222-8222-222222222222")


def sample_job(**overrides: Any) -> dict[str, Any]:
    payload = {
        "id": str(JOB_ID),
        "job_type": "head_reconstruction",
        "user_id": str(USER_ID),
        "salon_id": None,
        "status": "queued",
        "provider": "flame_pytorch",
        "input_payload": {"photos_urls": ["https://assets.afrofade.pro/photo-1.jpg"]},
        "output_payload": None,
        "progress_percent": 0,
        "attempts": 0,
        "max_attempts": 3,
        "priority": 0,
        "idempotency_key": "head:user:request-001",
        "available_at": NOW,
        "locked_at": None,
        "locked_by": None,
        "lease_expires_at": None,
        "error_code": None,
        "error_message": None,
        "created_at": NOW,
        "started_at": None,
        "completed_at": None,
        "updated_at": NOW,
    }
    payload.update(overrides)
    return payload


class FakeResponse:
    def __init__(self, status_code: int, payload: Any):
        self.status_code = status_code
        self._payload = payload
        self.text = json.dumps(payload)

    def json(self) -> Any:
        return self._payload


class FakeSession:
    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []
        self.responses: list[FakeResponse] = []

    def push(self, payload: Any, status_code: int = 200) -> None:
        self.responses.append(FakeResponse(status_code, payload))

    def request(self, method: str, url: str, **kwargs: Any) -> FakeResponse:
        self.calls.append({"method": method, "url": url, **kwargs})
        if not self.responses:
            raise AssertionError("FakeSession has no queued response")
        return self.responses.pop(0)


def assert_migration_contract() -> None:
    migration_path = REPO_ROOT / "web" / "supabase" / "migrations" / "04_persistent_ai_jobs.sql"
    sql = migration_path.read_text(encoding="utf-8")

    required_fragments = [
        "CREATE TABLE IF NOT EXISTS ai_jobs",
        "idempotency_key TEXT NOT NULL UNIQUE",
        "FOR UPDATE SKIP LOCKED",
        "status = 'running'",
        "attempts = job.attempts + 1",
        "lease_expires_at",
        "CREATE POLICY ai_jobs_select_own_user",
        "CREATE POLICY ai_jobs_select_own_salon",
        "CREATE POLICY ai_jobs_admin_select_all",
        "GRANT EXECUTE ON FUNCTION enqueue_ai_job",
        "GRANT EXECUTE ON FUNCTION claim_ai_jobs",
        "TO service_role",
        "REVOKE INSERT, UPDATE, DELETE ON ai_jobs FROM anon, authenticated",
    ]

    missing = [fragment for fragment in required_fragments if fragment not in sql]
    if missing:
        raise AssertionError(f"Migration contract missing: {missing}")
    print("[PASS] migration defines durable queue, atomic claim, RLS and service-role boundary")


def assert_client_mapping() -> None:
    session = FakeSession()
    queue = SupabasePostgresJobQueue(
        "https://project.supabase.co",
        "service-role-test-key",
        session=session,
    )

    session.push([sample_job()])
    enqueued = queue.enqueue(
        job_type=AIJobType.HEAD_RECONSTRUCTION,
        provider="flame_pytorch",
        input_payload={"photos_urls": ["https://assets.afrofade.pro/photo-1.jpg"]},
        idempotency_key="head:user:request-001",
        user_id=USER_ID,
    )
    assert enqueued.id == JOB_ID
    enqueue_call = session.calls[-1]
    assert enqueue_call["method"] == "POST"
    assert enqueue_call["url"].endswith("/rest/v1/rpc/enqueue_ai_job")
    assert enqueue_call["json"]["p_job_type"] == "head_reconstruction"
    assert enqueue_call["headers"]["Authorization"] == "Bearer service-role-test-key"
    print("[PASS] enqueue RPC mapping")

    session.push([sample_job()])
    fetched = queue.get(JOB_ID)
    assert fetched is not None and fetched.id == JOB_ID
    get_call = session.calls[-1]
    assert get_call["method"] == "GET"
    assert get_call["url"].endswith("/rest/v1/ai_jobs")
    assert get_call["params"]["id"] == f"eq.{JOB_ID}"
    print("[PASS] get mapping")

    session.push([
        sample_job(
            status="running",
            attempts=1,
            locked_at=NOW,
            locked_by="worker-ci-1",
            lease_expires_at=NOW,
            started_at=NOW,
        )
    ])
    claimed = queue.claim(worker_id="worker-ci-1", limit=1, lease_seconds=300)
    assert len(claimed) == 1
    assert claimed[0].status == AIJobStatus.RUNNING
    assert claimed[0].attempts == 1
    claim_call = session.calls[-1]
    assert claim_call["method"] == "POST"
    assert claim_call["url"].endswith("/rest/v1/rpc/claim_ai_jobs")
    assert claim_call["json"]["p_worker_id"] == "worker-ci-1"
    print("[PASS] atomic claim RPC mapping")


def assert_fail_closed_configuration() -> None:
    old_url = os.environ.pop("SUPABASE_URL", None)
    old_key = os.environ.pop("SUPABASE_SERVICE_ROLE_KEY", None)
    try:
        try:
            SupabasePostgresJobQueue.from_env()
        except JobQueueError:
            print("[PASS] missing server credentials fail closed")
        else:
            raise AssertionError("Missing Supabase server credentials unexpectedly succeeded")
    finally:
        if old_url is not None:
            os.environ["SUPABASE_URL"] = old_url
        if old_key is not None:
            os.environ["SUPABASE_SERVICE_ROLE_KEY"] = old_key


def assert_input_validation() -> None:
    session = FakeSession()
    queue = SupabasePostgresJobQueue(
        "https://project.supabase.co",
        "service-role-test-key",
        session=session,
    )

    try:
        queue.enqueue(
            job_type=AIJobType.HEAD_RECONSTRUCTION,
            provider="flame_pytorch",
            input_payload={},
            idempotency_key="request-without-owner",
        )
    except JobQueueError:
        print("[PASS] ownerless enqueue rejected before network call")
    else:
        raise AssertionError("Ownerless enqueue unexpectedly succeeded")

    assert not session.calls


def main() -> None:
    assert_migration_contract()
    assert_client_mapping()
    assert_fail_closed_configuration()
    assert_input_validation()
    print("\nPersistent AI JobQueue contract: PASS")


if __name__ == "__main__":
    main()
