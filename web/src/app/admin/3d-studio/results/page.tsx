'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Flame,
  Trash2,
  Maximize2,
  Download,
  ArrowLeft,
  RefreshCw,
  Box,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Sliders,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';

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

export default function Admin3DStudioResultsPage() {
  const router = useRouter();
  const { user, hydrated } = useAuth();

  const [results, setResults] = useState<CheckpointResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchResults = async () => {
    try {
      const res = await fetch('/api/admin/3d-studio/checkpoints', { cache: 'no-store' });
      if (res.status === 401) {
        router.push('/connexion?redirect=/admin/3d-studio/results');
        return;
      }
      const data = await res.json();
      if (res.ok && data.success) {
        setResults(data.checkpoints || []);
      }
    } catch {
      setMessage('Impossible de charger les résultats d\'entraînement.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    fetchResults();
  }, [hydrated]);

  const deleteSingleResult = async (id: string, name: string) => {
    if (!confirm(`Voulez-vous vraiment supprimer le résultat "${name}" ?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/3d-studio/checkpoints?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage(`Résultat "${name}" supprimé avec succès.`);
        setResults((prev) => prev.filter((r) => r.id !== id));
      } else {
        setMessage(data.error || 'Erreur lors de la suppression.');
      }
    } catch {
      setMessage('Erreur réseau lors de la suppression.');
    } finally {
      setBusy(false);
    }
  };

  const clearAllResults = async () => {
    if (!confirm('⚠️ ATTENTION : Voulez-vous vraiment NETTOYER ET SUPPRIMER TOUS LES RÉSULTATS d\'entraînement ? Cette action est irréversible.')) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/3d-studio/checkpoints?all=true', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage('Tous les résultats ont été nettoyés avec succès.');
        setResults([]);
      } else {
        setMessage(data.error || 'Erreur lors du nettoyage total.');
      }
    } catch {
      setMessage('Erreur réseau lors du nettoyage.');
    } finally {
      setBusy(false);
    }
  };

  if (!hydrated || loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* En-tête de la Galerie */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ink/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/3d-studio"
              className="w-10 h-10 rounded-full bg-cream border border-ink/10 flex items-center justify-center text-ink hover:bg-ink/5 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl text-ink flex items-center gap-3">
                Résultats d'Entraînement 3D
                <span className="text-xs font-bold bg-terracotta-wash text-terracotta px-3 py-1 rounded-pill uppercase tracking-wider">
                  {results.length} modèle(s)
                </span>
              </h1>
              <p className="text-ink-soft text-sm mt-1">
                Visualisez chaque modèle entraîné en plein écran ou nettoyez votre stockage d'expérimentation.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchResults}
            disabled={busy}
            className="min-h-[44px] rounded-pill border border-ink/10 bg-card px-4 text-xs font-bold inline-flex items-center gap-2 hover:bg-ink/5 transition-all"
          >
            <RefreshCw className={`w-4 h-4 text-ink-soft ${busy ? 'animate-spin' : ''}`} />
            Rafraîchir
          </button>

          {results.length > 0 && (
            <button
              onClick={clearAllResults}
              disabled={busy}
              className="min-h-[44px] rounded-pill bg-red-600 text-white px-5 text-xs font-bold inline-flex items-center gap-2 shadow-soft hover:bg-red-700 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Nettoyer Tout ({results.length})
            </button>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`rounded-input px-5 py-4 text-sm font-semibold flex items-center gap-3 ${
            message.includes('supprimé') || message.includes('nettoyés')
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          {message}
        </div>
      )}

      {/* Grille des Résultats */}
      {results.length === 0 ? (
        <div className="rounded-card bg-card border border-ink/10 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-cream mx-auto flex items-center justify-center text-ink-soft">
            <Box className="w-8 h-8" />
          </div>
          <h3 className="font-display text-2xl">Aucun résultat d'entraînement</h3>
          <p className="text-ink-soft text-sm max-w-md mx-auto">
            La base de résultats est propre. Lancez une nouvelle session depuis le Studio 3D pour voir apparaître les modèles.
          </p>
          <Link
            href="/admin/3d-studio"
            className="inline-flex min-h-[44px] rounded-pill bg-terracotta text-white px-6 font-bold text-xs items-center gap-2 shadow-soft hover:bg-terracotta-dark transition-all mt-2"
          >
            ← Retourner au Studio 3D
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((item) => (
            <div
              key={item.id}
              className="rounded-card bg-card border border-ink/10 overflow-hidden shadow-soft hover:shadow-hover transition-all flex flex-col justify-between"
            >
              {/* Entête Carte */}
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-start gap-2">
                  <span className="w-10 h-10 rounded-full bg-terracotta-wash text-terracotta flex items-center justify-center font-bold">
                    <Flame className="w-5 h-5" />
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold bg-emerald-500/10 text-emerald-700 px-2.5 py-1 rounded-pill">
                      Loss: {item.finalLoss}
                    </span>
                    <button
                      onClick={() => deleteSingleResult(item.id, item.name)}
                      disabled={busy}
                      title="Nettoyer ce résultat"
                      className="w-8 h-8 rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-display text-xl text-ink leading-tight">{item.name}</h3>
                  <p className="text-xs text-terracotta font-bold mt-1">{item.taxonomy}</p>
                </div>

                {/* Badges Métriques */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-ink/10 text-xs font-bold text-ink-soft">
                  <div className="bg-cream rounded-input p-2.5">
                    <span className="block text-[10px] text-ink-soft uppercase">Époque Final</span>
                    <span className="text-sm text-ink">{item.epoch} / {item.totalEpochs}</span>
                  </div>
                  <div className="bg-cream rounded-input p-2.5">
                    <span className="block text-[10px] text-ink-soft uppercase">Taille Poids</span>
                    <span className="text-sm text-ink">{item.sizeMb} Mo</span>
                  </div>
                  <div className="bg-cream rounded-input p-2.5">
                    <span className="block text-[10px] text-ink-soft uppercase">Vertices 3D</span>
                    <span className="text-sm text-ink">~{item.verticesCount.toLocaleString('fr-FR')}</span>
                  </div>
                  <div className="bg-cream rounded-input p-2.5">
                    <span className="block text-[10px] text-ink-soft uppercase">Faces Mesh</span>
                    <span className="text-sm text-ink">~{item.facesCount.toLocaleString('fr-FR')}</span>
                  </div>
                </div>
              </div>

              {/* Pied de Carte — Boutons d'Action */}
              <div className="p-4 bg-cream/60 border-t border-ink/10 flex items-center justify-between gap-2">
                <button
                  onClick={() => deleteSingleResult(item.id, item.name)}
                  disabled={busy}
                  className="min-h-[40px] px-3 text-xs font-bold text-red-600 hover:bg-red-50 rounded-pill transition-all inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Nettoyer
                </button>

                <Link
                  href={`/admin/3d-studio/results/${item.id}`}
                  className="min-h-[40px] rounded-pill bg-terracotta text-white px-4 text-xs font-bold inline-flex items-center gap-1.5 shadow-soft hover:bg-terracotta-dark transition-all"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Affichage Plein Écran
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
