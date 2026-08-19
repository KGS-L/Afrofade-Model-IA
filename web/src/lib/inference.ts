import { fetchWithRetry } from './resilience';

export interface ReconstructionResult {
  status: 'success';
  requestId: string;
  meshGlbUrl: string;
  processingTimeMs: number;
  verticesCount: number;
  identityPreserved: boolean;
  message: string;
  usage?: {
    status?: string;
    head_id?: string;
    balance?: number;
    quota_used?: number;
    quota_limit?: number;
  };
}

function createRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replaceAll('-', '_');
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
}

export async function trigger3DReconstruction(
  photos: string[],
  clientName?: string
): Promise<ReconstructionResult> {
  const requestId = createRequestId();
  const response = await fetchWithRetry('/api/v1/reconstruct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photos, clientName, requestId }),
    maxRetries: 2,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : 'Erreur lors de la reconstruction 3D';
    const error = new Error(message) as Error & { code?: string; status?: number };
    error.code = typeof data?.code === 'string' ? data.code : undefined;
    error.status = response.status;
    throw error;
  }

  if (data?.status !== 'success' || typeof data?.meshGlbUrl !== 'string' || !data.meshGlbUrl) {
    throw new Error('Le moteur 3D a retourné une réponse invalide.');
  }

  return data as ReconstructionResult;
}
