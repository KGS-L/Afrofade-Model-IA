#!/usr/bin/env python3
"""Provider-independent integration validation for BMAD Story 7.6.

Exercises the real Afrofade orchestration stack:
JobQueue -> DurableJobWorker -> head handler -> HeadGenerationManager
-> AssetStorage -> head asset metadata.

External infrastructure is replaced only at system boundaries. No Supabase
network, FLAME model download, GPU, or paid 3D provider is required.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from io import BytesIO
from pathlib import Path
import sys
from typing import Any, BinaryIO
from uuid import UUID, uuid4

API_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = API_ROOT.parent
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from models.head_generation import ReconstructedHeadPayload
from models.jobs import AIJobRecord, AIJobStatus, AIJobType
from services.fitting.head_provider import BaseHeadProvider, HeadGenerationManager
from services.heads.head_asset_repository import HeadAssetRecord
from services.jobs import handlers as job_handlers
from services.jobs.job_queue import JobQueue, JobQueueError
from services.jobs.worker import DurableJobWorker, WorkerConfig
from services.storage.asset_storage import AssetStorage, SignedUpload, StoredAssetRef


USER_A = UUID("11111111-1111-4111-8111-111111111111")
SALON_A = UUID("33333333-3333-4333-8333-333333333333")


def now_utc() -> datetime:
    return datetime.now(UTC)


class InMemoryLifecycleQueue(JobQueue):
    """Queue double preserving the production lifecycle semantics needed by 7.6."""

    def __init__(self) -> None:
        self.jobs: dict[UUID, AIJobRecord] = {}
        self.by_idempotency: dict[str, UUID] = {}

    def _save(self, job: AIJobRecord) -> AIJobRecord:
        self.jobs[job.id] = job
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
        if user_id is None and salon_id is None:
            raise JobQueueError("job_owner_required")
        if not provider.strip():
            raise JobQueueError("job_provider_required")
        if not idempotency_key.strip():
            raise JobQueueError("idempotency_key_required")
        if max_attempts < 1:
            raise JobQueueError("invalid_max_attempts")

        existing_id = self.by_idempotency.get(idempotency_key)
        if existing_id is not None:
            existing = self.jobs[existing_id]
            if (
                existing.job_type != job_type
                or existing.user_id != user_id
                or existing.salon_id != salon_id
                or existing.provider != provider
            ):
                raise JobQueueError("idempotency_key_conflict")
            return existing

        current = now_utc()
        job = AIJobRecord(
            id=uuid4(),
            job_type=job_type,
            user_id=user_id,
            salon_id=salon_id,
            status=AIJobStatus.QUEUED,
            provider=provider.strip(),
            input_payload=dict(input_payload),
            output_payload=None,
            progress_percent=0,
            attempts=0,
            max_attempts=max_attempts,
            priority=priority,
            idempotency_key=idempotency_key.strip(),
            available_at=current,
            locked_at=None,
            locked_by=None,
            lease_expires_at=None,
            error_code=None,
            error_message=None,
            created_at=current,
            started_at=None,
            completed_at=None,
            updated_at=current,
        )
        self.by_idempotency[job.idempotency_key] = job.id
        return self._save(job)

    def get(self, job_id: UUID) -> AIJobRecord | None:
        return self.jobs.get(job_id)

    def claim(
        self,
        *,
        worker_id: str,
        limit: int = 1,
        lease_seconds: int = 300,
    ) -> list[AIJobRecord]:
        if not worker_id.strip():
            raise JobQueueError("worker_id_required")
        current = now_utc()
        candidates = sorted(
            (
                job
                for job in self.jobs.values()
                if job.status == AIJobStatus.QUEUED
                and job.available_at <= current
                and job.attempts < job.max_attempts
            ),
            key=lambda item: (-item.priority, item.created_at),
        )[:limit]
        claimed: list[AIJobRecord] = []
        for job in candidates:
            updated = job.model_copy(
                update={
                    "status": AIJobStatus.RUNNING,
                    "attempts": job.attempts + 1,
                    "locked_at": current,
                    "locked_by": worker_id,
                    "lease_expires_at": current + timedelta(seconds=lease_seconds),
                    "started_at": job.started_at or current,
                    "updated_at": current,
                }
            )
            claimed.append(self._save(updated))
        return claimed

    def _owned_running(self, job_id: UUID, worker_id: str) -> AIJobRecord:
        job = self.jobs.get(job_id)
        current = now_utc()
        if (
            job is None
            or job.status != AIJobStatus.RUNNING
            or job.locked_by != worker_id
            or job.lease_expires_at is None
            or job.lease_expires_at <= current
        ):
            raise JobQueueError("job_lease_not_owned")
        return job

    def heartbeat(
        self,
        *,
        job_id: UUID,
        worker_id: str,
        lease_seconds: int = 300,
    ) -> AIJobRecord:
        job = self._owned_running(job_id, worker_id)
        current = now_utc()
        return self._save(
            job.model_copy(
                update={
                    "lease_expires_at": current + timedelta(seconds=lease_seconds),
                    "updated_at": current,
                }
            )
        )

    def complete(
        self,
        *,
        job_id: UUID,
        worker_id: str,
        output_payload: dict[str, Any],
    ) -> AIJobRecord:
        job = self._owned_running(job_id, worker_id)
        current = now_utc()
        return self._save(
            job.model_copy(
                update={
                    "status": AIJobStatus.COMPLETED,
                    "output_payload": dict(output_payload),
                    "progress_percent": 100,
                    "locked_at": None,
                    "locked_by": None,
                    "lease_expires_at": None,
                    "error_code": None,
                    "error_message": None,
                    "completed_at": current,
                    "updated_at": current,
                }
            )
        )

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
        job = self._owned_running(job_id, worker_id)
        current = now_utc()
        can_retry = retryable and job.attempts < job.max_attempts
        return self._save(
            job.model_copy(
                update={
                    "status": AIJobStatus.QUEUED if can_retry else AIJobStatus.FAILED,
                    "available_at": current + timedelta(seconds=max(0, retry_delay_seconds)),
                    "locked_at": None,
                    "locked_by": None,
                    "lease_expires_at": None,
                    "error_code": error_code,
                    "error_message": error_message,
                    "completed_at": None if can_retry else current,
                    "updated_at": current,
                }
            )
        )

    def recover_expired(self, *, limit: int = 100) -> list[AIJobRecord]:
        current = now_utc()
        expired = [
            job
            for job in self.jobs.values()
            if job.status == AIJobStatus.RUNNING
            and job.lease_expires_at is not None
            and job.lease_expires_at <= current
        ][:limit]
        recovered: list[AIJobRecord] = []
        for job in expired:
            can_retry = job.attempts < job.max_attempts
            recovered.append(
                self._save(
                    job.model_copy(
                        update={
                            "status": AIJobStatus.QUEUED if can_retry else AIJobStatus.FAILED,
                            "available_at": current,
                            "locked_at": None,
                            "locked_by": None,
                            "lease_expires_at": None,
                            "error_code": "worker_lease_expired",
                            "error_message": "Worker lease expired before terminal mutation.",
                            "completed_at": None if can_retry else current,
                            "updated_at": current,
                        }
                    )
                )
            )
        return recovered

    def make_available_now(self, job_id: UUID) -> None:
        job = self.jobs[job_id]
        self._save(job.model_copy(update={"available_at": now_utc() - timedelta(seconds=1)}))

    def expire_lease(self, job_id: UUID) -> None:
        job = self.jobs[job_id]
        self._save(job.model_copy(update={"lease_expires_at": now_utc() - timedelta(seconds=1)}))


class InMemoryAssetStorage(AssetStorage):
    def __init__(self) -> None:
        self.objects: dict[tuple[str, str], bytes] = {}
        self.content_types: dict[tuple[str, str], str] = {}

    @staticmethod
    def _read(source: bytes | BinaryIO) -> bytes:
        if isinstance(source, bytes):
            return source
        if isinstance(source, BytesIO):
            return source.getvalue()
        return source.read()

    def put_object(
        self,
        asset: StoredAssetRef,
        source: bytes | BinaryIO,
        *,
        content_type: str,
        upsert: bool = False,
    ) -> StoredAssetRef:
        key = (asset.bucket, asset.path)
        if key in self.objects and not upsert:
            raise RuntimeError("object_already_exists")
        self.objects[key] = self._read(source)
        self.content_types[key] = content_type
        return asset

    def delete_object(self, asset: StoredAssetRef) -> None:
        key = (asset.bucket, asset.path)
        self.objects.pop(key, None)
        self.content_types.pop(key, None)

    def create_signed_read(self, asset: StoredAssetRef, *, expires_in: int = 300) -> str:
        return f"https://storage.test/{asset.bucket}/{asset.path}?expires={expires_in}"

    def create_signed_upload(self, asset: StoredAssetRef, *, upsert: bool = False) -> SignedUpload:
        return SignedUpload(
            asset=asset,
            signed_url=f"https://storage.test/upload/{asset.bucket}/{asset.path}",
            token="integration-test-token",
        )

    def exists(self, asset: StoredAssetRef) -> bool:
        return (asset.bucket, asset.path) in self.objects

    def metadata(self, asset: StoredAssetRef) -> dict[str, Any] | None:
        key = (asset.bucket, asset.path)
        if key not in self.objects:
            return None
        return {"size": len(self.objects[key]), "content_type": self.content_types[key]}


class InMemoryHeadAssetRepository:
    """Mimics persist_head_asset ownership derivation from the source ai_job."""

    def __init__(self, queue: InMemoryLifecycleQueue) -> None:
        self.queue = queue
        self.records: dict[UUID, HeadAssetRecord] = {}

    def get_by_source_job(self, source_job_id: UUID) -> HeadAssetRecord | None:
        return self.records.get(source_job_id)

    def persist(
        self,
        *,
        asset_id: UUID,
        source_job_id: UUID,
        provider: str,
        mesh_ref: StoredAssetRef,
        scalp_anchor_version: str,
        vertex_count: int | None,
        polygon_count: int | None,
        fit_metadata: dict[str, Any],
    ) -> HeadAssetRecord:
        existing = self.records.get(source_job_id)
        if existing is not None:
            return existing
        job = self.queue.get(source_job_id)
        if job is None or job.status not in {AIJobStatus.RUNNING, AIJobStatus.COMPLETED}:
            raise RuntimeError("source_head_job_not_persistable")
        if job.job_type != AIJobType.HEAD_RECONSTRUCTION:
            raise RuntimeError("source_job_is_not_head_reconstruction")

        if job.salon_id is not None:
            owner_type = "salon_client"
            owner_id = job.salon_id
        elif job.user_id is not None:
            owner_type = "customer"
            owner_id = job.user_id
        else:
            raise RuntimeError("source_job_owner_missing")

        current = now_utc()
        record = HeadAssetRecord(
            id=asset_id,
            source_job_id=source_job_id,
            user_id=job.user_id,
            salon_id=job.salon_id,
            owner_type=owner_type,
            owner_id=owner_id,
            provider=provider,
            mesh_ref=mesh_ref,
            coordinate_system="Y_UP_RIGHT_HANDED",
            unit="meter",
            scalp_anchor_version=scalp_anchor_version,
            vertex_count=vertex_count,
            polygon_count=polygon_count,
            fit_metadata=dict(fit_metadata),
            created_at=current,
            updated_at=current,
        )
        self.records[source_job_id] = record
        return record


class DeterministicHeadProvider(BaseHeadProvider):
    def __init__(self, *, fail_first: bool = False) -> None:
        self.fail_first = fail_first
        self.calls = 0

    def reconstruct_head(
        self,
        photo_inputs: list[Any],
        job_id: str,
        *,
        client_name: str = "Client Afrofade",
        preserve_skin_texture: bool = True,
    ) -> ReconstructedHeadPayload:
        self.calls += 1
        if self.fail_first and self.calls == 1:
            raise RuntimeError("simulated_transient_provider_failure")
        return ReconstructedHeadPayload(
            glb_bytes=b"glTF-integration-head",
            provider="flame_pytorch",
            processing_time_ms=37,
            vertices_count=5023,
            polygon_count=9978,
            converged=True,
            fit_metadata={
                "test_double": True,
                "photo_count": len(photo_inputs),
                "client_name": client_name,
                "preserve_skin_texture": preserve_skin_texture,
                "job_id": job_id,
            },
        )

    def get_provider_status(self) -> str:
        return "VALIDATED"


def worker_config(worker_id: str = "worker-7-6") -> WorkerConfig:
    return WorkerConfig(
        worker_id=worker_id,
        claim_limit=1,
        lease_seconds=30,
        heartbeat_interval_seconds=5.0,
        poll_interval_seconds=0.01,
        recover_limit=10,
    )


def build_stack(*, fail_first: bool = False):
    queue = InMemoryLifecycleQueue()
    storage = InMemoryAssetStorage()
    repository = InMemoryHeadAssetRepository(queue)
    provider = DeterministicHeadProvider(fail_first=fail_first)
    manager = HeadGenerationManager(
        storage=storage,
        repository=repository,  # type: ignore[arg-type]
        providers={"flame_pytorch": provider},
        default_provider="flame_pytorch",
    )
    original_factory = job_handlers.get_head_generation_manager
    job_handlers.get_head_generation_manager = lambda: manager  # type: ignore[assignment]
    worker = DurableJobWorker(
        queue,
        {AIJobType.HEAD_RECONSTRUCTION: job_handlers.handle_head_reconstruction},
        worker_config(),
    )
    return queue, storage, repository, provider, worker, original_factory


def enqueue_customer_head(queue: InMemoryLifecycleQueue, *, key: str) -> AIJobRecord:
    return queue.enqueue(
        job_type=AIJobType.HEAD_RECONSTRUCTION,
        provider="flame_pytorch",
        user_id=USER_A,
        input_payload={
            "photos_urls": [
                "https://assets.test/front.jpg",
                "https://assets.test/right.jpg",
                "https://assets.test/left.jpg",
            ],
            "client_name": "Story 7.6 Customer",
            "preserve_skin_texture": True,
        },
        idempotency_key=key,
        max_attempts=3,
    )


def assert_full_success_lifecycle() -> None:
    queue, storage, repository, provider, worker, original_factory = build_stack()
    try:
        queued = enqueue_customer_head(queue, key="head:user:story-7-6:success")
        assert queued.status == AIJobStatus.QUEUED
        assert queued.attempts == 0

        same = enqueue_customer_head(queue, key="head:user:story-7-6:success")
        assert same.id == queued.id

        assert worker.run_once() == 1
        completed = queue.get(queued.id)
        assert completed is not None
        assert completed.status == AIJobStatus.COMPLETED
        assert completed.attempts == 1
        assert completed.progress_percent == 100
        assert completed.output_payload is not None
        assert completed.output_payload["status"] == "success"
        assert completed.output_payload["provider"] == "flame_pytorch"
        assert completed.output_payload["coordinate_system"] == "Y_UP_RIGHT_HANDED"
        assert completed.output_payload["unit"] == "meter"
        assert completed.output_payload["vertex_count"] == 5023
        assert completed.output_payload["polygon_count"] == 9978

        record = repository.get_by_source_job(queued.id)
        assert record is not None
        assert record.owner_type == "customer"
        assert record.owner_id == USER_A
        assert record.source_job_id == queued.id
        assert record.mesh_ref.bucket == "heads"
        assert record.mesh_ref.path.startswith(f"canonical/users/{USER_A}/")
        assert storage.exists(record.mesh_ref)
        metadata = storage.metadata(record.mesh_ref)
        assert metadata is not None
        assert metadata["content_type"] == "model/gltf-binary"
        assert provider.calls == 1
        print("[PASS] queued -> running -> completed persists canonical head metadata and GLB")
    finally:
        job_handlers.get_head_generation_manager = original_factory  # type: ignore[assignment]


def assert_failure_retry_then_success() -> None:
    queue, storage, repository, provider, worker, original_factory = build_stack(fail_first=True)
    try:
        queued = enqueue_customer_head(queue, key="head:user:story-7-6:retry")
        assert worker.run_once() == 1

        after_failure = queue.get(queued.id)
        assert after_failure is not None
        assert after_failure.status == AIJobStatus.QUEUED
        assert after_failure.attempts == 1
        assert after_failure.error_code == "unhandled_worker_exception"
        assert repository.get_by_source_job(queued.id) is None
        assert not storage.objects

        queue.make_available_now(queued.id)
        assert worker.run_once() == 1
        completed = queue.get(queued.id)
        assert completed is not None
        assert completed.status == AIJobStatus.COMPLETED
        assert completed.attempts == 2
        assert provider.calls == 2
        assert repository.get_by_source_job(queued.id) is not None
        assert len(storage.objects) == 1
        print("[PASS] provider failure requeues safely and a later attempt completes exactly once")
    finally:
        job_handlers.get_head_generation_manager = original_factory  # type: ignore[assignment]


def assert_lease_recovery_and_stale_worker_rejection() -> None:
    queue = InMemoryLifecycleQueue()
    queued = enqueue_customer_head(queue, key="head:user:story-7-6:lease")
    first_claim = queue.claim(worker_id="worker-old", limit=1, lease_seconds=30)
    assert len(first_claim) == 1
    assert first_claim[0].status == AIJobStatus.RUNNING
    assert first_claim[0].attempts == 1

    queue.expire_lease(queued.id)
    recovered = queue.recover_expired(limit=10)
    assert len(recovered) == 1
    assert recovered[0].status == AIJobStatus.QUEUED
    assert recovered[0].error_code == "worker_lease_expired"

    second_claim = queue.claim(worker_id="worker-new", limit=1, lease_seconds=30)
    assert len(second_claim) == 1
    assert second_claim[0].attempts == 2
    try:
        queue.complete(job_id=queued.id, worker_id="worker-old", output_payload={"stale": True})
    except JobQueueError as exc:
        assert "job_lease_not_owned" in str(exc)
    else:
        raise AssertionError("stale worker was allowed to complete a recovered job")

    queue.complete(job_id=queued.id, worker_id="worker-new", output_payload={"owner": "worker-new"})
    final = queue.get(queued.id)
    assert final is not None and final.status == AIJobStatus.COMPLETED
    assert final.output_payload == {"owner": "worker-new"}
    print("[PASS] expired lease recovers and stale worker cannot mutate the reclaimed job")


def assert_ownership_and_unauthorized_access_contracts() -> None:
    jobs_sql = (REPO_ROOT / "web" / "supabase" / "migrations" / "05_persistent_ai_jobs.sql").read_text(encoding="utf-8")
    heads_sql = (REPO_ROOT / "web" / "supabase" / "migrations" / "08_head_assets.sql").read_text(encoding="utf-8")
    api_source = (API_ROOT / "main.py").read_text(encoding="utf-8")
    smoke_source = (REPO_ROOT / "scripts" / "test_e2e_integration.py").read_text(encoding="utf-8")

    required_jobs = [
        "ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY",
        "CREATE POLICY ai_jobs_select_own_user",
        "USING (auth.uid() = user_id)",
        "CREATE POLICY ai_jobs_select_own_salon",
        "profile.user_id = auth.uid()",
        "CREATE POLICY ai_jobs_admin_select_all",
        "REVOKE ALL ON ai_jobs FROM anon",
        "REVOKE INSERT, UPDATE, DELETE ON ai_jobs FROM authenticated",
    ]
    missing_jobs = [fragment for fragment in required_jobs if fragment not in jobs_sql]
    if missing_jobs:
        raise AssertionError(f"ai_jobs ownership/RLS contract missing: {missing_jobs}")

    required_heads = [
        "ALTER TABLE head_assets ENABLE ROW LEVEL SECURITY",
        "CREATE POLICY head_assets_select_own_user",
        "CREATE POLICY head_assets_select_own_salon",
        "CREATE POLICY head_assets_admin_select_all",
        "REVOKE ALL ON head_assets FROM anon",
        "REVOKE INSERT, UPDATE, DELETE ON head_assets FROM authenticated",
    ]
    missing_heads = [fragment for fragment in required_heads if fragment not in heads_sql]
    if missing_heads:
        raise AssertionError(f"head_assets ownership/RLS contract missing: {missing_heads}")

    if "supplied_secret != expected_secret" not in api_source or "status_code=401" not in api_source:
        raise AssertionError("FastAPI no longer rejects missing/invalid internal credentials")
    if "Job API rejects missing internal key" not in smoke_source or "status == 401" not in smoke_source:
        raise AssertionError("production smoke suite no longer verifies unauthorized head-job access")

    print("[PASS] unauthorized job/head access stays rejected by RLS and internal API boundary")


def assert_no_paid_provider_dependency() -> None:
    workflow = (REPO_ROOT / ".github" / "workflows" / "p1-head-job-integration.yml").read_text(encoding="utf-8")
    forbidden = ["secrets.", "MESHY_API_KEY", "FAL_KEY", "HUNYUAN_API_KEY", "TRELLIS_API_KEY"]
    found = [marker for marker in forbidden if marker in workflow]
    if found:
        raise AssertionError(f"Story 7.6 CI unexpectedly depends on provider credentials: {found}")
    print("[PASS] integration suite is deterministic and requires no paid 3D provider")


def main() -> None:
    assert_full_success_lifecycle()
    assert_failure_retry_then_success()
    assert_lease_recovery_and_stale_worker_rejection()
    assert_ownership_and_unauthorized_access_contracts()
    assert_no_paid_provider_dependency()
    print("\nBMAD Story 7.6 head-job integration lifecycle: PASS")


if __name__ == "__main__":
    main()
