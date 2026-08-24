'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Cpu,
  Play,
  Square,
  RefreshCw,
  Box,
  Layers,
  Activity,
  CheckCircle2,
  AlertCircle,
  Database,
  Sliders,
  Sparkles,
  Download,
  Flame,
  Eye,
  Maximize2,
  User,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { Hairstyle3DPreviewModal } from '@/components/Hairstyle3DPreviewModal';
import { HairstyleItem } from '@/components/HairstyleCatalog';

type TaxonomyStat = {
  name: string;
  slug: string;
  samples: number;
  avgVertices: number;
};

type TrainingState = {
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
};

type Checkpoint = {
  id: string;
  name: string;
  sizeMb: number;
  epoch: number;
  finalLoss: number;
  createdAt: string;
};

export default function Admin3DStudioPage() {
  const router = useRouter();
  const { user, hydrated } = useAuth();

  const [activeTab, setActiveTab] = useState<'training' | 'dataset' | 'checkpoints'>('training');
  const [trainingState, setTrainingState] = useState<TrainingState | null>(null);
  const [taxonomies, setTaxonomies] = useState<TaxonomyStat[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<HairstyleItem | null>(null);

  // Form state
  const [studioSpace, setStudioSpace] = useState<'human_head' | 'hairstyle_only'>('human_head');
  const [targetType, setTargetType] = useState<'human_head' | 'hairstyle_only'>('human_head');
  const [epochs, setEpochs] = useState(50);
  const [learningRate, setLearningRate] = useState(0.0001);
  const [batchSize, setBatchSize] = useState(8);
  const [taxonomyTarget, setTaxonomyTarget] = useState('hunyuan-head-african');

  const open3DPreview = (name: string, category: 'fade' | 'locks' | 'tresses' | 'afro' | 'barbe', slug: string) => {
    setPreviewItem({
      id: slug || 'fade_taper_low',
      category: category || 'fade',
      title: name || 'Low Taper Fade & Line-Up',
      subtitle: `Rendu 3D haute fidélité du modèle LoRA pour la catégorie ${name}.`,
      color: '#1a110b',
      isPremium: false,
    });
  };

  const loadStudioData = async () => {
    try {
      const res = await fetch('/api/admin/3d-studio', { cache: 'no-store' });
      if (res.status === 401) {
        router.push('/connexion?redirect=/admin/3d-studio');
        return;
      }
      const data = await res.json();
      if (res.ok && data.success) {
        setTrainingState(data.trainingState);
        setTaxonomies(data.datasetStats?.taxonomies || []);
        setCheckpoints(data.savedCheckpoints || []);
      }
    } catch {
      setMessage('Impossible de charger les données du studio 3D.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    if (!user || user.role !== 'admin') {
      router.push('/connexion?redirect=/admin/3d-studio');
      return;
    }
    void loadStudioData();
  }, [hydrated, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh when training is active
  useEffect(() => {
    if (trainingState?.status === 'running') {
      const timer = setInterval(() => {
        void loadStudioData();
      }, 2000);
      return () => clearInterval(timer);
    }
  }, [trainingState?.status]);

  const startTraining = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/3d-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          epochs,
          learningRate,
          batchSize,
          taxonomyTarget,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(data.message);
      setTrainingState(data.trainingState);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Erreur de démarrage.');
    } finally {
      setBusy(false);
    }
  };

  const stopTraining = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/3d-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(data.message);
      setTrainingState(data.trainingState);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Erreur d\'arrêt.');
    } finally {
      setBusy(false);
    }
  };

  if (!hydrated || !user || user.role !== 'admin' || loading) return <DashboardSkeleton />;

  const isRunning = trainingState?.status === 'running';
  const progressPct = trainingState ? Math.round((trainingState.currentEpoch / trainingState.totalEpochs) * 100) : 0;
  const maxLoss = trainingState?.lossHistory[0]?.loss || 0.2;

  const filteredTaxonomies = taxonomies.filter((tax) => {
    if (studioSpace === 'human_head') {
      return tax.slug.includes('african') || tax.slug.includes('head') || tax.slug.includes('human');
    }
    return !tax.slug.includes('african') && !tax.slug.includes('head') && !tax.slug.includes('human');
  });

  return (
    <div className="min-h-screen bg-cream text-ink font-body p-4 sm:p-8 max-w-[1550px] mx-auto space-y-8">
      {/* Entête Studio */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-card border border-ink/10 rounded-card p-6 shadow-soft">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-card bg-terracotta text-white flex items-center justify-center font-bold">
              <Cpu className="w-5 h-5" />
            </span>
            <span className="text-xs uppercase font-bold tracking-wider text-terracotta bg-terracotta-wash px-3 py-1 rounded-pill">
              Afro3D-Engine Studio
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl mt-2">Studio d'Entraînement IA 3D Sur Mesure</h1>
          <p className="text-sm text-ink-soft mt-1">
            Supervisez le jeu de données, contrôlez l'entraînement LoRA PyTorch et visualisez les courbes de convergence 3D.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/3d-studio/results"
            className="min-h-[44px] rounded-pill bg-terracotta text-white px-5 text-xs font-bold inline-flex items-center gap-2 shadow-soft hover:bg-terracotta-dark transition-all"
          >
            <Maximize2 className="w-4 h-4" />
            Galerie des Résultats
          </Link>
          <button
            onClick={loadStudioData}
            disabled={busy}
            className="min-h-[44px] rounded-pill border border-ink/15 px-4 text-xs font-bold inline-flex items-center gap-2 hover:bg-ink/5"
          >
            <RefreshCw className={`w-4 h-4 text-terracotta ${isRunning ? 'animate-spin' : ''}`} />
            Rafraîchir
          </button>
          <Link
            href="/admin"
            className="min-h-[44px] rounded-pill bg-ink text-white px-5 text-xs font-bold inline-flex items-center gap-2"
          >
            ← Espace Admin
          </Link>
        </div>
      </div>

      {/* Séparation Nette des 2 Studios IA 3D */}
      <div className="grid sm:grid-cols-2 gap-4 bg-card p-3 rounded-card border border-ink/10 shadow-soft">
        <button
          onClick={() => {
            setStudioSpace('human_head');
            setTargetType('human_head');
            setTaxonomyTarget('hunyuan-head-african');
          }}
          className={`p-4 rounded-input text-left flex items-start gap-4 transition-all ${
            studioSpace === 'human_head'
              ? 'bg-terracotta text-white shadow-soft ring-2 ring-terracotta/40'
              : 'bg-cream text-ink hover:bg-ink/5'
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold ${
            studioSpace === 'human_head' ? 'bg-white/20 text-white' : 'bg-terracotta-wash text-terracotta'
          }`}>
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg">Studio 1 : Tête Humaine Photoréaliste</h2>
              {studioSpace === 'human_head' && (
                <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-pill bg-white/20">
                  Focus Actif
                </span>
              )}
            </div>
            <p className="text-xs opacity-80 mt-1">
              Génération & Fine-tuning 3D de têtes et visages humains africains (Hunyuan3D 2.0 / Latents 3D PBR).
            </p>
          </div>
        </button>

        <button
          onClick={() => {
            setStudioSpace('hairstyle_only');
            setTargetType('hairstyle_only');
            setTaxonomyTarget('low-taper-fade');
          }}
          className={`p-4 rounded-input text-left flex items-start gap-4 transition-all ${
            studioSpace === 'hairstyle_only'
              ? 'bg-terracotta text-white shadow-soft ring-2 ring-terracotta/40'
              : 'bg-cream text-ink hover:bg-ink/5'
          }`}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold ${
            studioSpace === 'hairstyle_only' ? 'bg-white/20 text-white' : 'bg-terracotta-wash text-terracotta'
          }`}>
            <Box className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg">Studio 2 : Coiffure 3D Seule</h2>
              {studioSpace === 'hairstyle_only' && (
                <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-pill bg-white/20">
                  Focus Actif
                </span>
              )}
            </div>
            <p className="text-xs opacity-80 mt-1">
              Modélisation 3D pure du maillage des cheveux et coupes Afro sans géométrie de tête humaine.
            </p>
          </div>
        </button>
      </div>

      {message && (
        <div
          className={`rounded-input px-5 py-4 text-sm font-semibold flex items-center gap-3 ${
            message.includes('🚀') || message.includes('interrompue')
              ? 'bg-terracotta-wash text-terracotta border border-terracotta/30'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {message}
        </div>
      )}

      {/* Navigation des Onglets Studio */}
      <div className="flex flex-wrap gap-2 border-b border-ink/10 pb-3">
        <button
          onClick={() => setActiveTab('training')}
          className={`min-h-[44px] px-6 rounded-pill text-sm font-bold inline-flex items-center gap-2 transition-all ${
            activeTab === 'training' ? 'bg-terracotta text-white shadow-soft' : 'bg-card border border-ink/10 text-ink-soft'
          }`}
        >
          <Activity className="w-4 h-4" />
          Entraînement GPU & Loss
        </button>
        <button
          onClick={() => setActiveTab('dataset')}
          className={`min-h-[44px] px-6 rounded-pill text-sm font-bold inline-flex items-center gap-2 transition-all ${
            activeTab === 'dataset' ? 'bg-terracotta text-white shadow-soft' : 'bg-card border border-ink/10 text-ink-soft'
          }`}
        >
          <Database className="w-4 h-4" />
          {studioSpace === 'human_head'
            ? 'Jeu de Données Têtes Africaines 3D'
            : 'Jeu de Données Coiffures 3D'}
        </button>
        <button
          onClick={() => setActiveTab('checkpoints')}
          className={`min-h-[44px] px-6 rounded-pill text-sm font-bold inline-flex items-center gap-2 transition-all ${
            activeTab === 'checkpoints' ? 'bg-terracotta text-white shadow-soft' : 'bg-card border border-ink/10 text-ink-soft'
          }`}
        >
          <Box className="w-4 h-4" />
          {studioSpace === 'human_head'
            ? 'Poids Têtes Photoréalistes (.pth)'
            : 'Adaptateurs LoRA Coiffures (.pth)'}
        </button>
      </div>

      {/* TAB 1: ENTRAÎNEMENT GPU & COURBE DE LOSS */}
      {activeTab === 'training' && (
        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* Visualisation de la Courbe de Perte (Loss Curve) */}
          <div className="space-y-6">
            <div className="rounded-card bg-night text-white p-6 sm:p-8 shadow-soft border border-white/10 space-y-6">
              <div className="flex flex-wrap justify-between items-center gap-4 border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-terracotta">
                    {isRunning ? '🟢 Session GPU Active' : '⚪ Session Inactive / En attente'}
                  </span>
                  <h2 className="font-display text-2xl mt-1">
                    {studioSpace === 'human_head'
                      ? 'Convergence Perte 3D Tête Humaine Photoréaliste (Identity & Skin Loss)'
                      : 'Convergence Perte 3D Coiffure Seule (Mesh Hair Loss)'}
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-white/10 px-3 py-1 rounded-pill text-xs font-bold text-white/80">
                    VRAM: {trainingState?.vramUsedMb || 0} / {trainingState?.vramTotalMb || 16384} Mo
                  </span>
                </div>
              </div>

              {/* Progress Bar & Epoch Counter */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span>
                    Époque {trainingState?.currentEpoch || 0} / {trainingState?.totalEpochs || 50}
                  </span>
                  <span className="text-terracotta">{progressPct}% Terminé</span>
                </div>
                <div className="w-full h-3 bg-white/10 rounded-pill overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-terracotta to-amber-400 transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Loss Metric Display */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-card p-4">
                  <p className="text-xs text-white/60 font-bold uppercase">Perte Actuelle (Loss)</p>
                  <p className="font-display text-3xl text-terracotta mt-1">
                    {trainingState?.currentLoss ? trainingState.currentLoss.toFixed(4) : '0.0420'}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-card p-4">
                  <p className="text-xs text-white/60 font-bold uppercase">Temps Restant Estimé</p>
                  <p className="font-display text-3xl text-white mt-1">
                    {trainingState?.estimatedTimeRemainingSec ? `${trainingState.estimatedTimeRemainingSec}s` : '0s'}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-card p-4">
                  <p className="text-xs text-white/60 font-bold uppercase">Modèle Actif</p>
                  <p className="font-bold text-sm text-white/80 truncate mt-2">
                    {trainingState?.activeModelName || 'AfroHair-LoRA-v1.pth'}
                  </p>
                </div>
              </div>

              {/* Graphique Visuel SVG de la Courbe de Loss */}
              <div className="bg-slate-950/80 border border-white/10 rounded-card p-5 space-y-2">
                <p className="text-xs font-bold text-white/60">Évolution de la Perte Géométrique & Texture par Époque</p>
                <div className="h-44 w-full relative flex items-end gap-1 pt-6 pb-2 px-2 border-b border-l border-white/15">
                  {trainingState?.lossHistory.map((item, idx) => {
                    const heightPct = Math.max(8, Math.min(100, (item.loss / (maxLoss || 0.2)) * 100));
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div
                          className="w-full bg-gradient-to-t from-terracotta/40 to-terracotta rounded-t transition-all hover:brightness-125"
                          style={{ height: `${heightPct}%` }}
                        />
                        <span className="text-[9px] font-bold text-white/40">E{item.epoch}</span>
                        {/* Tooltip hover */}
                        <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-900 border border-terracotta text-white text-[10px] p-2 rounded shadow-2xl z-20 whitespace-nowrap">
                          Époque {item.epoch} : Loss {item.loss}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bouton de Visualisation 3D WebGL */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => open3DPreview(trainingState?.activeModelName || 'Low Taper Fade', 'fade', 'low-taper-fade')}
                  className="min-h-[44px] rounded-pill bg-terracotta text-white px-5 text-xs font-bold inline-flex items-center gap-2 shadow-soft hover:bg-terracotta-dark transition-all"
                >
                  <Eye className="w-4 h-4" />
                  Visualiser le Rendu 3D en Direct (WebGL 60 FPS)
                </button>
              </div>
            </div>
          </div>

          {/* Panneau de Contrôle & Paramètres d'Entraînement */}
          <div className="space-y-6">
            <div className="rounded-card bg-card border border-ink/10 p-6 shadow-soft space-y-5">
              <div className="flex items-center gap-2 border-b border-ink/10 pb-3">
                <Sliders className="w-5 h-5 text-terracotta" />
                <h3 className="font-display text-xl">Paramètres d'Entraînement</h3>
              </div>

              <div className="space-y-4 text-sm">
                {/* Statut de la Cible Actuelle Sélectionnée en Haut */}
                {studioSpace === 'human_head' ? (
                  <div className="bg-terracotta-wash border border-terracotta/30 rounded-card p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-terracotta">
                      <User className="w-4 h-4 shrink-0" />
                      <span>Cible : Tête Humaine Photoréaliste (Hunyuan3D 2.0)</span>
                    </div>
                    <span className="text-[10px] bg-terracotta text-white font-bold px-2.5 py-1 rounded-pill uppercase tracking-wider">
                      Tête Humaine
                    </span>
                  </div>
                ) : (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-card p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                      <Box className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>Cible : Coiffure 3D Seule (Maillage Cheveux)</span>
                    </div>
                    <span className="text-[10px] bg-amber-600 text-white font-bold px-2.5 py-1 rounded-pill uppercase tracking-wider">
                      Coiffure Seule
                    </span>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-xs uppercase tracking-wider text-ink-soft mb-1">
                    Nombre d'Époques (Epochs)
                  </label>
                  <input
                    type="number"
                    value={epochs}
                    onChange={(e) => setEpochs(Number(e.target.value))}
                    disabled={isRunning || busy}
                    className="w-full min-h-[44px] rounded-input bg-cream border border-ink/10 px-4 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-xs uppercase tracking-wider text-ink-soft mb-1">
                    Taux d'Apprentissage (Learning Rate)
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={learningRate}
                    onChange={(e) => setLearningRate(Number(e.target.value))}
                    disabled={isRunning || busy}
                    className="w-full min-h-[44px] rounded-input bg-cream border border-ink/10 px-4 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-xs uppercase tracking-wider text-ink-soft mb-1">
                    Taille du Batch (Batch Size)
                  </label>
                  <select
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    disabled={isRunning || busy}
                    className="w-full min-h-[44px] rounded-input bg-cream border border-ink/10 px-4 font-bold"
                  >
                    <option value={4}>4 (GPU 8GB VRAM)</option>
                    <option value={8}>8 (GPU 16GB VRAM - Recommandé)</option>
                    <option value={16}>16 (GPU 24GB VRAM)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-xs uppercase tracking-wider text-ink-soft mb-1">
                    Cible Taxonomie (Hairstyle Class)
                  </label>
                  <select
                    value={taxonomyTarget}
                    onChange={(e) => setTaxonomyTarget(e.target.value)}
                    disabled={isRunning || busy}
                    className="w-full min-h-[44px] rounded-input bg-cream border border-ink/10 px-4 font-bold"
                  >
                    <option value="hunyuan-head-african">Hunyuan3D 2.0 — Tête Humaine Africaine Photoréaliste</option>
                    <option value="low-taper-fade">Low Taper Fade & Line-Up uniquement</option>
                  </select>
                </div>
              </div>

              {/* Bouton d'Action */}
              {!isRunning ? (
                <button
                  onClick={startTraining}
                  disabled={busy}
                  className="w-full min-h-[50px] rounded-pill bg-terracotta text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-soft hover:bg-terracotta-dark transition-all"
                >
                  <Play className="w-4 h-4" />
                  Démarrer l'Entraînement GPU LoRA
                </button>
              ) : (
                <button
                  onClick={stopTraining}
                  disabled={busy}
                  className="w-full min-h-[50px] rounded-pill bg-red-600 text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-soft hover:bg-red-700 transition-all"
                >
                  <Square className="w-4 h-4" />
                  Interrompre l'Entraînement
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: JEU DE DONNÉES SYNTHÉTIQUE (30 GLB) */}
      {activeTab === 'dataset' && (
        <div className="space-y-6">
          <div className="bg-card border border-ink/10 rounded-card p-6 shadow-soft">
            <h2 className="font-display text-2xl">
              {studioSpace === 'human_head'
                ? 'Catalogue 3D - Visages & Têtes Humaines Africaines'
                : 'Catalogue 3D - Maillages Coiffures & Coupes Afro'}
            </h2>
            <p className="text-sm text-ink-soft mt-1">
              {studioSpace === 'human_head'
                ? "Scans et maillages 3D photoréalistes de têtes humaines africaines pour l'entraînement Hunyuan3D 2.0."
                : "Maillages 3D isolés de cheveux et coupes Afro pour l'entraînement LoRA."}
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
              {filteredTaxonomies.map((tax) => (
                <div key={tax.slug} className="rounded-card bg-cream border border-ink/10 p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="w-8 h-8 rounded-full bg-terracotta-wash text-terracotta flex items-center justify-center font-bold text-xs">
                      <Box className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-bold bg-ink/5 px-2.5 py-1 rounded-pill">{tax.samples} échantillons</span>
                  </div>
                  <div>
                    <h3 className="font-display text-xl">{tax.name}</h3>
                    <p className="text-xs text-ink-soft mt-0.5">Dossier : api/data/synthetic_afro_dataset/{tax.slug}/</p>
                  </div>
                  <div className="pt-2 border-t border-ink/10 flex justify-between items-center text-xs font-bold">
                    <span className="text-ink-soft">Nombre de vertices :</span>
                    <span className="text-terracotta">~{tax.avgVertices.toLocaleString('fr-FR')}</span>
                  </div>
                  <button
                    onClick={() => open3DPreview(tax.name, tax.slug.includes('fade') ? 'fade' : tax.slug.includes('locks') ? 'locks' : tax.slug.includes('braid') || tax.slug.includes('cornrow') ? 'tresses' : tax.slug.includes('beard') ? 'barbe' : 'afro', tax.slug)}
                    className="w-full min-h-[38px] rounded-pill border border-ink/15 text-ink hover:bg-ink/5 px-3 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all mt-2"
                  >
                    <Eye className="w-3.5 h-3.5 text-terracotta" />
                    Inspecter le Modèle GLB 3D
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CHECKPOINTS & MODÈLES ENTRAÎNÉS (.pth) */}
      {activeTab === 'checkpoints' && (
        <div className="space-y-6">
          <div className="bg-card border border-ink/10 rounded-card p-6 shadow-soft space-y-4">
            <h2 className="font-display text-2xl">Poids & Checkpoints des Modèles Entraînés (.pth)</h2>
            <p className="text-sm text-ink-soft">
              Fichiers d'adaptateurs LoRA exportés depuis le pipeline PyTorch GPU.
            </p>

            <div className="space-y-3">
              {checkpoints.map((ckpt) => (
                <div key={ckpt.id} className="rounded-card bg-cream border border-ink/10 p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                      <Flame className="w-5 h-5" />
                    </span>
                    <div>
                      <h4 className="font-bold text-base">{ckpt.name}</h4>
                      <p className="text-xs text-ink-soft">
                        Taille : {ckpt.sizeMb} Mo · Époque {ckpt.epoch} · Loss finale : {ckpt.finalLoss}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => open3DPreview(ckpt.name, 'fade', 'low-taper-fade')}
                      className="min-h-[38px] rounded-pill bg-terracotta text-white px-4 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-terracotta-dark transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Visualiser en 3D
                    </button>
                    <button className="min-h-[38px] rounded-pill border border-ink/15 px-4 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-ink/5">
                      <Download className="w-3.5 h-3.5 text-terracotta" />
                      Télécharger .pth
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Prévisualisation 3D Interactive (WebGL 60 FPS) */}
      <Hairstyle3DPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />
    </div>
  );
}
