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

let mockCheckpoints: CheckpointResult[] = [
  {
    id: 'ckpt_v1_final',
    name: 'afrohair_lora_low-taper-fade_v1.pth',
    taxonomy: 'Low Taper Fade & Line-Up',
    slug: 'low-taper-fade',
    sizeMb: 148,
    epoch: 50,
    totalEpochs: 50,
    finalLoss: 0.0143,
    valLoss: 0.0158,
    learningRate: 0.0001,
    batchSize: 8,
    createdAt: '2026-08-24T12:56:00.000Z',
    verticesCount: 8400,
    facesCount: 14200,
    previewImage: '/models/hairstyles/fade_taper_low/model-1-face.png',
    mesh3dUrl: '/models/generated/fallback.gltf',
  },
  {
    id: 'ckpt_v1_braids',
    name: 'afrohair_lora_knotless-braids_v1.pth',
    taxonomy: 'Knotless Braids',
    slug: 'knotless-braids',
    sizeMb: 152,
    epoch: 50,
    totalEpochs: 50,
    finalLoss: 0.0182,
    valLoss: 0.0201,
    learningRate: 0.0001,
    batchSize: 8,
    createdAt: '2026-08-24T11:30:00.000Z',
    verticesCount: 12500,
    facesCount: 22100,
    previewImage: '/models/hairstyles/tresses_knotless_boho/model-1-face.png',
    mesh3dUrl: '/models/generated/fallback.gltf',
  },
  {
    id: 'ckpt_v1_locks',
    name: 'afrohair_lora_short-locks_v1.pth',
    taxonomy: 'Short Locks',
    slug: 'short-locks',
    sizeMb: 144,
    epoch: 40,
    totalEpochs: 50,
    finalLoss: 0.0245,
    valLoss: 0.0270,
    learningRate: 0.0001,
    batchSize: 8,
    createdAt: '2026-08-24T10:15:00.000Z',
    verticesCount: 9600,
    facesCount: 16800,
    previewImage: '/models/hairstyles/locks_starter_short/model-1-face.png',
    mesh3dUrl: '/models/generated/fallback.gltf',
  },
  {
    id: 'ckpt_v1_cornrows',
    name: 'afrohair_lora_cornrows_v1.pth',
    taxonomy: 'Cornrows & Nattes Plaquées',
    slug: 'cornrows',
    sizeMb: 150,
    epoch: 50,
    totalEpochs: 50,
    finalLoss: 0.0167,
    valLoss: 0.0189,
    learningRate: 0.0001,
    batchSize: 8,
    createdAt: '2026-08-24T09:00:00.000Z',
    verticesCount: 11200,
    facesCount: 19500,
    previewImage: '/models/hairstyles/tresses_cornrows_classic/model-1-face.png',
    mesh3dUrl: '/models/generated/fallback.gltf',
  },
];

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
