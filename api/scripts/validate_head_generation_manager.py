#!/usr/bin/env python3
"""Provider-independent validation for BMAD Story 7.5 durable FLAME head generation."""

from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
import sys
from typing import Any, BinaryIO
from uuid import UUID

API_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = API_ROOT.parent
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from models.jobs import AIJobRecord, AIJobStatus, AIJobType
from services.fitting.head_provider import BaseHeadProvider, HeadGenerationManager
from services.heads.head_asset_repository import HeadAssetRecord, HeadAssetRepositoryError
from services.reconstructor import ReconstructedHeadPayload
from services.storage.asset_storage import AssetStorage, AssetStorageError, SignedUpload, StoredAssetRef


USER_ID = UUID("11111111-1111-4111-8111-111111111111")
JOB_ID = UUID("22222222-2222-4222-8222-222222222222")
NOW = datetime.now(UTC)


def make_job() -> AIJobRecord:
    return AIJobRecord.model_validate(
        {
            "id": str(JOB_ID),
            "job_type": "head_reconstruction",
            "user_id": str(USER_ID),
            "salon_id": None,
            "status": "running",
            "provider": "flame_pytorch",
            "input_payload": {
                "photos_urls": ["https://assets.afrofade.pro/photo-1.jpg"],
                "client_name": "Test Client",
                "preserve_skin_texture": True,
            },
            "output_payload": None,
            "progress_percent": 0,
            "attempts": 1,
            "max_attempts": 3,
            "priority": 0,
            "idempotency_key": "head:test:story-7-5",
            "available_at": NOW.isoformat(),
            "locked_at": NOW.isoformat(),
            "locked_by": "worker-test",
            "lease_expires_at": NOW.isoformat(),
            "error_code": None,
            "error_message": None,
            "created_at": NOW.isoformat(),
            "started_at": NOW.isoformat(),
            "completed_at": None,
            "updated_at": NOW.isoformat(),
        }
    )


class FakeProvider(BaseHeadProvider):
    def __init__(self) -> None:
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
        assert job_id == str(JOB_ID)
        assert photo_inputs == ["https://assets.afrofade.pro/photo-1.jpg"]
        assert client_name == "Test Client"
        return ReconstructedHeadPayload(
            glb_bytes=b"glTF-story-7-5",
            provider="flame_pytorch",
            processing_time_ms=123,
            vertices_count=5023,
            polygon_count=9976,
            converged=True,
            fit_metadata={"final_landmark_loss": 0.01},
        )

    def get_provider_status(self) -> str:
        return "VALIDATED"


class FakeStorage(AssetStorage):
    def __init__(self) -> None:
        self.objects: dict[tuple[str, str], bytes] = {}
        self.deleted: list[StoredAssetRef] = []
        self.fail_put = False

    def put_object(
        self,
        asset: StoredAssetRef,
        source: bytes | BinaryIO,
        *,
        content_type: str,
        upsert: bool = False,
    ) -> StoredAssetRef:
        if self.fail_put:
            raise AssetStorageError("simulated_upload_failure")
        assert content_type == "model/gltf-binary"
        assert upsert is True
        raw = source if isinstance(source, bytes) else source.read()
        self.objects[(asset.bucket, asset.path)] = raw
        return asset

    def delete_object(self, asset: StoredAssetRef) -> None:
        self.deleted.append(asset)
        self.objects.pop((asset.bucket, asset.path), None)

    def create_signed_read(self, asset: StoredAssetRef, *, expires_in: int = 300) -> str:
        return f"https://signed.invalid/{asset.bucket}/{asset.path}"

    def create_signed_upload(self, asset: StoredAssetRef, *, upsert: bool = False) -> SignedUpload:
        return SignedUpload(asset=asset, signed_url="https://upload.invalid", token="token")

    def exists(self, asset: StoredAssetRef) -> bool:
        return (asset.bucket, asset.path) in self.objects

    def metadata(self, asset: StoredAssetRef) -> dict[str, Any] | None:
        return {"name": asset.path.rsplit("/", 1)[-1]} if self.exists(asset) else None


class FakeRepository:
    def __init__(self) -> None:
        self.record: HeadAssetRecord | None = None
        self.persist_calls = 0
        self.fail_persist = False

    def get_by_source_job(self, source_job_id: UUID) -> HeadAssetRecord | None:
        assert source_job_id == JOB_ID
        return self.record

    def persist(self, **kwargs: Any) -> HeadAssetRecord:
        self.persist_calls += 1
        if self.fail_persist:
            raise HeadAssetRepositoryError("simulated_persist_failure")
        mesh_ref = kwargs["mesh_ref"]
        self.record = HeadAssetRecord(
            id=kwargs["asset_id"],
            source_job_id=kwargs["source_job_id"],
            user_id=USER_ID,
            salon_id=None,
            owner_type="customer",
            owner_id=USER_ID,
            provider=kwargs["provider"],
            mesh_ref=mesh_ref,
            coordinate_system="Y_UP_RIGHT_HANDED",
            unit="meter",
            scalp_anchor_version=kwargs["scalp_anchor_version"],
            vertex_count=kwargs["vertex_count"],
            polygon_count=kwargs["polygon_count"],
            fit_metadata=kwargs["fit_metadata"],
            created_at=NOW,
            updated_at=NOW,
        )
        return self.record


