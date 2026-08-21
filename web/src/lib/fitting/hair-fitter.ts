/**
 * Web 3D HairFitter utilities for Afrofade (BMAD Story 9.1).
 * Performs client-side scalp anchor alignment & matrix transformations for Three.js / R3F.
 */

export interface ScalpAnchorMap {
  crown?: { x: number; y: number; z: number };
  forehead?: { x: number; y: number; z: number };
  occipital?: { x: number; y: number; z: number };
  left_temple?: { x: number; y: number; z: number };
  right_temple?: { x: number; y: number; z: number };
  [key: string]: { x: number; y: number; z: number } | undefined;
}

export interface FittedHairTransform {
  translation: [number, number, number];
  rotationEulerDeg: [number, number, number];
  scale: [number, number, number];
  matrix4x4: number[];
}

export interface FittedHairResult {
  headId: string;
  styleId: string;
  version: number;
  transform: FittedHairTransform;
  cacheKey: string;
  usedFallbackAlignment: boolean;
  anchorAlignmentErrorMm: number;
}

const FITTER_CACHE = new Map<string, FittedHairResult>();

export function computeFittingCacheKey(
  headId: string,
  styleId: string,
  version: number
): string {
  return `${headId}:${styleId}:v${version}`;
}

export function fitHairToHead(params: {
  headId: string;
  styleId: string;
  version: number;
  headAnchors?: ScalpAnchorMap;
  hairAnchors?: ScalpAnchorMap;
  headScale?: number;
  hairScale?: number;
  isPublished?: boolean;
}): FittedHairResult {
  const {
    headId,
    styleId,
    version,
    headAnchors,
    hairAnchors,
    headScale = 1.0,
    hairScale = 1.0,
    isPublished = true,
  } = params;

  if (!isPublished) {
    throw new Error(`Unpublished hair asset cannot be fitted: ${styleId} v${version}`);
  }

  const cacheKey = computeFittingCacheKey(headId, styleId, version);
  if (FITTER_CACHE.has(cacheKey)) {
    return FITTER_CACHE.get(cacheKey)!;
  }

  const usedFallback = !Boolean(headAnchors?.crown && hairAnchors?.crown);
  const relativeScale = hairScale > 0 ? headScale / hairScale : 1.0;

  let dx = 0;
  let dy = 0;
  let dz = 0;
  let errorMm = 0;

  if (!usedFallback && headAnchors?.crown && hairAnchors?.crown) {
    dx = headAnchors.crown.x - hairAnchors.crown.x * relativeScale;
    dy = headAnchors.crown.y - hairAnchors.crown.y * relativeScale;
    dz = headAnchors.crown.z - hairAnchors.crown.z * relativeScale;
    errorMm = Math.sqrt(dx * dx + dy * dy + dz * dz) * 1000.0;
  }

  const result: FittedHairResult = {
    headId,
    styleId,
    version,
    transform: {
      translation: [dx, dy, dz],
      rotationEulerDeg: [0, 0, 0],
      scale: [relativeScale, relativeScale, relativeScale],
      matrix4x4: [
        relativeScale, 0, 0, dx,
        0, relativeScale, 0, dy,
        0, 0, relativeScale, dz,
        0, 0, 0, 1,
      ],
    },
    cacheKey,
    usedFallbackAlignment: usedFallback,
    anchorAlignmentErrorMm: Math.round(errorMm * 1000) / 1000,
  };

  FITTER_CACHE.set(cacheKey, result);
  return result;
}

export function clearHairFitterCache(): void {
  FITTER_CACHE.clear();
}
