/**
 * Afrofade — Canonical 3D Data Contracts (BMAD Story 7.1)
 * Guaranteed coordinate system: Y_UP_RIGHT_HANDED
 * Guaranteed unit: meter
 */

export interface BoundingBox3D {
  min: [number, number, number];
  max: [number, number, number];
}

export interface CanonicalHead {
  headAssetId: string;
  userId?: string;
  salonId?: string;
  meshUrl: string;
  format: 'gltf' | 'glb';
  coordinateSystem: 'Y_UP_RIGHT_HANDED';
  unit: 'meter';
  scalpAnchorVersion: string;
  bounds?: BoundingBox3D;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface CanonicalHairAsset {
  hairAssetId: string;
  styleId: string;
  version: number;
  meshUrl: string;
  format: 'gltf' | 'glb';
  coordinateSystem: 'Y_UP_RIGHT_HANDED';
  unit: 'meter';
  scalpAnchorVersion: string;
  polycount: number;
  lods?: { lodLevel: number; meshUrl: string; polycount: number }[];
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface TryOnAsset {
  tryOnId: string;
  headAssetId: string;
  hairAssetId: string;
  fittedMeshUrl?: string;
  transformMatrix: number[]; // 4x4 matrix flattened (16 elements)
  createdAt: string;
}
