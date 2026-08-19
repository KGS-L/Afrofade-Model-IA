export const CANONICAL_COORDINATE_SYSTEM = 'Y_UP_RIGHT_HANDED' as const;
export const CANONICAL_UNIT = 'meter' as const;

export type CanonicalCoordinateSystem = typeof CANONICAL_COORDINATE_SYSTEM;
export type CanonicalUnit = typeof CANONICAL_UNIT;
export type Vector3 = [number, number, number];

export interface CanonicalHead {
  id: string;
  ownerType: 'customer' | 'salon_client';
  ownerId: string;
  sourceJobId: string;
  provider: string;
  meshUrl: string;
  previewUrl?: string | null;
  coordinateSystem: CanonicalCoordinateSystem;
  unit: CanonicalUnit;
  scalpAnchorVersion: string;
  scalpAnchorsUrl?: string | null;
  vertexCount?: number | null;
  polygonCount?: number | null;
  textureUrls: string[];
  createdAt: string;
}

export interface CanonicalHairAsset {
  id: string;
  styleId: string;
  version: number;
  provider: 'trellis2' | 'hunyuan_multiview' | 'manual';
  sourceJobId?: string | null;
  meshUrl: string;
  previewUrl: string;
  coordinateSystem: CanonicalCoordinateSystem;
  unit: CanonicalUnit;
  scalpAnchorVersion: string;
  anchorMapUrl: string;
  polygonCount: number;
  lods: string[];
  generationCostFcfa?: number | null;
  status: 'draft' | 'validated' | 'published' | 'retired';
  createdAt: string;
}

export interface TryOnTransform {
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
}

export interface TryOnAsset {
  id: string;
  headId: string;
  hairAssetId: string;
  fitJobId?: string | null;
  transform: TryOnTransform;
  fittedMeshUrl?: string | null;
  createdAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isHttpUrl(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function isOptionalHttpUrl(value: unknown): boolean {
  return value === undefined || value === null || isHttpUrl(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isOptionalNonNegativeInteger(value: unknown): boolean {
  return value === undefined || value === null || isNonNegativeInteger(value);
}

function isVector3(value: unknown): value is Vector3 {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((item) => typeof item === 'number' && Number.isFinite(item))
  );
}

function isIsoDate(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function hasCanonicalFrame(value: Record<string, unknown>): boolean {
  return (
    value.coordinateSystem === CANONICAL_COORDINATE_SYSTEM &&
    value.unit === CANONICAL_UNIT &&
    isNonEmptyString(value.scalpAnchorVersion)
  );
}

export function isCanonicalHead(value: unknown): value is CanonicalHead {
  if (!isRecord(value) || !hasCanonicalFrame(value)) return false;

  return (
    isNonEmptyString(value.id) &&
    (value.ownerType === 'customer' || value.ownerType === 'salon_client') &&
    isNonEmptyString(value.ownerId) &&
    isNonEmptyString(value.sourceJobId) &&
    isNonEmptyString(value.provider) &&
    isHttpUrl(value.meshUrl) &&
    isOptionalHttpUrl(value.previewUrl) &&
    isOptionalHttpUrl(value.scalpAnchorsUrl) &&
    isOptionalNonNegativeInteger(value.vertexCount) &&
    isOptionalNonNegativeInteger(value.polygonCount) &&
    Array.isArray(value.textureUrls) &&
    value.textureUrls.every(isHttpUrl) &&
    isIsoDate(value.createdAt)
  );
}

export function isCanonicalHairAsset(value: unknown): value is CanonicalHairAsset {
  if (!isRecord(value) || !hasCanonicalFrame(value)) return false;

  const validProvider =
    value.provider === 'trellis2' || value.provider === 'hunyuan_multiview' || value.provider === 'manual';
  const validStatus =
    value.status === 'draft' ||
    value.status === 'validated' ||
    value.status === 'published' ||
    value.status === 'retired';

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.styleId) &&
    isNonNegativeInteger(value.version) &&
    Number(value.version) >= 1 &&
    validProvider &&
    (value.sourceJobId === undefined || value.sourceJobId === null || isNonEmptyString(value.sourceJobId)) &&
    isHttpUrl(value.meshUrl) &&
    isHttpUrl(value.previewUrl) &&
    isHttpUrl(value.anchorMapUrl) &&
    isNonNegativeInteger(value.polygonCount) &&
    Array.isArray(value.lods) &&
    value.lods.every(isHttpUrl) &&
    isOptionalNonNegativeInteger(value.generationCostFcfa) &&
    validStatus &&
    isIsoDate(value.createdAt)
  );
}

export function isTryOnAsset(value: unknown): value is TryOnAsset {
  if (!isRecord(value) || !isRecord(value.transform)) return false;

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.headId) &&
    isNonEmptyString(value.hairAssetId) &&
    (value.fitJobId === undefined || value.fitJobId === null || isNonEmptyString(value.fitJobId)) &&
    isVector3(value.transform.position) &&
    isVector3(value.transform.rotation) &&
    isVector3(value.transform.scale) &&
    isOptionalHttpUrl(value.fittedMeshUrl) &&
    isIsoDate(value.createdAt)
  );
}
