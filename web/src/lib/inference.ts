export interface ReconstructionResult {
  meshGlbUrl: string;
  processingTimeMs: number;
  meshSizeBytes: number;
  isFallback: boolean;
  shapeCoefficients: number[];
}

export async function trigger3DReconstruction(
  photos: string[]
): Promise<ReconstructionResult> {
  try {
    const response = await fetch('/api/v1/reconstruct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photos }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erreur lors de la reconstruction 3D');
    }

    const data: ReconstructionResult = await response.json();
    return data;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur d’inférence 3D';
    console.warn('Fallback 3D modèle générique:', message);
    return {
      meshGlbUrl: '/models/afro_taper_fade.png',
      processingTimeMs: 1200,
      meshSizeBytes: 1420580,
      isFallback: true,
      shapeCoefficients: [0, 0, 0, 0, 0],
    };
  }
}
