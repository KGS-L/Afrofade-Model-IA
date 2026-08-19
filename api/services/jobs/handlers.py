from __future__ import annotations

from typing import Any

from models.jobs import AIJobRecord, AIJobType
from services.jobs.worker import PermanentJobError
from services.reconstructor import ReconstructionPipelineService


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


def handle_head_reconstruction(job: AIJobRecord) -> dict[str, Any]:
    """Transitional adapter; Story 7.5 will replace this with HeadGenerationManager + AssetStorage."""

    payload = job.input_payload
    photos_urls = payload.get("photos_urls")
    if not isinstance(photos_urls, list) or not photos_urls or not all(isinstance(url, str) and url for url in photos_urls):
        raise PermanentJobError(
            "invalid_head_input",
            "head_reconstruction requires a non-empty photos_urls string array.",
        )

    client_name = payload.get("client_name")
    if not isinstance(client_name, str) or not client_name.strip():
        client_name = "Client Afrofade"

    preserve_skin_texture = payload.get("preserve_skin_texture", True)
    if not isinstance(preserve_skin_texture, bool):
        raise PermanentJobError(
            "invalid_preserve_skin_texture",
            "preserve_skin_texture must be a boolean.",
        )

    result = ReconstructionPipelineService.process_3d_head_reconstruction(
        photos_urls=photos_urls,
        client_name=client_name.strip(),
        preserve_skin_texture=preserve_skin_texture,
    )

    if not isinstance(result, dict):
        raise PermanentJobError(
            "invalid_reconstruction_output",
            "ReconstructionPipelineService must return a dict result.",
        )

    return _json_safe({
        **result,
        "job_id": str(job.id),
        "transitional_storage": True,
    })


DEFAULT_JOB_HANDLERS = {
    AIJobType.HEAD_RECONSTRUCTION: handle_head_reconstruction,
}
