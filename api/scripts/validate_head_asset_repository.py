#!/usr/bin/env python3
"""Validate Story 7.5 head_assets PostgREST/RPC mapping without external services."""

from __future__ import annotations

from datetime import UTC, datetime
import json
from pathlib import Path
import sys
from typing import Any
from uuid import UUID

API_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = API_ROOT.parent
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from services.heads.head_asset_repository import SupabaseHeadAssetRepository
from services.storage.asset_storage import StoredAssetRef


JOB_ID = UUID("22222222-2222-4222-8222-222222222222")
USER_ID = UUID("11111111-1111-4111-8111-111111111111")
NOW = datetime.now(UTC).isoformat()


def record_payload() -> dict[str, Any]:
    return {
        "id": str(JOB_ID),
        "source_job_id": str(JOB_ID),
        "user_id": str(USER_ID),
        "salon_id": None,
        "owner_type": "customer",
        "owner_id": str(USER_ID),
        "provider": "flame_pytorch",
        "mesh_bucket": "heads",
        "mesh_path": f"canonical/users/{USER_ID}/{JOB_ID}/head.glb",
        "coordinate_system": "Y_UP_RIGHT_HANDED",
        "unit": "meter",
        "scalp_anchor_version": "flame-2023-v1",
        "scalp_anchors_bucket": None,
        "scalp_anchors_path": None,
        "preview_bucket": None,
        "preview_path": None,
        "vertex_count": 5023,
        "polygon_count": 9976,
        "fit_metadata": {"converged": True},
        "created_at": NOW,
        "updated_at": NOW,
    }


class FakeResponse:
    def __init__(self, payload: Any, status_code: int = 200) -> None:
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
        self.responses.append(FakeResponse(payload, status_code))

    def request(self, method: str, url: str, **kwargs: Any) -> FakeResponse:
        self.calls.append({"method": method, "url": url, **kwargs})
        if not self.responses:
            raise AssertionError("FakeSession has no queued response")
        return self.responses.pop(0)


def assert_repository_mapping() -> None:
    session = FakeSession()
    repository = SupabaseHeadAssetRepository(
        "https://project.supabase.co",
        "service-role-test-key",
        session=session,
    )

    session.push([record_payload()])
    existing = repository.get_by_source_job(JOB_ID)
    assert existing is not None
    assert existing.source_job_id == JOB_ID
    assert existing.mesh_ref.bucket == "heads"
    get_call = session.calls[-1]
    assert get_call["method"] == "GET"
    assert get_call["url"].endswith("/rest/v1/head_assets")
    assert get_call["params"]["source_job_id"] == f"eq.{JOB_ID}"
    assert get_call["headers"]["Authorization"] == "Bearer service-role-test-key"
    print("[PASS] head_assets lookup uses service-role PostgREST mapping")

    session.push([record_payload()])
    mesh_ref = StoredAssetRef(
        "heads",
        f"canonical/users/{USER_ID}/{JOB_ID}/head.glb",
    )
    persisted = repository.persist(
        asset_id=JOB_ID,
        source_job_id=JOB_ID,
        provider="flame_pytorch",
        mesh_ref=mesh_ref,
        scalp_anchor_version="flame-2023-v1",
        vertex_count=5023,
        polygon_count=9976,
        fit_metadata={"converged": True},
    )
    assert persisted.id == JOB_ID
    rpc_call = session.calls[-1]
    assert rpc_call["method"] == "POST"
    assert rpc_call["url"].endswith("/rest/v1/rpc/persist_head_asset")
    rpc = rpc_call["json"]
    assert rpc["p_source_job_id"] == str(JOB_ID)
    assert rpc["p_mesh_bucket"] == "heads"
    assert rpc["p_mesh_path"] == mesh_ref.path
    assert rpc["p_provider"] == "flame_pytorch"
    forbidden = {"p_user_id", "p_salon_id", "p_owner_id", "p_owner_type"}
    assert forbidden.isdisjoint(rpc.keys())
    print("[PASS] persistence RPC never accepts worker-supplied ownership fields")


def assert_sql_owner_binding() -> None:
    sql = (
        REPO_ROOT / "web" / "supabase" / "migrations" / "08_head_assets.sql"
    ).read_text(encoding="utf-8")

    required = [
        "SELECT * INTO job",
        "FROM ai_jobs",
        "FOR UPDATE",
        "mesh_bucket VARCHAR(100) NOT NULL CHECK (mesh_bucket = 'heads')",
        "expected_mesh_prefix := 'canonical/salons/' || job.salon_id::TEXT || '/'",
        "expected_mesh_prefix := 'canonical/users/' || job.user_id::TEXT || '/'",
        "p_mesh_path NOT LIKE expected_mesh_prefix || '%'",
        "head_asset_storage_owner_mismatch",
        "REVOKE INSERT, UPDATE, DELETE ON head_assets FROM authenticated",
        "TO service_role",
    ]
    missing = [fragment for fragment in required if fragment not in sql]
    if missing:
        raise AssertionError(f"head_assets owner-binding SQL missing: {missing}")

    print("[PASS] SQL binds canonical mesh bucket/path to authoritative ai_jobs owner")


def main() -> None:
    assert_repository_mapping()
    assert_sql_owner_binding()
    print("\nHead asset repository contract: PASS")


if __name__ == "__main__":
    main()
