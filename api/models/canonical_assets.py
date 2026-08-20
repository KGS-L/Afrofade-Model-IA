from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field


CoordinateSystem = Literal["Y_UP_RIGHT_HANDED"]
AssetUnit = Literal["meter"]
Vector3 = tuple[float, float, float]


class CanonicalModel(BaseModel):
    """Base configuration for JSON contracts shared with the Next.js application."""

    model_config = ConfigDict(extra="forbid")


class CanonicalHead(CanonicalModel):
    id: str = Field(min_length=1)
    ownerType: Literal["customer", "salon_client"]
    ownerId: str = Field(min_length=1)
    sourceJobId: str = Field(min_length=1)
    provider: str = Field(min_length=1)
    meshUrl: AnyHttpUrl
    previewUrl: AnyHttpUrl | None = None
    coordinateSystem: CoordinateSystem = "Y_UP_RIGHT_HANDED"
    unit: AssetUnit = "meter"
    scalpAnchorVersion: str = Field(min_length=1)
    scalpAnchorsUrl: AnyHttpUrl | None = None
    vertexCount: int | None = Field(default=None, ge=0)
    polygonCount: int | None = Field(default=None, ge=0)
    textureUrls: list[AnyHttpUrl] = Field(default_factory=list)
    createdAt: datetime


class CanonicalHairAsset(CanonicalModel):
    id: str = Field(min_length=1)
    styleId: str = Field(min_length=1)
    version: int = Field(ge=1)
    provider: Literal["trellis2", "hunyuan_multiview", "meshy", "manual"]
    sourceJobId: str | None = Field(default=None, min_length=1)
    meshUrl: AnyHttpUrl
    previewUrl: AnyHttpUrl
    coordinateSystem: CoordinateSystem = "Y_UP_RIGHT_HANDED"
    unit: AssetUnit = "meter"
    scalpAnchorVersion: str = Field(min_length=1)
    anchorMapUrl: AnyHttpUrl
    polygonCount: int = Field(ge=0)
    lods: list[AnyHttpUrl] = Field(default_factory=list)
    generationCostFcfa: int | None = Field(default=None, ge=0)
    status: Literal["draft", "validated", "published", "retired"]
    createdAt: datetime


class TryOnTransform(CanonicalModel):
    position: Vector3
    rotation: Vector3
    scale: Vector3


class TryOnAsset(CanonicalModel):
    id: str = Field(min_length=1)
    headId: str = Field(min_length=1)
    hairAssetId: str = Field(min_length=1)
    fitJobId: str | None = Field(default=None, min_length=1)
    transform: TryOnTransform
    fittedMeshUrl: AnyHttpUrl | None = None
    createdAt: datetime
