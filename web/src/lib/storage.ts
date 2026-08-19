import { fetchWithRetry } from './resilience';
import { supabase } from './supabase';
import type { SignedUploadDescriptor, StoredAssetRef } from './storage-types';
import { isStoredAssetRef } from './storage-types';

export interface UploadResponse {
  storageRef: StoredAssetRef;
}

function normalizeImageMimeType(value: string | undefined): string {
  const mimeType = (value || 'image/jpeg').trim().toLowerCase();
  return mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;
}

export async function uploadClientPhoto(file: File): Promise<UploadResponse> {
  const contentType = normalizeImageMimeType(file.type);
  const res = await fetchWithRetry('/api/upload/presigned-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      mimeType: contentType,
      fileSize: file.size,
    }),
    maxRetries: 3,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Impossible d’obtenir l’URL d’upload');
  }

  const descriptor = (await res.json()) as Partial<SignedUploadDescriptor> & { contentType?: string };
  if (
    !isStoredAssetRef(descriptor.storageRef) ||
    typeof descriptor.token !== 'string' ||
    !descriptor.token
  ) {
    throw new Error('Le serveur a retourné une référence de stockage invalide.');
  }

  const uploadContentType = normalizeImageMimeType(descriptor.contentType || contentType);
  const { error } = await supabase.storage
    .from(descriptor.storageRef.bucket)
    .uploadToSignedUrl(descriptor.storageRef.path, descriptor.token, file, {
      contentType: uploadContentType,
    });

  if (error) {
    throw new Error(error.message || 'Échec du transfert vers le stockage cloud');
  }

  return { storageRef: descriptor.storageRef };
}

export async function createSignedReadUrl(
  storageRef: StoredAssetRef,
  expiresIn = 300
): Promise<string> {
  const response = await fetch('/api/storage/signed-read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storageRef, expiresIn }),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.signedUrl !== 'string') {
    throw new Error(data.error || 'Impossible de créer l’URL de lecture sécurisée.');
  }

  return data.signedUrl;
}
