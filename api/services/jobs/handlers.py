from __future__ import annotations

from functools import lru_cache
from typing import Any

from models.jobs import AIJobRecord, AIJobType
from services.fitting.head_provider import HeadGenerationManager
from services.jobs.worker import PermanentJobError, TransientJobError
from services.jobs.job_queue import SupabasePostgresJobQueue, JobQueueError
from services.hair.trellis2_provider import Trellis2HairProvider, FalProviderError
from services.hair.providers import HairProviderDisabledError
from services.hair.hair_asset_repository import SupabaseHairAssetVersionRepository
from services.hair.normalizer import HairAssetNormalizer, HairAssetNormalizationRequest, HairAssetNormalizationError
from services.storage.supabase_storage import SupabaseAssetStorage
from services.storage.paths import raw_hair_asset_ref
import requests, os, time, hashlib, struct
import math
from datetime import UTC, datetime
from urllib.parse import urlparse


def _json_safe(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    if hasattr(value, "item"):
        try:
            return _json_safe(value.item())
        except Exception:
            pass
    raise PermanentJobError(
        "non_json_handler_output",
        f"Worker handler produced unsupported output type {type(value).__name__}.",
    )


@lru_cache(maxsize=1)
def get_head_generation_manager() -> HeadGenerationManager:
    return HeadGenerationManager()


def handle_head_reconstruction(job: AIJobRecord) -> dict[str, Any]:
    """Durable head path: HeadGenerationManager -> FLAME -> AssetStorage -> head_assets."""

    payload = job.input_payload
    photos_urls = payload.get("photos_urls")
    if not isinstance(photos_urls, list) or not photos_urls or not all(
        isinstance(url, str) and url.strip() for url in photos_urls
    ):
        raise PermanentJobError(
            "invalid_head_input",
            "head_reconstruction requires a non-empty photos_urls string array.",
        )

    preserve_skin_texture = payload.get("preserve_skin_texture", True)
    if not isinstance(preserve_skin_texture, bool):
        raise PermanentJobError(
            "invalid_preserve_skin_texture",
            "preserve_skin_texture must be a boolean.",
        )

    try:
        result = get_head_generation_manager().generate_for_job(job)
    except (ValueError, TypeError) as exc:
        raise PermanentJobError("invalid_head_generation", str(exc)) from exc

    if not isinstance(result, dict):
        raise PermanentJobError(
            "invalid_head_generation_output",
            "HeadGenerationManager must return a dict result.",
        )

    return _json_safe(result)

def _allowed_media_url(url: str, allowed_hosts: set[str]) -> bool:
    parsed=urlparse(url)
    host=(parsed.hostname or "").lower()
    return parsed.scheme == "https" and any(host == item or host.endswith("."+item) for item in allowed_hosts)

def _validate_glb(data: bytes) -> None:
    if len(data)<12 or data[:4] != b"glTF": raise PermanentJobError("invalid_glb", "Provider output is not a GLB")
    version,declared=struct.unpack_from("<II",data,4)
    if version != 2 or declared != len(data): raise PermanentJobError("invalid_glb_header", "GLB version or declared length is invalid")

def _download_glb(url: str, *, max_bytes: int, session: Any = requests,
                  allowed_hosts: set[str] | None = None) -> bytes:
    hosts=allowed_hosts or {"fal.media"}
    if not _allowed_media_url(url,hosts): raise PermanentJobError("invalid_glb_url", "GLB URL host is not approved")
    response=None
    try:
        response=session.get(url,stream=True,timeout=30)
        response.raise_for_status()
        if not _allowed_media_url(str(getattr(response,"url",url)),hosts): raise PermanentJobError("invalid_glb_redirect", "GLB redirect host is not approved")
        content_type=response.headers.get("content-type","").split(";",1)[0].lower()
        if content_type not in {"model/gltf-binary","application/octet-stream"}: raise PermanentJobError("invalid_glb_content_type",content_type)
        declared=response.headers.get("content-length")
        if declared:
            try: declared_size=int(declared)
            except ValueError as exc: raise PermanentJobError("invalid_glb_content_length","Invalid Content-Length") from exc
            if declared_size > max_bytes: raise PermanentJobError("glb_too_large","Provider GLB exceeds limit")
        parts=[]; size=0
        try:
            for chunk in response.iter_content(64*1024):
                size += len(chunk)
                if size > max_bytes: raise PermanentJobError("glb_too_large","Provider GLB exceeds limit")
                parts.append(chunk)
        except requests.RequestException as exc: raise TransientJobError("glb_stream_interrupted",str(exc)) from exc
        data=b"".join(parts); _validate_glb(data); return data
    except requests.RequestException as exc: raise TransientJobError("glb_download_failed",str(exc)) from exc
    finally:
        if response is not None: response.close()

def _finite_env(name: str, default: str, *, positive: bool = False) -> float:
    try: value=float(os.getenv(name,default))
    except ValueError as exc: raise PermanentJobError("trellis2_config_invalid",f"{name} must be numeric") from exc
    if not math.isfinite(value) or (positive and value <= 0):
        raise PermanentJobError("trellis2_config_invalid",f"{name} must be finite" + (" and positive" if positive else ""))
    return value

def _positive_int_env(name: str, default: str) -> int:
    value=_finite_env(name,default,positive=True)
    if not value.is_integer(): raise PermanentJobError("trellis2_config_invalid",f"{name} must be an integer")
    return int(value)

@lru_cache(maxsize=1)
def get_hair_dependencies():
    storage=SupabaseAssetStorage.from_env(); repo=SupabaseHairAssetVersionRepository.from_env()
    return SupabasePostgresJobQueue.from_env(), Trellis2HairProvider.from_env(), storage, repo, HairAssetNormalizer(storage=storage, repository=repo)

def handle_hair_generation(job: AIJobRecord) -> dict[str, Any]:
    p=job.input_payload; raw_style=p.get("style_id"); style=raw_style.strip() if isinstance(raw_style,str) else ""; version=p.get("version")
    if not style or isinstance(version,bool) or not isinstance(version,int) or version<1 or not str(p.get("image_url","")).startswith("https://"):
        raise PermanentJobError("invalid_hair_input", "style_id, positive version and HTTPS image_url are required")
    if not job.locked_by: raise TransientJobError("lease_missing", "Hair generation requires an active lease")
    try: queue,provider,storage,repo,normalizer=get_hair_dependencies()
    except FalProviderError as exc: raise PermanentJobError(exc.code,str(exc)) from exc
    try: cp=queue.get_trellis2_checkpoint_for_job(job.id)
    except JobQueueError as exc: raise TransientJobError("checkpoint_unavailable",str(exc)) from exc
    try:
        if not cp:
            queue.checkpoint_trellis2(job_id=job.id,worker_id=job.locked_by,patch={"submission_intended_at":datetime.now(UTC).isoformat()})
            submitted=provider.submit(p,request_id=str(job.id))
            cp=queue.checkpoint_trellis2(job_id=job.id,worker_id=job.locked_by,patch={"provider_request_id":submitted.provider_job_id,"provider_submitted_at":submitted.created_at.isoformat()})
        provider_id=cp.get("provider_request_id")
        if not provider_id:
            grace=_positive_int_env("FAL_TRELLIS2_RESUBMIT_GRACE_SECONDS","300")
            intended=cp.get("submission_intended_at")
            if not isinstance(intended,str): raise PermanentJobError("checkpoint_timestamp_invalid","Submission intent timestamp is missing")
            try: intent_time=datetime.fromisoformat(intended.replace("Z","+00:00"))
            except ValueError as exc: raise PermanentJobError("checkpoint_timestamp_invalid","Submission intent timestamp is malformed") from exc
            if intent_time.tzinfo is None: raise PermanentJobError("checkpoint_timestamp_invalid","Submission intent timestamp must be aware")
            age=time.time()-intent_time.timestamp()
            if age < grace: raise TransientJobError("fal_submission_uncertain","Awaiting webhook reconciliation",min(60,grace-int(age)))
            submitted=provider.submit(p,request_id=str(job.id))
            cp=queue.checkpoint_trellis2(job_id=job.id,worker_id=job.locked_by,patch={"provider_request_id":submitted.provider_job_id,"provider_submitted_at":submitted.created_at.isoformat(),"duplicate_risk":True})
            provider_id=submitted.provider_job_id
        if cp.get("canonical_asset_id"):
            return {"asset_id":cp["canonical_asset_id"],"provider_request_id":provider_id,"resumed":True}
        raw_ref=raw_hair_asset_ref(style,version,f"trellis2-{job.id}.glb")
        if cp.get("raw_path"):
            if cp.get("raw_bucket") != raw_ref.bucket or cp.get("raw_path") != raw_ref.path: raise PermanentJobError("raw_checkpoint_identity_conflict","Raw checkpoint does not belong to this job")
            raw=storage.read_object(raw_ref,max_bytes=_positive_int_env("FAL_TRELLIS2_MAX_GLB_BYTES","52428800"))
            _validate_glb(raw)
        else:
            webhook_payload=cp.get("webhook_payload")
            if isinstance(webhook_payload,dict) and str(webhook_payload.get("status","")).upper() == "ERROR":
                error=webhook_payload.get("error")
                message=str(error.get("message")) if isinstance(error,dict) and error.get("message") else "FAL webhook reported an error"
                raise PermanentJobError("fal_webhook_error",message)
            webhook_complete=isinstance(webhook_payload,dict) and str(webhook_payload.get("status","")).upper() in {"OK","COMPLETED"}
            if not webhook_complete:
                window=_finite_env("FAL_TRELLIS2_POLL_WINDOW_SECONDS","240")
                interval=_finite_env("FAL_TRELLIS2_POLL_SECONDS","5",positive=True)
                if not provider.wait_for_completion(provider_id,window_seconds=window,poll_seconds=interval):
                    raise TransientJobError("fal_poll_window_elapsed","FAL request remains pending; resume from checkpoint",round(interval))
            max_glb=_positive_int_env("FAL_TRELLIS2_MAX_GLB_BYTES","52428800")
            if storage.exists(raw_ref):
                raw=storage.read_object(raw_ref,max_bytes=max_glb); _validate_glb(raw)
            else:
                result=provider.get_result(provider_id); raw=_download_glb(result.raw_asset_url or "",max_bytes=max_glb)
                storage.put_object(raw_ref,raw,content_type="model/gltf-binary",upsert=False)
            cp=queue.checkpoint_trellis2(job_id=job.id,worker_id=job.locked_by,patch={"raw_bucket":raw_ref.bucket,"raw_path":raw_ref.path})
        started=cp.get("provider_submitted_at")
        if not isinstance(started,str): raise PermanentJobError("checkpoint_timestamp_invalid","Provider timestamp is missing")
        try: submitted_time=datetime.fromisoformat(started.replace("Z","+00:00"))
        except ValueError as exc: raise PermanentJobError("checkpoint_timestamp_invalid","Provider timestamp is malformed") from exc
        if submitted_time.tzinfo is None: raise PermanentJobError("checkpoint_timestamp_invalid","Provider timestamp must be aware")
        duration=max(0,int(time.time()-submitted_time.timestamp()))
        usd=_finite_env(f"FAL_TRELLIS2_PRICE_USD_{str(p.get('resolution','1024')).upper()}",os.getenv("FAL_TRELLIS2_PRICE_USD","0"))
        rate=_finite_env("FAL_USD_TO_FCFA","600",positive=True)
        if usd < 0: raise PermanentJobError("trellis2_config_invalid","FAL price cannot be negative")
        cost=round(usd*rate)
        lora_versions={stage:hashlib.sha256(url.encode()).hexdigest()[:16] for stage,url in provider.loras.items()}
        meta={"endpoint":"fal-ai/trellis-2-lora","request_id":provider_id,"duration_seconds":duration,"price_usd":usd,"usd_to_fcfa":rate,"cost_is_estimate":True,"lora_versions":lora_versions,"duplicate_risk":bool(cp.get("duplicate_risk"))}
        existing_version=repo.get_version(style,version)
        if (existing_version is not None and existing_version.provider == "trellis2"
                and existing_version.source_job_id == job.id and existing_version.raw_ref == raw_ref):
            # A crash after draft/normalization must reuse the originally snapshotted audit values.
            meta=dict(existing_version.provider_metadata)
            cost=existing_version.generation_cost_fcfa if existing_version.generation_cost_fcfa is not None else cost
        draft=repo.create_draft(style_id=style,version=version,provider="trellis2",source_job_id=job.id,raw_ref=raw_ref,generation_cost_fcfa=cost,provider_metadata=meta)
        queue.checkpoint_trellis2(job_id=job.id,worker_id=job.locked_by,patch={"draft_asset_id":str(draft.id)})
        if draft.status in {"validated", "published"}:
            if not all((draft.canonical_ref,draft.preview_ref,draft.anchor_map_ref,draft.scalp_anchor_version,draft.polygon_count is not None)):
                raise PermanentJobError("canonical_asset_incomplete","Validated hair asset is missing canonical references")
            queue.checkpoint_trellis2(job_id=job.id,worker_id=job.locked_by,patch={"canonical_asset_id":str(draft.id)})
            return {"asset_id":str(draft.id),"provider_request_id":provider_id,"resumed_after_normalization":True}
        normalized=normalizer.normalize(HairAssetNormalizationRequest(style,version,"trellis2",raw_ref,raw,source_coordinate_system="Y_UP_RIGHT_HANDED",source_unit="meter",provider_metadata=meta))
        queue.checkpoint_trellis2(job_id=job.id,worker_id=job.locked_by,patch={"canonical_asset_id":str(normalized.record.id)})
        return {"asset_id":str(normalized.record.id),"raw_ref":{"bucket":raw_ref.bucket,"path":raw_ref.path},"provider_request_id":provider_id,"generation_cost_fcfa":cost,"duration_seconds":duration,"duplicate_risk":bool(cp.get("duplicate_risk"))}
    except FalProviderError as exc:
        error=(TransientJobError if exc.retryable else PermanentJobError)(exc.code,str(exc)); raise error from exc
    except (ValueError, TypeError, HairProviderDisabledError) as exc:
        raise PermanentJobError("trellis2_request_invalid", str(exc)) from exc
    except HairAssetNormalizationError as exc: raise PermanentJobError(exc.code,str(exc)) from exc


DEFAULT_JOB_HANDLERS = {
    AIJobType.HEAD_RECONSTRUCTION: handle_head_reconstruction,
    AIJobType.HAIR_GENERATION: handle_hair_generation,
}
