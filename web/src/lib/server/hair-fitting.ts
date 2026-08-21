import { CanonicalHead, CanonicalHairAsset, TryOnAsset } from '../types/canonical-3d';

export async function performHairFitting(
  head: CanonicalHead,
  hair: CanonicalHairAsset
): Promise<TryOnAsset> {
  const tryOnId = `tryon_${head.headAssetId}_${hair.hairAssetId}`;

  // Default identity 4x4 transform matrix
  const identityMatrix = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];

  return {
    tryOnId,
    headAssetId: head.headAssetId,
    hairAssetId: hair.hairAssetId,
    transformMatrix: identityMatrix,
    createdAt: new Date().toISOString(),
  };
}