def make_manager(storage: FakeStorage, repository: FakeRepository, provider: FakeProvider) -> HeadGenerationManager:
    return HeadGenerationManager(
        storage=storage,
        repository=repository,  # type: ignore[arg-type]
        providers={"flame_pytorch": provider},
    )


def assert_success_and_durable_output() -> None:
    storage = FakeStorage()
    repository = FakeRepository()
    provider = FakeProvider()
    output = make_manager(storage, repository, provider).generate_for_job(make_job())

    assert provider.calls == 1
    assert repository.persist_calls == 1
    assert output["head_asset_id"] == str(JOB_ID)
    assert output["source_job_id"] == str(JOB_ID)
    assert output["mesh_storage_ref"]["bucket"] == "heads"
    assert output["mesh_storage_ref"]["path"] == f"canonical/users/{USER_ID}/{JOB_ID}/head.glb"
    assert output["coordinate_system"] == "Y_UP_RIGHT_HANDED"
    assert output["unit"] == "meter"
    assert output["scalp_anchor_version"] == "flame-2023-v1"
    assert output["reused_existing"] is False
    assert "transitional_storage" not in output
    assert "mesh_3d_url" not in output
    assert storage.objects[("heads", output["mesh_storage_ref"]["path"])] == b"glTF-story-7-5"
    print("[PASS] manager commits FLAME output to durable storage + head_assets before success")


def assert_idempotent_reuse() -> None:
    storage = FakeStorage()
    repository = FakeRepository()
    provider = FakeProvider()
    manager = make_manager(storage, repository, provider)

    first = manager.generate_for_job(make_job())
    second = manager.generate_for_job(make_job())

    assert first["head_asset_id"] == second["head_asset_id"]
    assert provider.calls == 1
    assert repository.persist_calls == 1
    assert second["reused_existing"] is True
    print("[PASS] persisted source job reuses existing durable mesh without re-running FLAME")


def assert_upload_failure_cannot_succeed() -> None:
    storage = FakeStorage()
    storage.fail_put = True
    repository = FakeRepository()
    provider = FakeProvider()
    try:
        make_manager(storage, repository, provider).generate_for_job(make_job())
    except AssetStorageError:
        pass
    else:
        raise AssertionError("Upload failure unexpectedly returned success")
    assert repository.persist_calls == 0
    print("[PASS] object upload failure cannot produce persisted/successful head output")


def assert_persistence_failure_cleans_orphan() -> None:
    storage = FakeStorage()
    repository = FakeRepository()
    repository.fail_persist = True
    provider = FakeProvider()
    try:
        make_manager(storage, repository, provider).generate_for_job(make_job())
    except HeadAssetRepositoryError:
        pass
    else:
        raise AssertionError("Metadata persistence failure unexpectedly returned success")
    assert len(storage.deleted) == 1
    assert storage.objects == {}
    print("[PASS] metadata failure triggers best-effort orphan object cleanup")


def assert_static_contracts() -> None:
    migration = (REPO_ROOT / "web" / "supabase" / "migrations" / "08_head_assets.sql").read_text(encoding="utf-8")
    provider = (API_ROOT / "services" / "fitting" / "head_provider.py").read_text(encoding="utf-8")
    handler = (API_ROOT / "services" / "jobs" / "handlers.py").read_text(encoding="utf-8")
    reconstructor = (API_ROOT / "services" / "reconstructor.py").read_text(encoding="utf-8")

    required_sql = [
        "CREATE TABLE IF NOT EXISTS head_assets",
        "source_job_id UUID NOT NULL UNIQUE REFERENCES ai_jobs(id)",
        "ALTER TABLE head_assets ENABLE ROW LEVEL SECURITY",
        "CREATE POLICY head_assets_select_own_user",
        "CREATE POLICY head_assets_select_own_salon",
        "CREATE POLICY head_assets_admin_select_all",
        "REVOKE INSERT, UPDATE, DELETE ON head_assets FROM authenticated",
        "CREATE OR REPLACE FUNCTION persist_head_asset",
        "FROM ai_jobs",
        "job.job_type <> 'head_reconstruction'",
        "derived_owner_type := 'salon_client'",
        "derived_owner_type := 'customer'",
        "TO service_role",
    ]
    missing = [fragment for fragment in required_sql if fragment not in migration]
    if missing:
        raise AssertionError(f"head_assets migration contract missing: {missing}")

    if "Afrofade3DReconstructor" in provider:
        raise AssertionError("FlamePyTorchProvider still references stale Afrofade3DReconstructor")
    if "ReconstructionPipelineService.generate_3d_head_asset" not in provider:
        raise AssertionError("FlamePyTorchProvider does not use active ReconstructionPipelineService")
    if "HeadGenerationManager" not in handler or "transitional_storage" in handler:
        raise AssertionError("Worker head handler is still transitional")
    if "def generate_3d_head_asset(" not in reconstructor:
        raise AssertionError("ReconstructionPipelineService lacks durable in-memory generation boundary")

    print("[PASS] provider, worker and SQL ownership contracts are wired to the durable path")


def main() -> None:
    assert_success_and_durable_output()
    assert_idempotent_reuse()
    assert_upload_failure_cannot_succeed()
    assert_persistence_failure_cleans_orphan()
    assert_static_contracts()
    print("\nDurable HeadGenerationManager contract: PASS")


if __name__ == "__main__":
    main()
