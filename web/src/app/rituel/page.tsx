'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Scissors,
  Sparkles,
  Upload,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  PartyPopper,
} from 'lucide-react';

type Step = 'idle' | 'analyzing' | 'ready';

const REQUIREMENTS = [
  'Tête entière visible',
  'Photo nette, lumière naturelle',
  'Visage dégagé',
];

/**
 * Page « Tester le Rituel » — grammaire copiée de thelma.pet/create :
 * page centrée, une seule mission (déposer ses photos), liste d’exigences,
 * note de confidentialité. Contenus Afrofade originaux.
 */
export default function RituelPage() {
  const [step, setStep] = useState<Step>('idle');

  const handleAddPhotos = () => {
    if (step !== 'idle') return;
    setStep('analyzing');
    window.setTimeout(() => setStep('ready'), 2000);
  };

  return (
    <div className="min-h-screen bg-cream text-ink flex flex-col">
      {/* En-tête minimal — logo + retour */}
      <header className="border-b border-ink/10">
        <div className="max-w-container mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            aria-label="Afrofade — retour à l’accueil"
          >
            <div className="w-9 h-9 rounded-card bg-terracotta flex items-center justify-center">
              <Scissors className="w-4.5 h-4.5 text-white stroke-[2.5]" />
            </div>
            <span className="font-display text-lg tracking-tight">
              Afro<span className="text-terracotta">fade</span>
            </span>
          </Link>
          <Link
            href="/"
            className="min-h-[44px] inline-flex items-center gap-2 text-sm font-medium text-ink-soft hover:text-terracotta transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl space-y-8">
          {/* Titre de mission unique */}
          <div className="text-center space-y-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-terracotta bg-terracotta-wash px-3 py-1.5 rounded-pill">
              <Sparkles className="w-3.5 h-3.5" />
              Test gratuit · sans carte
            </span>
            <h1 className="font-display text-3xl sm:text-4xl leading-tight">
              Tester le Rituel du Miroir
            </h1>
            <p className="text-sm leading-relaxed text-ink-soft max-w-md mx-auto">
              Déposez les photos du client — face, profils gauche et droit,
              arrière — et découvrez la reconstruction 3D en quelques secondes.
            </p>
          </div>

          {step === 'idle' && (
            /* Grande dropzone — cœur de la page */
            <button
              type="button"
              onClick={handleAddPhotos}
              aria-label="Ajouter les photos du client"
              className="w-full min-h-[280px] rounded-card border-2 border-dashed border-terracotta/70 bg-card hover:bg-terracotta-wash transition-colors flex flex-col items-center justify-center gap-4 p-8 text-center shadow-soft group"
            >
              <div className="w-16 h-16 rounded-full bg-terracotta-wash border border-terracotta/30 flex items-center justify-center text-terracotta group-hover:bg-terracotta group-hover:text-white transition-colors">
                <Upload className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-ink">
                  Glissez vos photos ici
                </p>
                <p className="text-sm text-ink-soft">
                  Touchez pour ajouter vos photos
                </p>
              </div>
              <p className="text-xs text-ink-soft">
                ou parcourez vos fichiers · JPG · PNG · HEIC
              </p>
            </button>
          )}

          {step === 'analyzing' && (
            <div
              aria-live="polite"
              className="w-full min-h-[280px] rounded-card border border-ink/10 bg-card shadow-soft flex flex-col items-center justify-center gap-4 p-8 text-center"
            >
              <RefreshCw className="w-10 h-10 animate-spin text-terracotta" />
              <p className="text-base font-bold text-ink">
                Analyse IA — reconstruction en cours…
              </p>
              <p className="text-xs text-ink-soft">
                La tête 3D de votre client prend forme, quelques secondes.
              </p>
            </div>
          )}

          {step === 'ready' && (
            <div
              aria-live="polite"
              className="w-full min-h-[280px] rounded-card border border-terracotta/40 bg-card shadow-soft flex flex-col items-center justify-center gap-4 p-8 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-terracotta-wash border border-terracotta/40 flex items-center justify-center text-terracotta">
                <PartyPopper className="w-7 h-7" />
              </div>
              <p className="font-display text-2xl">
                Votre tête 3D est prête !
              </p>
              <p className="text-sm text-ink-soft max-w-sm">
                Poursuivez dans le studio pour essayer fades, locks, tresses et
                barbes sur le modèle.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-2">
                <Link
                  href="/#rituel-studio"
                  className="min-h-[48px] inline-flex items-center justify-center gap-2 bg-terracotta hover:bg-terracotta-dark text-white font-bold text-sm px-6 rounded-pill transition-colors"
                >
                  Explorer les styles
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => setStep('idle')}
                  className="min-h-[48px] inline-flex items-center justify-center gap-2 bg-transparent border border-ink/20 hover:border-terracotta/50 text-ink font-bold text-sm px-6 rounded-pill transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Recommencer
                </button>
              </div>
            </div>
          )}

          {/* Exigences photo — grammaire /create */}
          <ul className="grid sm:grid-cols-3 gap-3">
            {REQUIREMENTS.map((req) => (
              <li
                key={req}
                className="flex items-center gap-2 bg-card border border-ink/10 rounded-pill px-4 py-3 text-xs font-medium text-ink"
              >
                <CheckCircle2 className="w-4 h-4 text-terracotta shrink-0" />
                {req}
              </li>
            ))}
          </ul>

          <p className="text-center text-[11px] leading-relaxed text-ink-soft max-w-md mx-auto">
            En continuant, vos photos sont temporairement stockées dans un
            espace isolé et propre à votre salon, puis supprimées une fois la
            tête 3D générée.
          </p>
        </div>
      </main>

      <footer className="border-t border-ink/10">
        <div className="max-w-container mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-ink-soft">
          <span>
            © {new Date().getFullYear()} Afrofade — Tous droits réservés
          </span>
          <span>Wave · Orange Money · MTN · Moov</span>
        </div>
      </footer>
    </div>
  );
}
