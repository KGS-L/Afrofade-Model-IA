import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';

export interface CheckpointResult {
  id: string;
  name: string;
  taxonomy: string;
  slug: string;
  sizeMb: number;
  epoch: number;
  totalEpochs: number;
  finalLoss: number;
  valLoss: number;
  learningRate: number;
  batchSize: number;
  createdAt: string;
  verticesCount: number;
  facesCount: number;
  previewImage: string;
  mesh3dUrl: string;
}

let mockCheckpoints: CheckpointResult[] = [];

export function getCheckpointsStore(): CheckpointResult[] {
  return mockCheckpoints;
}

export function setCheckpointsStore(checkpoints: CheckpointResult[]) {
  mockCheckpoints = checkpoints;
}

export async function GET(req: NextRequest) {
  const principal = await getVerifiedPrincipal(req);
  if (!principal || principal.role !== 'admin') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id) {
    const item = mockCheckpoints.find((c) => c.id === id);
    if (!item) {
      return NextResponse.json({ error: 'Résultat non trouvé.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, checkpoint: item });
  }

  return NextResponse.json({
    success: true,
    checkpoints: mockCheckpoints,
    count: mockCheckpoints.length,
  });
}

export async function DELETE(req: NextRequest) {
  const principal = await getVerifiedPrincipal(req);
  if (!principal || principal.role !== 'admin') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const clearAll = searchParams.get('all') === 'true';

  if (clearAll) {
    mockCheckpoints = [];
    return NextResponse.json({
      success: true,
      message: 'Tous les résultats et checkpoints ont été nettoyés avec succès.',
      count: 0,
    });
  }

  if (id) {
    const initialCount = mockCheckpoints.length;
    mockCheckpoints = mockCheckpoints.filter((c) => c.id !== id);
    if (mockCheckpoints.length === initialCount) {
      return NextResponse.json({ error: 'Résultat non trouvé.' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      message: `Résultat ${id} supprimé avec succès.`,
      count: mockCheckpoints.length,
    });
  }

  return NextResponse.json({ error: 'Identifiant ou paramètre de nettoyage manquant.' }, { status: 400 });
}
