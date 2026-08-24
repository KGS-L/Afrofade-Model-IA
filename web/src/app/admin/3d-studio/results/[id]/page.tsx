'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Flame,
  Trash2,
  Download,
  RotateCw,
  Box,
  Layers,
  Activity,
  CheckCircle2,
  Sliders,
  Sparkles,
  User,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { Hairstyle3DPreviewModal } from '@/components/Hairstyle3DPreviewModal';

interface CheckpointResult {
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

export default function Single3DResultPage() {
  const params = useParams();
  const router = useRouter();
  const { user, hydrated } = useAuth();

  const id = params?.id as string;
  const [result, setResult] = useState<CheckpointResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!hydrated || !id) return;

    const fetchSingleResult = async () => {
      try {
        const res = await fetch(`/api/admin/3d-studio/checkpoints?id=${encodeURIComponent(id)}`, {
          cache: 'no-store',
        });
        if (res.status === 401) {
          router.push(`/connexion?redirect=/admin/3d-studio/results/${id}`);
          return;
        }
        const data = await res.json();
        if (res.ok && data.success && data.checkpoint) {
          setResult(data.checkpoint);
        } else {
          setMessage('Résultat d\'entraînement non trouvé.');
        }
      } catch {
        setMessage('Erreur lors du chargement du résultat.');
      } finally {
        setLoading(false);
      }
    };

