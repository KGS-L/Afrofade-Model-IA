'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, RefreshCw, Scissors, ScanFace, Sparkles } from 'lucide-react';

/**
 * Démo vidéo automatique — « Le Rituel du Miroir »
 *
 * Séquence STRICTEMENT identique au visage réel du client :
 *
 * 1. SCAN VIDÉO GUIDÉ (4 angles) : Face → Profil droit → Profil gauche → Nuque
 *    - La tête est parfaitement centrée et intégrée DANS l'ovale sans déborder.
 * 2. RECONSTRUCTION 3D FLAME/DECA : Overlay d'analyse + maillage 3D brut (tête chauve du client).
 * 3. COIFFURE & TAILLE BARBE : Application du Taper fade + rasage barbe & moustache.
 * 4. INSPECTION 3D 360° (4 ANGLES) : Visualisation dynamique zoomée sur le résultat final :
 *    - Angle Face (0°)
 *    - Angle Profil Droit (+90°)
 *    - Angle Profil Gauche (-90°)
 *    - Angle Nuque (180°)
 * 5. REBOUCLAGE FLUIDE : Retour au scan en boucle continue.
 */

/* Angles du scan guidé (visuels réels du client au format PNG) */
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
    sample: '/models/demo/client-face.png',
    objectPosition: '50% 28%',
  },
  {
    label: 'Profil droit',
    cue: 'Tournez la tête vers la droite',
    deg: '+90°',
    sample: '/models/demo/client-profil-droit.png',
    objectPosition: '50% 28%',
  },
  {
    label: 'Profil gauche',
    cue: 'Tournez la tête vers la gauche',
    deg: '−90°',
    sample: '/models/demo/client-profil-gauche.png',
    objectPosition: '50% 28%',
  },
  {
    label: 'Nuque',
    cue: 'Présentez la nuque',
    deg: '180°',
    sample: '/models/demo/client-nuque.png',
    objectPosition: '50% 28%',
  },
];

/* Angles d'inspection du résultat 3D généré par l'API FLAME/DECA */
const RESULT_ANGLES: {
  label: string;
  deg: string;
  sample: string;
  wrapClass?: string;
  zoomClass?: string;
}[] = [
  {
    label: 'Résultat Face',
    deg: '0°',
    sample: '/models/hairstyles/fade_taper_low/model-1-face.png',
    zoomClass: 'scale-[1.08]',
  },
  {
    label: 'Résultat Profil Droit',
    deg: '+90°',
    sample: '/models/hairstyles/fade_taper_low/model-1-droite.png',
    zoomClass: 'scale-[1.12]',
  },
  {
    label: 'Résultat Profil Gauche',
    deg: '−90°',
    sample: '/models/hairstyles/fade_taper_low/model-1-droite.png',
    wrapClass: 'scale-x-[-1]',
    zoomClass: 'scale-[1.12]',
  },
  {
    label: 'Résultat Nuque',
    deg: '180°',
    sample: '/models/hairstyles/fade_taper_low/model-1-nuque.png',
    zoomClass: 'scale-[1.1]',
  },
];

/* Durées (ms) pour une démo fluide */
const SCAN_MS = 2400;
const RECONSTRUCT_MS = 2000;
const BALD_MS = 2400;
const STYLING_MS = 2500;
const RESULT_ANGLE_MS = 2200;

