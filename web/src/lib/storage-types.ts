export const PRIVATE_ASSET_BUCKETS = ['client-photos', 'heads', 'hair-assets', 'tryons'] as const;
export type AssetBucket = (typeof PRIVATE_ASSET_BUCKETS)[number];

export interface StoredAssetRef {
  bucket: AssetBucket;
  path: string;
}

export interface SignedUploadDescriptor {
  storageRef: StoredAssetRef;
  signedUrl: string;
  token: string;
}

export interface SignedReadDescriptor {
  storageRef: StoredAssetRef;
  signedUrl: string;
  expiresIn: number;
}

export function isStoredAssetRef(value: unknown): value is StoredAssetRef {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.bucket === 'string' &&
    PRIVATE_ASSET_BUCKETS.includes(record.bucket as AssetBucket) &&
    typeof record.path === 'string' &&
    record.path.length > 0 &&
    !record.path.startsWith('/') &&
    !record.path.includes('\\') &&
    !record.path.split('/').some((part) => part === '..' || part === '.' || part === '')
  );
}
