"""Provider-neutral durable head generation orchestration for Afrofade."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Mapping
import logging

from models.head_generation import ReconstructedHeadPayload
from models.jobs import AIJobRecord, AIJobType
from services.heads.head_asset_repository import SupabaseHeadAssetRepository
from services.storage.asset_storage import AssetStorage, AssetStorageError
from services.storage.paths import canonical_head_ref
from services.storage.supabase_storage import SupabaseAssetStorage

logger = logging.getLogger("afrofade.fitting.head_provider")

SCALP_ANCHOR_VERSION = "flame-2023-v1"


class BaseHeadProvider(ABC):
    """Interface for a head reconstruction engine."""

    @abstractmethod
    def reconstruct_head(
        self,
        photo_inputs: List[Any],
        job_id: str,
        *,
        client_name: str = "Client Afrofade",
        preserve_skin_texture: bool = True,
    ) -> ReconstructedHeadPayload:
        raise NotImplementedError

    @abstractmethod
    def get_provider_status(self) -> str:
        raise NotImplementedError


class FlamePyTorchProvider(BaseHeadProvider):
    """Validated FLAME 2023 / PyTorch Autograd provider."""

    def reconstruct_head(
        self,
        photo_inputs: List[Any],
        job_id: str,
        *,
        client_name: str = "Client Afrofade",
        preserve_skin_texture: bool = True,
    ) -> ReconstructedHeadPayload:
        # Keep heavy PyTorch/MediaPipe imports behind the actual provider invocation.
        from services.reconstructor import ReconstructionPipelineService

        return ReconstructionPipelineService.generate_3d_head_asset(
            photo_inputs,
            job_id=job_id,
            client_name=client_name,
            preserve_skin_texture=preserve_skin_texture,
        )

    def get_provider_status(self) -> str:
        return "VALIDATED"


class HunyuanHeadProvider(BaseHeadProvider):
    """Explicit scaffold; it can never masquerade as a successful provider."""

    def reconstruct_head(
        self,
        photo_inputs: List[Any],
        job_id: str,
        *,
        client_name: str = "Client Afrofade",
        preserve_skin_texture: bool = True,
    ) -> ReconstructedHeadPayload:
        raise RuntimeError("hunyuan_head_provider_scaffolded")

    def get_provider_status(self) -> str:
        return "SCAFFOLDED"


class HeadGenerationManager:
    """Run a head provider and commit its output to durable storage + metadata."""

    def __init__(
        self,
        *,
        storage: AssetStorage | None = None,
        repository: SupabaseHeadAssetRepository | None = None,
        providers: Mapping[str, BaseHeadProvider] | None = None,
        default_provider: str = "flame_pytorch",
    ) -> None:
        self.storage = storage or SupabaseAssetStorage.from_env()
        self.repository = repository or SupabaseHeadAssetRepository.from_env()
        self.providers: Dict[str, BaseHeadProvider] = dict(
            providers
            or {
                "flame_pytorch": FlamePyTorchProvider(),
                "hunyuan": HunyuanHeadProvider(),
            }
        )
        self.default_provider = default_provider

    def get_provider(self, provider_name: str | None = None) -> BaseHeadProvider:
        name = (provider_name or self.default_provider).strip()
        provider = self.providers.get(name)
        if provider is None:
            raise ValueError(f"unknown_head_provider:{name}")
        if provider.get_provider_status() != "VALIDATED":
            raise RuntimeError(f"head_provider_not_ready:{name}")
        return provider

    def generate_for_job(self, job: AIJobRecord) -> dict[str, Any]:
        if job.job_type != AIJobType.HEAD_RECONSTRUCTION:
            raise ValueError("head_generation_requires_head_reconstruction_job")

        existing = self.repository.get_by_source_job(job.id)
        if existing is not None:
            try:
                if self.storage.exists(existing.mesh_ref):
                    return existing.to_job_output(reused_existing=True)
            except AssetStorageError:
                raise

        payload = job.input_payload
        photos_urls = payload.get("photos_urls")
        if not isinstance(photos_urls, list) or not photos_urls:
            raise ValueError("head_reconstruction_requires_photos")
        if not all(isinstance(url, str) and url.strip() for url in photos_urls):
            raise ValueError("head_reconstruction_contains_invalid_photo")

        client_name = payload.get("client_name")
        if not isinstance(client_name, str) or not client_name.strip():
            client_name = "Client Afrofade"

        preserve_skin_texture = payload.get("preserve_skin_texture", True)
        if not isinstance(preserve_skin_texture, bool):
            raise ValueError("preserve_skin_texture_must_be_boolean")

        provider_name = job.provider.strip() or self.default_provider
        provider = self.get_provider(provider_name)
        reconstructed = provider.reconstruct_head(
            [url.strip() for url in photos_urls],
            str(job.id),
            client_name=client_name.strip(),
            preserve_skin_texture=preserve_skin_texture,
        )
        self._validate_provider_output(reconstructed)

        if job.salon_id is not None:
            mesh_ref = canonical_head_ref(job.id, "head.glb", salon_id=job.salon_id)
        elif job.user_id is not None:
            mesh_ref = canonical_head_ref(job.id, "head.glb", user_id=job.user_id)
        else:
            raise ValueError("head_job_owner_missing")

        uploaded = False
        try:
            self.storage.put_object(
                mesh_ref,
                reconstructed.glb_bytes,
                content_type="model/gltf-binary",
                upsert=True,
            )
            uploaded = True

            record = self.repository.persist(
                asset_id=job.id,
                source_job_id=job.id,
                provider=reconstructed.provider,
                mesh_ref=mesh_ref,
                scalp_anchor_version=SCALP_ANCHOR_VERSION,
                vertex_count=reconstructed.vertices_count,
                polygon_count=reconstructed.polygon_count,
                fit_metadata={
                    **reconstructed.fit_metadata,
                    "processing_time_ms": reconstructed.processing_time_ms,
                    "converged": reconstructed.converged,
                },
            )
        except Exception:
            if uploaded:
                try:
                    self.storage.delete_object(mesh_ref)
                except Exception as cleanup_error:  # pragma: no cover - best effort only
                    logger.warning("Unable to clean orphaned head mesh %s: %s", mesh_ref, cleanup_error)
            raise

        output = record.to_job_output(reused_existing=False)
        output.update(
            {
                "processing_time_ms": reconstructed.processing_time_ms,
                "converged": reconstructed.converged,
            }
        )
        return output

    @staticmethod
    def _validate_provider_output(reconstructed: ReconstructedHeadPayload) -> None:
        if not isinstance(reconstructed, ReconstructedHeadPayload):
            raise TypeError("invalid_head_provider_output")
        if not reconstructed.glb_bytes:
            raise ValueError("empty_head_mesh")
        if reconstructed.vertices_count <= 0:
            raise ValueError("invalid_head_vertex_count")
        if reconstructed.polygon_count <= 0:
            raise ValueError("invalid_head_polygon_count")
        if reconstructed.provider != "flame_pytorch":
            raise ValueError("unexpected_head_provider_identity")