type Phase =
  | { kind: 'scan'; i: number }       // 1. Scan 4 angles
  | { kind: 'reconstruct' }           // 2. Traitement FLAME/DECA
  | { kind: 'bald' }                  // 3. Maillage 3D brut sans cheveux
  | { kind: 'styling' }               // 4. Coiffure + Taille de la barbe & moustache
  | { kind: 'result'; i: number };    // 5. Inspection 3D du résultat sous 4 angles (0..3)

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

  /* Réinitialise au scan quand le composant entre dans le viewport */
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

  /* Déclencheur API lors de la phase de reconstruction FLAME/DECA */
  useEffect(() => {
    if (phase.kind === 'reconstruct') {
      fetch('/api/v1/reconstruct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salon_id: 'afrofade-rituel-demo',
          client_name: 'Client Démo Rituel',
          photos_urls: [
            '/models/demo/client-face.png',
            '/models/demo/client-profil-droit.png',
            '/models/demo/client-profil-gauche.png',
            '/models/demo/client-nuque.png',
          ],
          preserve_skin_texture: true,
        }),
      }).catch((err) => console.warn('Inférence API 3D:', err));
    }
  }, [phase.kind]);

  /* Machine à états de la démo */
  useEffect(() => {
    if (!visible || reduced) return;
    let sub: number | undefined;

    const duration =
      phase.kind === 'scan'
        ? SCAN_MS
        : phase.kind === 'reconstruct'
          ? RECONSTRUCT_MS
          : phase.kind === 'bald'
            ? BALD_MS
            : phase.kind === 'styling'
              ? STYLING_MS
              : RESULT_ANGLE_MS;

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
          }, 300);
          break;
        case 'reconstruct':
          setPhase({ kind: 'bald' });
          break;
        case 'bald':
          setPhase({ kind: 'styling' });
          break;
        case 'styling':
          setPhase({ kind: 'result', i: 0 });
          break;
        case 'result':
          if (phase.i < RESULT_ANGLES.length - 1) {
            setPhase({ kind: 'result', i: phase.i + 1 });
          } else {
            // Rebouclage direct sur le premier angle du scan
            setPhase({ kind: 'scan', i: 0 });
          }
          break;
      }
    }, duration);

    return () => {
      window.clearTimeout(t);
      if (sub) window.clearTimeout(sub);
    };
  }, [phase, visible, reduced]);

  const isScan = phase.kind === 'scan';
  const isReconstruct = phase.kind === 'reconstruct';
  const isBald = phase.kind === 'bald';
  const isStyling = phase.kind === 'styling';
  const isResult = phase.kind === 'result';

  const scanIndex = isScan ? phase.i : 0;
  const scanStep = isScan ? SCAN_STEPS[scanIndex] : null;
  const captured = isScan ? phase.i : 4;

  const resultIndex = isResult ? phase.i : 0;
  const resultAngle = isResult ? RESULT_ANGLES[resultIndex] : RESULT_ANGLES[0];

  const photoStep = isScan
    ? scanStep
    : isReconstruct
      ? SCAN_STEPS[SCAN_STEPS.length - 1]
      : null;

  /* Tag d'état explicite en haut à droite */
  const statusBadge = isScan
    ? `Scan 3D · ${scanIndex + 1}/4`
    : isReconstruct
      ? 'Inférence FLAME/DECA…'
      : isBald
        ? 'Maillage 3D brut'
        : isStyling
          ? 'Fitting & Taille Barbe'
          : `Rendu 3D · ${resultAngle.label} (${resultIndex + 1}/4)`;

  return (
    <div className="space-y-4" aria-label="Démo automatique du Rituel du Miroir">
      {/* Cadre caméra principal */}
      <div
        ref={stageRef}
        className="relative rounded-frame overflow-hidden border border-ink/10 shadow-soft aspect-[4/3] bg-night"
      >
        {/* ══ 1. FLUX VIDÉO DU SCAN (4 angles réels) ══ */}
        {photoStep && (
          <div className={`absolute inset-0 ${photoStep.wrapClass ?? ''}`}>
            <Image
              key={`photo-${photoStep.label}`}
              src={photoStep.sample}
              alt={`Capture vidéo du scan — ${photoStep.label}`}
              fill
              sizes="(max-width: 768px) 100vw, 700px"
              className="object-cover motion-safe:animate-demo-kenburns"
              style={{ objectPosition: photoStep.objectPosition }}
            />
          </div>
        )}

        {/* ══ 2. MAILLAGE 3D BRUT RECONSTRUIT (visage identique, tête chauve) ══ */}
        {isBald && (
          <div className="absolute inset-0">
            <Image
              src="/models/hairstyles/fade_taper_low/model-1-face.png"
              alt="Reconstruction 3D — maillage brut FLAME"
              fill
              sizes="(max-width: 768px) 100vw, 700px"
              className="object-cover motion-safe:animate-demo-kenburns scale-[1.05]"
            />
          </div>
        )}

        {/* ══ 3. APPLICATION COIFFURE + RASAGE BARBE & MOUSTACHE ══ */}
        {isStyling && (
          <div className="absolute inset-0">
            <Image
              src="/models/hairstyles/fade_taper_low/model-1-face.png"
              alt="Coiffure 3D appliquée, barbe rasée et moustache taillée"
              fill
              sizes="(max-width: 768px) 100vw, 700px"
              className="object-cover motion-safe:animate-demo-kenburns scale-[1.05]"
            />
          </div>
        )}

        {/* ══ 4. RÉSULTAT FINAL VALIDÉ — INSPECTION DYNAMIQUE 360° (4 ANGLES) ══ */}
        {isResult && (
          <div className={`absolute inset-0 transition-transform duration-500 ${resultAngle.wrapClass ?? ''}`}>
            <Image
              key={`result-angle-${resultAngle.label}`}
              src={resultAngle.sample}
              alt={`Résultat 3D validé — ${resultAngle.label}`}
              fill
              sizes="(max-width: 768px) 100vw, 700px"
              className={`object-cover motion-safe:animate-demo-kenburns ${resultAngle.zoomClass ?? ''}`}
            />
          </div>
        )}

        {/* Badge "Démo automatique" */}
        <span className="absolute top-3 left-3 bg-ink/75 backdrop-blur-sm text-white text-[9px] font-bold tracking-[0.14em] uppercase px-3 py-1.5 rounded-pill z-10">
          Démo automatique
        </span>

        {/* Badge statut étape (haut droite) */}
        <span
          className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1.5 rounded-pill z-10 ${
            isResult
              ? 'bg-scan-success text-white'
              : isBald || isStyling
                ? 'bg-terracotta text-white'
                : 'bg-white/90 text-ink'
          }`}
        >
          {statusBadge}
        </span>

        {/* ══ OVALE DE GUIDAGE VIDÉO — Recadré pour englober toute la tête sans déborder ══ */}
        {scanStep && (
          <>
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none"
              aria-hidden="true"
            >
              {/* Ovale vert enveloppant : cx=50 cy=44 rx=38 ry=43 pour contenir crâne et menton */}
              <ellipse
                cx="50"
                cy="44"
                rx="38"
                ry="43"
                fill="none"
                stroke="#2E7D46"
                strokeWidth="0.8"
                className="motion-safe:animate-pulse"
                style={{ filter: 'drop-shadow(0 0 8px rgba(46,125,70,0.6))' }}
              />
              {/* Repères de cadrage dans les angles */}
              <path d="M 10 10 L 10 5 L 15 5" fill="none" stroke="#2E7D46" strokeWidth="0.6" opacity="0.6" />
              <path d="M 90 10 L 90 5 L 85 5" fill="none" stroke="#2E7D46" strokeWidth="0.6" opacity="0.6" />
              <path d="M 10 85 L 10 90 L 15 90" fill="none" stroke="#2E7D46" strokeWidth="0.6" opacity="0.6" />
              <path d="M 90 85 L 90 90 L 85 90" fill="none" stroke="#2E7D46" strokeWidth="0.6" opacity="0.6" />
            </svg>

            <div className="absolute bottom-3 left-3 right-3 flex flex-col items-center gap-2">
              <p className="bg-ink/75 backdrop-blur-sm text-white text-xs font-bold px-4 py-2 rounded-pill text-center">
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
                {scanStep.label} · {scanStep.deg} — capture vidéo automatique
              </p>
            </div>
          </>
        )}

        {/* Overlay Reconstruction FLAME/DECA */}
        {isReconstruct && (
          <div className="absolute inset-0 bg-cream/75 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-9 h-9 animate-spin text-terracotta" />
            <p className="text-sm font-bold text-ink">Inférence IA FLAME / DECA en cours…</p>
            <p className="text-xs text-ink-soft">Calcul de la géométrie 3D à partir des 4 angles</p>
          </div>
        )}

        {/* Overlay Maillage 3D Brut */}
        {isBald && (
          <div className="absolute bottom-3 left-3 right-3 flex flex-col items-center gap-2">
            <p className="bg-terracotta text-white text-xs font-bold px-4 py-2 rounded-pill inline-flex items-center gap-2 text-center shadow-soft">
              <Sparkles className="w-3.5 h-3.5" />
              1. Maillage 3D brut reconstruit (tête chauve identique)
            </p>
          </div>
        )}

        {/* Overlay Fitting Coiffure + Rasage Barbe */}
        {isStyling && (
          <div className="absolute bottom-3 left-3 right-3 flex flex-col items-center gap-2">
            <p className="bg-ink/80 backdrop-blur-sm text-white text-xs font-bold px-4 py-2 rounded-pill inline-flex items-center gap-2 text-center">
              <Scissors className="w-3.5 h-3.5 text-terracotta-pale" />
              2. Coiffure Taper Fade + Barbe rasée & Moustache taillée
            </p>
          </div>
        )}

        {/* Overlay Résultat Validé avec Zoom & Rotation Angle */}
        {isResult && (
          <div className="absolute bottom-3 left-3 right-3 flex flex-col items-center gap-2">
            <p className="bg-scan-success text-white text-xs font-bold px-4 py-2 rounded-pill inline-flex items-center gap-2 text-center shadow-soft">
              <CheckCircle2 className="w-4 h-4" />
              3. Inspection 3D — Angle {resultAngle.label} ({resultAngle.deg})
            </p>
            <div className="flex items-center gap-1.5">
              {RESULT_ANGLES.map((r, idx) => (
                <span
                  key={r.label}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === resultIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Flash de capture lors de chaque angle */}
        {!reduced && (
          <div
            key={`flash-${flashKey}`}
            aria-hidden="true"
            className="absolute inset-0 bg-white pointer-events-none motion-safe:animate-demo-flash"
          />
        )}
      </div>

      {/* Filmstrip des 4 angles capturés */}
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

      <p className="flex items-center justify-center gap-2 text-xs text-ink-soft">
        <ScanFace className="w-4 h-4 text-terracotta shrink-0" />
        Inspection 3D 360° du résultat : Face → Profil droit → Profil gauche → Nuque
      </p>
    </div>
  );
};
