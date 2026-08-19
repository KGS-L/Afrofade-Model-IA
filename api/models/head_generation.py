from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ReconstructedHeadPayload:
    """In-memory provider result before durable object/database persistence."""

    glb_bytes: bytes
    provider: str
    processing_time_ms: int
    vertices_count: int
    polygon_count: int
    converged: bool
    fit_metadata: dict[str, Any]