    fetchSingleResult();
  }, [hydrated, id, router]);

  const deleteThisResult = async () => {
    if (!result) return;
    if (!confirm(`Voulez-vous vraiment SUPPRIMER ET NETTOYER le résultat "${result.name}" ?`)) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/3d-studio/checkpoints?id=${encodeURIComponent(result.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push('/admin/3d-studio/results');
      } else {
        setMessage(data.error || 'Erreur lors de la suppression.');
      }
    } catch {
      setMessage('Erreur réseau lors de la suppression.');
    } finally {
      setBusy(false);
    }
  };

  if (!hydrated || loading) {
    return <DashboardSkeleton darkHeader />;
  }

  if (!result) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="font-display text-3xl">Résultat introuvable</h2>
        <p className="text-ink-soft">Ce modèle 3D a été nettoyé ou supprimé.</p>
        <Link
          href="/admin/3d-studio/results"
          className="inline-flex min-h-[44px] rounded-pill bg-terracotta text-white px-6 font-bold text-xs items-center gap-2"
        >
          ← Retourner aux résultats
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Barre Supérieure Plein Écran */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/3d-studio/results"
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-display text-2xl text-white flex items-center gap-3">
              {result.name}
              <span className="text-[11px] font-bold bg-terracotta text-white px-2.5 py-0.5 rounded-pill uppercase">
                Rendu Plein Écran
              </span>
            </h1>
            <p className="text-xs text-white/60">
              Taxonomie : <span className="text-terracotta font-bold">{result.taxonomy}</span> · Époque {result.epoch}/{result.totalEpochs}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="min-h-[40px] rounded-pill bg-terracotta text-white px-5 text-xs font-bold inline-flex items-center gap-2 hover:bg-terracotta-dark transition-all"
          >
            <RotateCw className="w-4 h-4" />
            Lancer l'Essayage Biométrique 3D
          </button>

          <button
            onClick={deleteThisResult}
            disabled={busy}
            className="min-h-[40px] rounded-pill bg-red-600/80 text-white px-4 text-xs font-bold inline-flex items-center gap-2 hover:bg-red-600 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Nettoyer ce résultat
          </button>
        </div>
      </header>

      {message && (
        <div className="mx-6 mt-4 p-4 rounded-input bg-red-500/20 border border-red-500/40 text-red-200 text-sm font-bold flex items-center gap-3">
          {message}
        </div>
      )}

      {/* Contenu Principal Plein Écran : Visionneuse WebGL + Panneaux de Données */}
      <main className="flex-1 grid lg:grid-cols-3 gap-6 p-6">
        {/* Panneau Gauche & Visionneuse 3D Immersive */}
        <div className="lg:col-span-2 bg-slate-900 border border-white/10 rounded-card p-6 flex flex-col justify-between space-y-6 relative overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 z-10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-terracotta" />
              <h2 className="font-display text-xl">Visionneuse Mesh 3D Haute Fidélité</h2>
            </div>
            <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-pill text-emerald-400">
              60 FPS WebGL Engine
            </span>
          </div>

          {/* Rendu Modèle Preview Card */}
          <div className="flex-1 min-h-[420px] rounded-card bg-slate-950/80 border border-white/10 p-6 flex flex-col items-center justify-center space-y-6 relative">
            <div className="w-44 h-44 rounded-full bg-gradient-to-tr from-terracotta/30 to-amber-500/20 border-2 border-terracotta flex items-center justify-center shadow-2xl relative">
              <Box className="w-20 h-20 text-terracotta animate-pulse" />
              <div className="absolute inset-0 rounded-full border border-white/20 animate-ping opacity-25" />
            </div>

            <div className="text-center max-w-md space-y-2">
              <h3 className="font-display text-2xl text-white">{result.taxonomy}</h3>
              <p className="text-xs text-white/60">
                Maillage 3D PyTorch LoRA prêt pour l'intégration WebGL & essayage virtuel en temps réel.
              </p>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="min-h-[46px] rounded-pill bg-terracotta text-white px-6 font-bold text-xs inline-flex items-center gap-2 shadow-soft hover:bg-terracotta-dark transition-all"
            >
              <RotateCw className="w-4 h-4" />
              Manipuler en 3D 360° (OrbitControls)
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10 text-xs">
            <div className="bg-white/5 rounded-input p-3 text-center">
              <span className="block text-white/50 text-[10px] uppercase font-bold">Époque Final</span>
              <span className="font-display text-xl text-white mt-1">{result.epoch}</span>
            </div>
            <div className="bg-white/5 rounded-input p-3 text-center">
              <span className="block text-white/50 text-[10px] uppercase font-bold">Loss Géométrique</span>
              <span className="font-display text-xl text-terracotta mt-1">{result.finalLoss}</span>
            </div>
            <div className="bg-white/5 rounded-input p-3 text-center">
              <span className="block text-white/50 text-[10px] uppercase font-bold">Loss Validation</span>
              <span className="font-display text-xl text-emerald-400 mt-1">{result.valLoss}</span>
            </div>
          </div>
        </div>

        {/* Panneau Droit — Métriques & Téléchargement */}
        <div className="space-y-6">
          {/* Fiche Technique */}
          <div className="bg-slate-900 border border-white/10 rounded-card p-6 space-y-5 shadow-2xl">
            <h3 className="font-display text-xl text-white border-b border-white/10 pb-3 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-terracotta" />
              Fiche Technique du Modèle
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-white/60">Taux d'Apprentissage</span>
                <span className="font-bold text-white">{result.learningRate}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-white/60">Taille du Batch</span>
                <span className="font-bold text-white">{result.batchSize}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-white/60">Taille du Poids (.pth)</span>
                <span className="font-bold text-white">{result.sizeMb} Mo</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-white/60">Nombre de Vertices 3D</span>
                <span className="font-bold text-terracotta">~{result.verticesCount.toLocaleString('fr-FR')}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-white/60">Nombre de Faces Mesh</span>
                <span className="font-bold text-white">~{result.facesCount.toLocaleString('fr-FR')}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-white/60">Date d'Entraînement</span>
                <span className="font-bold text-white/80">{new Date(result.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-3">
              <button className="w-full min-h-[46px] rounded-pill bg-white/10 text-white font-bold text-xs inline-flex items-center justify-center gap-2 hover:bg-white/20 transition-all border border-white/15">
                <Download className="w-4 h-4 text-terracotta" />
                Télécharger le Poids (.pth)
              </button>

              <button
                onClick={deleteThisResult}
                disabled={busy}
                className="w-full min-h-[44px] rounded-pill bg-red-600/30 border border-red-500/40 text-red-200 font-bold text-xs inline-flex items-center justify-center gap-2 hover:bg-red-600/50 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Nettoyer / Supprimer ce Résultat
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Modal 3D interactive */}
      {showModal && (
        <Hairstyle3DPreviewModal
          item={{
            id: result.slug || 'fade_taper_low',
            category: (result.slug.includes('fade') ? 'fade' : result.slug.includes('locks') ? 'locks' : result.slug.includes('braid') || result.slug.includes('cornrow') ? 'tresses' : result.slug.includes('beard') ? 'barbe' : 'afro'),
            title: result.taxonomy,
            subtitle: `Rendu 3D haute fidélité pour ${result.taxonomy}`,
            color: '#1a110b',
            isPremium: false,
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
