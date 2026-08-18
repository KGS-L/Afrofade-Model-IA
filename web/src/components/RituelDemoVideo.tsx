'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, RefreshCw, Scissors, ScanFace, Sparkles, Wand2 } from 'lucide-react';

/**
 * Démo automatique — « Le Rituel du Miroir »
 *
 * Flux COMPLET (Jonas-dev 2026-08-18) :
 *
 *   1. SCAN GUIDÉ (Face → Profil droit → Profil gauche → Nuque)
 *      ‣ Même personnage sur les 4 angles
 *      ‣ Ovale de guidage suffisamment large pour contenir la tête
 *   2. RECONSTRUCTION 3D → tête chauve sans cheveux (résultat brut du scan)
 *   3. CHOIX DE COIFFURE → on parcourt 3 styles
 *   4. APPLICATION → on montre le style appliqué sur la tête 3D
 *   5. BARBE → suppression de la barbe + taille de la moustache
 *   6. RÉSULTAT FINAL validé → coupe + barbe rasée + moustache taillée
 *   7. REBOUCLAGE → retour au scan
 *
 * Poster statique sous prefers-reduced-motion.
 */

/* ------------------------------------------------------------------ */
/* Données de la séquence du scan                                      */
/* ------------------------------------------------------------------ */

const SCAN_STEPS: {
  label: string;
  cue: string;
  deg: string;
  sample: string;
  objectPosition: string;
  wrapClass?: string;
}[] = [
  {
    label: 'Face',
    cue: 'Regardez la caméra',
    deg: '0°',
    sample: '/models/client-face.jpg',
    objectPosition: '50% 15%',
  },
  {
    label: 'Profil droit',
    cue: 'Tournez la tête vers la droite',
    deg: '+90°',
    sample: '/models/client-profil-droit.png',
    objectPosition: '50% 18%',
  },
  {
    label: 'Profil gauche',
    cue: 'Tournez la tête vers la gauche',
    deg: '−90°',
    sample: '/models/client-profil-droit.png',
    objectPosition: '50% 18%',
    wrapClass: 'scale-x-[-1]',
  },
  {
    label: 'Nuque',
    cue: 'Présentez la nuque',
    deg: '180°',
    sample: '/models/client-nuque.png',
    objectPosition: '50% 18%',
  },
];

/* Coiffures proposées dans la phase choix */
const STYLE_OPTIONS = [
  { src: '/models/afro_taper_fade.png', title: 'Taper fade' },
  { src: '/models/afro_dreadlocks.png', title: 'Locks sculptées' },
  { src: '/models/afro_cornrows.png', title: 'Cornrows' },
];

/* ------------------------------------------------------------------ */
/* Durées de chaque phase (ms)                                         */
/* ------------------------------------------------------------------ */
const SCAN_MS = 2600;
const RECONSTRUCT_MS = 2400;
const BALD_MS = 2800;
const STYLE_MS = 2200;
const APPLY_MS = 2600;
const BEARD_MS = 3000;
const RESULT_MS = 3600;

