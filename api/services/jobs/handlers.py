from __future__ import annotations

from functools import lru_cache
from typing import Any

from models.jobs import AIJobRecord, AIJobType
from services.fitting.head_provider import HeadGenerationManager
from services.jobs.worker import PermanentJobError


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


DEFAULT_JOB_HANDLERS = {
    AIJobType.HEAD_RECONSTRUCTION: handle_head_reconstruction,
}
