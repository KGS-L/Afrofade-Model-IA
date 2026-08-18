export interface UploadResponse {
  publicUrl: string;
  path: string;
  error?: string;
}

export async function uploadClientPhoto(
  file: File,
  salonId = 'demo-salon'
): Promise<UploadResponse> {
  try {
    // 1. Get presigned upload URL from Next.js API
    const res = await fetch('/api/upload/presigned-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type || 'image/jpeg',
        fileSize: file.size,
        salonId,
      }),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Impossible d’obtenir l’URL d’upload');
    }

    const { signedUrl, publicUrl, path } = await res.json();

    // 2. Upload file directly if signedUrl is provided
    if (signedUrl) {
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'image/jpeg' },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Échec du transfert vers le stockage cloud');
      }
    }

    return { publicUrl, path };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur d’upload';
    console.warn('Fallback local pour la photo:', message);
    return {
      publicUrl: URL.createObjectURL(file),
      path: `local/${file.name}`,
    };
  }
}
