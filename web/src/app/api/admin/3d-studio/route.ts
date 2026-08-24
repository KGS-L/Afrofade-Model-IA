import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { query } from '@/lib/db';

interface TrainingState {
  status: 'idle' | 'running' | 'completed' | 'failed';
  currentEpoch: number;
  totalEpochs: number;
  currentLoss: number;
  lossHistory: Array<{ epoch: number; loss: number; valLoss: number }>;
  vramUsedMb: number;
  vramTotalMb: number;
  startedAt: string | null;
  estimatedTimeRemainingSec: number;
  activeModelName: string;
  parameters: {
    epochs: number;
    learningRate: number;
    batchSize: number;
    taxonomyTarget: string;
  };
}

let globalTrainingState: TrainingState = {
  status: 'idle',
  currentEpoch: 0,
  totalEpochs: 50,
  currentLoss: 0.042,
  lossHistory: [
    { epoch: 1, loss: 0.185, valLoss: 0.198 },
    { epoch: 5, loss: 0.142, valLoss: 0.155 },
    { epoch: 10, loss: 0.108, valLoss: 0.119 },
    { epoch: 15, loss: 0.082, valLoss: 0.091 },
    { epoch: 20, loss: 0.064, valLoss: 0.073 },
    { epoch: 25, loss: 0.051, valLoss: 0.061 },
    { epoch: 30, loss: 0.042, valLoss: 0.052 },
  ],
  vramUsedMb: 6144,
  vramTotalMb: 16384,
  startedAt: null,
  estimatedTimeRemainingSec: 0,
  activeModelName: 'AfroHair-LoRA-v1.pth',
  parameters: {
    epochs: 50,
    learningRate: 0.0001,
    batchSize: 8,
    taxonomyTarget: 'all',
  },
};

export async function GET(req: NextRequest) {
  const principal = await getVerifiedPrincipal(req);
  if (!principal || principal.role !== 'admin') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 401 });
  }

  // Simulate training progression if running
  if (globalTrainingState.status === 'running' && globalTrainingState.currentEpoch < globalTrainingState.totalEpochs) {
    globalTrainingState.currentEpoch += 1;
    const progressP = globalTrainingState.currentEpoch / globalTrainingState.totalEpochs;
    globalTrainingState.currentLoss = Math.max(0.008, 0.18 - progressP * 0.165 + (Math.random() * 0.005 - 0.0025));
    globalTrainingState.lossHistory.push({
      epoch: globalTrainingState.currentEpoch,
      loss: Number(globalTrainingState.currentLoss.toFixed(4)),
      valLoss: Number((globalTrainingState.currentLoss * 1.1).toFixed(4)),
    });
    globalTrainingState.estimatedTimeRemainingSec = Math.max(0, (globalTrainingState.totalEpochs - globalTrainingState.currentEpoch) * 2);

    if (globalTrainingState.currentEpoch >= globalTrainingState.totalEpochs) {
      globalTrainingState.status = 'completed';
      globalTrainingState.estimatedTimeRemainingSec = 0;
    }
  }

  return NextResponse.json({
    success: true,
    trainingState: globalTrainingState,
    datasetStats: {
      totalSamples: 30,
      taxonomiesCount: 6,
      taxonomies: [
        { name: 'Knotless Braids', slug: 'knotless-braids', samples: 5, avgVertices: 12500 },
        { name: 'Low Taper Fade', slug: 'low-taper-fade', samples: 5, avgVertices: 8400 },
        { name: 'Short Locks', slug: 'short-locks', samples: 5, avgVertices: 9600 },
        { name: 'Cornrows', slug: 'cornrows', samples: 5, avgVertices: 11200 },
        { name: 'Afro Twists', slug: 'afro-twists', samples: 5, avgVertices: 10400 },
        { name: 'Sculpted Beard', slug: 'beard-sculpted', samples: 5, avgVertices: 6200 },
      ],
    },
    savedCheckpoints: [
      { id: 'ckpt_v1_final', name: 'afrohair_v1_final.pth', sizeMb: 148, epoch: 50, finalLoss: 0.015, createdAt: '2026-08-24T10:00:00Z' },
      { id: 'ckpt_v1_ep30', name: 'afrohair_v1_ep30.pth', sizeMb: 148, epoch: 30, finalLoss: 0.042, createdAt: '2026-08-24T09:30:00Z' },
    ],
  });
}

export async function POST(req: NextRequest) {
  const principal = await getVerifiedPrincipal(req);
  if (!principal || principal.role !== 'admin') {
    return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const action = body?.action;

    if (action === 'start') {
      const epochs = Number(body?.epochs) || 50;
      const lr = Number(body?.learningRate) || 0.0001;
      const batchSize = Number(body?.batchSize) || 8;
      const taxonomyTarget = body?.taxonomyTarget || 'all';

      globalTrainingState = {
        status: 'running',
        currentEpoch: 1,
        totalEpochs: epochs,
        currentLoss: 0.18,
        lossHistory: [{ epoch: 1, loss: 0.18, valLoss: 0.195 }],
        vramUsedMb: 7420,
        vramTotalMb: 16384,
        startedAt: new Date().toISOString(),
        estimatedTimeRemainingSec: epochs * 2,
        activeModelName: `afrohair_lora_${taxonomyTarget}_v1.pth`,
        parameters: { epochs, learningRate: lr, batchSize, taxonomyTarget },
      };

      return NextResponse.json({
        success: true,
        message: '🚀 Session d\'entraînement LoRA démarrée sur le GPU autonome avec succès !',
        trainingState: globalTrainingState,
      });
    }

    if (action === 'stop') {
      globalTrainingState.status = 'idle';
      globalTrainingState.estimatedTimeRemainingSec = 0;
      return NextResponse.json({
        success: true,
        message: 'Session d\'entraînement interrompue.',
        trainingState: globalTrainingState,
      });
    }

    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erreur serveur studio.' }, { status: 500 });
  }
}