/* ------------------------------------------------------------------ */
/* Phases de la timeline                                               */
/* ------------------------------------------------------------------ */
type Phase =
  | { kind: 'scan'; i: number }       // scan guidé 4 angles
  | { kind: 'reconstruct' }           // spinner « Reconstruction 3D… »
  | { kind: 'bald' }                  // résultat 3D sans cheveux
  | { kind: 'styles'; i: number }     // choix parmi les coiffures
  | { kind: 'apply' }                 // coiffure appliquée sur la tête
  | { kind: 'beard' }                 // simulation rasage barbe + moustache
  | { kind: 'result' };               // résultat final validé

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export const RituelDemoVideo: React.FC = () => {
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<Phase>({ kind: 'scan', i: 0 });
  const [flashKey, setFlashKey] = useState(0);
  const [visible, setVisible] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  /* La séquence repart TOUJOURS du scan à l'entrée dans le viewport. */
  useEffect(() => {
    const el = stageRef.current;
    if (!el || !('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => setVisible(entries[0].isIntersecting),
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) setPhase({ kind: 'scan', i: 0 });
  }, [visible]);

  /* ---- Machine à états de la timeline ---- */
  useEffect(() => {
    if (!visible || reduced) return;
    let sub: number | undefined;

    const duration =
      phase.kind === 'scan' ? SCAN_MS
        : phase.kind === 'reconstruct' ? RECONSTRUCT_MS
          : phase.kind === 'bald' ? BALD_MS
            : phase.kind === 'styles' ? STYLE_MS
              : phase.kind === 'apply' ? APPLY_MS
                : phase.kind === 'beard' ? BEARD_MS
                  : RESULT_MS;

    const t = window.setTimeout(() => {
      switch (phase.kind) {
        case 'scan':
          setFlashKey((k) => k + 1);
          sub = window.setTimeout(() => {
            if (phase.i < SCAN_STEPS.length - 1) {
              setPhase({ kind: 'scan', i: phase.i + 1 });
            } else {
              setPhase({ kind: 'reconstruct' });
            }
          }, 380);
          break;
        case 'reconstruct':
          setPhase({ kind: 'bald' });
          break;
        case 'bald':
          setPhase({ kind: 'styles', i: 0 });
          break;
        case 'styles':
          if (phase.i < STYLE_OPTIONS.length - 1) {
            setPhase({ kind: 'styles', i: phase.i + 1 });
          } else {
            setPhase({ kind: 'apply' });
          }
          break;
        case 'apply':
          setPhase({ kind: 'beard' });
          break;
        case 'beard':
          setPhase({ kind: 'result' });
          break;
        case 'result':
          // Rebouclage → retour au scan
          setPhase({ kind: 'scan', i: 0 });
          break;
      }
    }, duration);

    return () => {
      window.clearTimeout(t);
      if (sub) window.clearTimeout(sub);
    };
  }, [phase, visible, reduced]);

  /* ---- Dérivations d'affichage ---- */
  const isScan = phase.kind === 'scan';
  const isReconstruct = phase.kind === 'reconstruct';
  const isBald = phase.kind === 'bald';
  const isStyles = phase.kind === 'styles';
  const isApply = phase.kind === 'apply';
  const isBeard = phase.kind === 'beard';
  const isResult = phase.kind === 'result';

  const scanIndex = isScan ? phase.i : 0;
  const scanStep = isScan ? SCAN_STEPS[scanIndex] : null;
  const captured = isScan ? phase.i : 4;

  // Photo de fond pendant scan / reconstruct
  const photoStep = isScan
    ? scanStep
    : isReconstruct
      ? SCAN_STEPS[SCAN_STEPS.length - 1]
      : null;

  const styleOption = isStyles ? STYLE_OPTIONS[phase.i] : null;

  /* Numéro d'étape affiché en haut à droite */
  const stepLabel = isScan
    ? `Scan · ${scanIndex + 1}/4`
    : isReconstruct
      ? 'Reconstruction 3D…'
      : isBald
        ? 'Résultat du scan'
        : isStyles
          ? `Coiffure · ${(phase as { kind: 'styles'; i: number }).i + 1}/${STYLE_OPTIONS.length}`
          : isApply
            ? 'Coiffure appliquée'
            : isBeard
              ? 'Barbe & Moustache'
              : 'Résultat final';

  return (
    <div className="space-y-4" aria-label="Démo automatique du Rituel du Miroir">
      {/* ---- Scène principale ---- */}
      <div
        ref={stageRef}
        className="relative rounded-frame overflow-hidden border border-ink/10 shadow-soft aspect-[4/3] bg-night"
      >
        {/* ═══ COUCHE PHOTO : Scan & Reconstruct ═══ */}
        {photoStep && (
          <div className={`absolute inset-0 ${photoStep.wrapClass ?? ''}`}>
            <Image
              key={`photo-${photoStep.label}`}
              src={photoStep.sample}
              alt={`Scan guidé — ${photoStep.label}`}
              fill
              sizes="(max-width: 768px) 100vw, 700px"
              className="object-cover motion-safe:animate-demo-kenburns"
              style={{ objectPosition: photoStep.objectPosition }}
            />
          </div>
        )}

        {/* ═══ COUCHE RENDU : Bald / Styles / Apply / Beard / Result ═══ */}
        {isBald && (
          <div className="absolute inset-0">
            <Image
              src="/models/result-3d-bald.png"
              alt="Reconstruction 3D — tête sans cheveux"
              fill sizes="(max-width: 768px) 100vw, 700px"
              className="object-cover motion-safe:animate-demo-kenburns"
            />
          </div>
        )}
        {styleOption && (
          <div className="absolute inset-0">
            <Image
              key={`style-${styleOption.src}`}
              src={styleOption.src}
              alt={`Coiffure — ${styleOption.title}`}
              fill sizes="(max-width: 768px) 100vw, 700px"
              className="object-cover motion-safe:animate-demo-kenburns"
            />
          </div>
        )}
        {isApply && (
          <div className="absolute inset-0">
            <Image
              src="/models/afro_taper_fade.png"
              alt="Coiffure appliquée — Taper fade"
              fill sizes="(max-width: 768px) 100vw, 700px"
              className="object-cover motion-safe:animate-demo-kenburns"
            />
          </div>
        )}
        {isBeard && (
          <div className="absolute inset-0">
            <Image
              src="/models/result-beard-removed.png"
              alt="Simulation — barbe supprimée, moustache taillée"
              fill sizes="(max-width: 768px) 100vw, 700px"
              className="object-cover motion-safe:animate-demo-kenburns"
            />
          </div>
        )}
        {isResult && (
          <div className="absolute inset-0">
            <Image
              src="/models/result-final.png"
              alt="Résultat final validé"
              fill sizes="(max-width: 768px) 100vw, 700px"
              className="object-cover motion-safe:animate-demo-kenburns"
            />
          </div>
        )}

        {/* ═══ BADGE PERMANENT ═══ */}
        <span className="absolute top-3 left-3 bg-ink/70 backdrop-blur-sm text-white text-[9px] font-bold tracking-[0.14em] uppercase px-3 py-1.5 rounded-pill z-10">
          Démo automatique
        </span>

        {/* ═══ BADGE D'ÉTAPE (droite) ═══ */}
        <span
          className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1.5 rounded-pill z-10 ${
            isResult
              ? 'bg-scan-success text-white'
              : isBald
                ? 'bg-terracotta text-white'
                : 'bg-white/90 text-ink'
          }`}
        >
          {stepLabel}
        </span>

        {/* ═══ OVERLAY SCAN : ovale + consigne + progression ═══ */}
        {scanStep && (
          <>
            {/* Ovale de guidage — assez grand pour contenir la tête entière.
                cx=50 cy=40  rx=30 ry=38 → couvre largement le crâne + menton. */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none"
              aria-hidden="true"
            >
              <ellipse
                cx="50" cy="40" rx="30" ry="38"
                fill="none"
                stroke="#2E7D46"
                strokeWidth="0.7"
                className="motion-safe:animate-pulse"
                style={{ filter: 'drop-shadow(0 0 8px rgba(46,125,70,0.5))' }}
              />
              {/* Coins de viseur */}
              {[
                'M 22 8 L 22 4 L 28 4',
                'M 78 4 L 72 4 L 72 8',
                'M 22 76 L 22 80 L 28 80',
                'M 72 76 L 72 80 L 78 80',
              ].map((d) => (
                <path
                  key={d}
                  d={d}
                  fill="none"
                  stroke="#2E7D46"
                  strokeWidth="0.6"
                  opacity="0.6"
                />
              ))}
            </svg>
            <div className="absolute bottom-3 left-3 right-3 flex flex-col items-center gap-2">
              <p className="bg-ink/70 backdrop-blur-sm text-white text-xs font-bold px-4 py-2 rounded-pill text-center">
                {scanStep.cue}
              </p>
              <div className="w-full max-w-[280px] h-1.5 bg-white/50 rounded-pill overflow-hidden">
                <div
                  key={`progress-${scanIndex}`}
                  className="h-full bg-scan-success motion-safe:animate-demo-progress"
                  style={reduced ? { width: '45%' } : undefined}
                />
              </div>
              <p className="text-[10px] font-bold text-ink/70 bg-white/70 rounded-pill px-2.5 py-1">
                {scanStep.label} · {scanStep.deg} — capture automatique
              </p>
            </div>
          </>
        )}

        {/* ═══ OVERLAY RECONSTRUCTION ═══ */}
        {isReconstruct && (
          <div className="absolute inset-0 bg-cream/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-9 h-9 animate-spin text-terracotta" />
            <p className="text-sm font-bold text-ink">Reconstruction 3D en cours…</p>
            <p className="text-xs text-ink-soft">Assemblage des 4 angles capturés</p>
          </div>
        )}

        {/* ═══ OVERLAY BALD (tête sans cheveux) ═══ */}
        {isBald && (
          <div className="absolute bottom-3 left-3 right-3 flex flex-col items-center gap-2">
            <p className="bg-terracotta text-white text-xs font-bold px-4 py-2 rounded-pill inline-flex items-center gap-2 text-center shadow-soft">
              <Sparkles className="w-3.5 h-3.5" />
              Tête 3D reconstruite — prête pour l'essayage
            </p>
          </div>
        )}

        {/* ═══ OVERLAY CHOIX COIFFURE ═══ */}
        {styleOption && (
          <div className="absolute bottom-3 left-3 right-3 flex flex-col items-center gap-2">
            <p className="bg-ink/70 backdrop-blur-sm text-white text-xs font-bold px-4 py-2 rounded-pill inline-flex items-center gap-2 text-center">
              <Wand2 className="w-3.5 h-3.5 text-terracotta-pale" />
              {styleOption.title}
            </p>
            <p className="text-[10px] font-bold text-ink/70 bg-white/70 rounded-pill px-2.5 py-1">
              Parcourez les styles — swipez pour comparer
            </p>
          </div>
        )}

        {/* ═══ OVERLAY APPLICATION ═══ */}
        {isApply && (
          <div className="absolute bottom-3 left-3 right-3 flex flex-col items-center gap-2">
            <p className="bg-scan-success/90 text-white text-xs font-bold px-4 py-2 rounded-pill inline-flex items-center gap-2 text-center shadow-soft">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Taper fade appliqué sur la tête 3D
            </p>
          </div>
        )}

        {/* ═══ OVERLAY BARBE ═══ */}
        {isBeard && (
          <div className="absolute bottom-3 left-3 right-3 flex flex-col items-center gap-2">
            <p className="bg-ink/70 backdrop-blur-sm text-white text-xs font-bold px-4 py-2 rounded-pill inline-flex items-center gap-2 text-center">
              <Scissors className="w-3.5 h-3.5 text-terracotta-pale" />
              Barbe supprimée · Moustache taillée
            </p>
            <p className="text-[10px] font-bold text-ink/70 bg-white/70 rounded-pill px-2.5 py-1">
              Simulation du rasage en temps réel
            </p>
          </div>
        )}

        {/* ═══ OVERLAY RÉSULTAT FINAL ═══ */}
        {isResult && (
          <div className="absolute bottom-3 left-3 right-3 flex flex-col items-center gap-2">
            <p className="bg-scan-success text-white text-xs font-bold px-4 py-2 rounded-pill inline-flex items-center gap-2 text-center shadow-soft">
              <CheckCircle2 className="w-4 h-4" />
              Résultat validé — prêt pour la tondeuse
            </p>
            <p className="text-[10px] font-bold text-ink/70 bg-white/70 rounded-pill px-2.5 py-1">
              Taper fade + barbe rasée + moustache taillée
            </p>
          </div>
        )}

        {/* Flash de capture (rejoué à chaque angle du scan) */}
        {!reduced && (
          <div
            key={`flash-${flashKey}`}
            aria-hidden="true"
            className="absolute inset-0 bg-white pointer-events-none motion-safe:animate-demo-flash"
          />
        )}
      </div>

      {/* ---- Filmstrip des angles capturés ---- */}
      <div className="grid grid-cols-4 gap-2" aria-hidden="true">
        {SCAN_STEPS.map((s, i) => {
          const filled = i < captured;
          const isNext = isScan && i === captured;
          return (
            <div
              key={s.label}
              className={`relative aspect-video rounded-frame overflow-hidden border bg-card ${
                filled ? 'border-scan-success/60' : isNext ? 'border-terracotta/70' : 'border-ink/10'
              }`}
            >
              {filled ? (
                <div className={`absolute inset-0 ${s.wrapClass ?? ''}`}>
                  <Image
                    src={s.sample}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 20vw, 110px"
                    className="object-cover"
                    style={{ objectPosition: s.objectPosition }}
                  />
                </div>
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-ink-soft">
                  {s.label}
                </span>
              )}
              {filled && (
                <span className="absolute top-1 right-1 bg-scan-success text-white rounded-full p-0.5 z-10">
                  <CheckCircle2 className="w-3 h-3" />
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ---- Légende ---- */}
      <p className="flex items-center justify-center gap-2 text-xs text-ink-soft">
        <ScanFace className="w-4 h-4 text-terracotta shrink-0" />
        {reduced
          ? 'Aperçu du Rituel : scan, reconstruction 3D, essayage de coiffures et simulation barbe.'
          : 'Scan → 3D → Coiffure → Barbe → Résultat — la séquence reboucle automatiquement.'}
      </p>
    </div>
  );
};
