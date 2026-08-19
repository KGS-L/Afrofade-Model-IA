from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class AIJobType(str, Enum):
    HEAD_RECONSTRUCTION = "head_reconstruction"
    HAIR_GENERATION = "hair_generation"
    HAIR_NORMALIZATION = "hair_normalization"
    HAIR_FIT = "hair_fit"


class AIJobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class AIJobRecord(BaseModel):
    """Canonical database-facing record for the persistent AI job queue."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    job_type: AIJobType
    user_id: UUID | None = None
    salon_id: UUID | None = None
    status: AIJobStatus
    provider: str = Field(min_length=1)
    input_payload: dict[str, Any] = Field(default_factory=dict)
    output_payload: dict[str, Any] | None = None
    progress_percent: int = Field(default=0, ge=0, le=100)
    attempts: int = Field(default=0, ge=0)
    max_attempts: int = Field(default=3, ge=1)
    priority: int = 0
    idempotency_key: str = Field(min_length=1)
    available_at: datetime
    locked_at: datetime | None = None
    locked_by: str | None = None
    lease_expires_at: datetime | None = None
    error_code: str | None = None
    error_message: str | None = None
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    updated_at: datetime

    @model_validator(mode="after")
    def validate_owner(self) -> "AIJobRecord":
        if self.user_id is None and self.salon_id is None:
            raise ValueError("AI job must have a user_id and/or salon_id owner")
        return self
