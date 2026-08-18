'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, RefreshCw, ScanFace, Wand2 } from 'lucide-react';

/**
 * Mockup vidéo auto-play — section landing « Le Rituel du Miroir »
 * (EXPERIENCE.md › demo_video_autoplay). Séquence muette en boucle qui
 * montre le Rituel complet sans aucune interaction.
 *
 * Décision Jonas-dev 2026-08-18 : pas d'avatar procédural dans la démo
 * (jugé peu réaliste) — le viseur du scan montre les photos du
 * personnage client (flux caméra simulé, léger travelling), et
 * l'essayage s'appuie sur les rendus 3D démo du hero. Poster statique
 * sous prefers-reduced-motion.
 */

const SCAN_STEPS: {
  label: string;
  cue: string;
  deg: string;
  sample: string;
  mirror?: boolean;
}[] = [
  { label: 'Face', cue: 'Regardez la caméra', deg: '0°', sample: '/models/client-face.jpg' },
  { label: 'Profil droit', cue: 'Tournez la tête vers la droite', deg: '+90°', sample: '/models/client-profil.jpg' },
  { label: 'Profil gauche', cue: 'Tournez la tête vers la gauche', deg: '−90°', sample: '/models/client-profil.jpg', mirror: true },
  { label: 'Nuque', cue: 'Présentez la nuque', deg: '180°', sample: '/models/client-arriere.jpg' },
];

const DEMO_RENDERS = [
  { src: '/models/afro_taper_fade.png', title: 'Taper fade & line-up' },
  { src: '/models/afro_dreadlocks.png', title: 'Locks sculptées' },
  { src: '/models/afro_cornrows.png', title: 'Cornrows géométriques' },
  { src: '/models/afro_beard_sculpted.png', title: 'Barbe sculptée' },
];

const SCAN_MS = 2600;
const RECONSTRUCT_MS = 2200;
const STYLE_MS = 2400;

type Phase =
  | { kind: 'scan'; i: number }
  | { kind: 'reconstruct' }
  | { kind: 'styles'; i: number };

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

  useEffect(() => {
    if (reduced) return;
    let sub: number | undefined;
    const t = window.setTimeout(() => {
      if (phase.kind === 'scan') {
        setFlashKey((k) => k + 1);
        sub = window.setTimeout(() => {
          if (phase.i < SCAN_STEPS.length - 1) setPhase({ kind: 'scan', i: phase.i + 1 });
          else setPhase({ kind: 'reconstruct' });
        }, 380);
      } else if (phase.kind === 'reconstruct') {
        setPhase({ kind: 'styles', i: 0 });
      } else if (phase.i < DEMO_RENDERS.length - 1) {
        setPhase({ kind: 'styles', i: phase.i + 1 });
      } else {
        setPhase({ kind: 'scan', i: 0 });
      }
    },
    phase.kind === 'scan' ? SCAN_MS : phase.kind === 'reconstruct' ? RECONSTRUCT_MS : STYLE_MS
    );
    return () => {
      window.clearTimeout(t);
      if (sub) window.clearTimeout(sub);
    };
  }, [phase, reduced]);

  const isScan = phase.kind === 'scan';
  const isReconstruct = phase.kind === 'reconstruct';
  const scanIndex = phase.kind === 'scan' ? phase.i : 0;
  const scanStep = isScan ? SCAN_STEPS[scanIndex] : null;
  const style = phase.kind === 'styles' ? DEMO_RENDERS[phase.i] : null;
  const captured = isScan ? phase.i : 4;
  // Pendant la reconstruction, la dernière capture (nuque) reste affichée
  // sous l'overlay d'analyse.
  const photoStep = isScan ? scanStep : isReconstruct ? SCAN_STEPS[SCAN_STEPS.length - 1] : null;

  return (
    <div className="space-y-4" aria-label="Démo automatique du Rituel du Miroir">
      {/* Scène — cadre façon caméra du scanner */}
      <div className="relative rounded-frame overflow-hidden border border-ink/10 shadow-soft aspect-[4/3] bg-night">
        {/* Flux caméra simulé — les photos du personnage client */}
        {photoStep && (
          <div className={`absolute inset-0 ${photoStep.mirror ? 'scale-x-[-1]' : ''}`}>
            <Image
              key={`photo-${photoStep.label}`}
              src={photoStep.sample}
              alt={`Flux caméra du scan guidé — ${photoStep.label}`}
              fill
              sizes="(max-width: 768px) 100vw, 700px"
              className="object-cover motion-safe:animate-demo-kenburns"
            />
          </div>
        )}

        {/* Rendus d'essayage — phase coiffures */}
        {style && (
          <div className="absolute inset-0">
            <Image
              key={`render-${style.src}`}
              src={style.src}
              alt={`Rendu 3D démo — ${style.title}`}
              fill
              sizes="(max-width: 768px) 100vw, 700px"
              className="object-cover motion-safe:animate-demo-kenburns"
            />
          </div>
        )}

        {/* Badge permanent : c'est une démo automatique */}
        <span className="absolute top-3 left-3 bg-ink/70 backdrop-blur-sm text-white text-[9px] font-bold tracking-[0.14em] uppercase px-3 py-1.5 rounded-pill z-10">
          Démo automatique — sans manipulation
        </span>

        {/* Overlays scan : ovale + consigne + progression */}
        {scanStep && (
          <>
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full pointer-events-none"
              aria-hidden="true"
            >
              <ellipse
                cx="50"
                cy="46"
                rx="25"
                ry="34"
                fill="none"
                stroke="#2E7D46"
                strokeWidth="0.9"
                className="motion-safe:animate-pulse"
                style={{ filter: 'drop-shadow(0 0 6px rgba(46,125,70,0.55))' }}
              />
            </svg>
            <span className="absolute top-3 right-3 bg-white/90 text-ink text-[10px] font-bold px-2.5 py-1.5 rounded-pill">
              Scanner guidé · {scanIndex + 1}/4
            </span>
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

        {/* Overlay reconstruction */}
        {isReconstruct && (
          <div className="absolute inset-0 bg-cream/70 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-9 h-9 animate-spin text-terracotta" />
            <p className="text-sm font-bold text-ink">Analyse IA — reconstruction 3D…</p>
            <p className="text-xs text-ink-soft">Assemblage des 4 angles capturés</p>
          </div>
        )}

        {/* Overlay essayage */}
        {style && (
          <div className="absolute bottom-3 left-3 right-3 flex flex-col items-center gap-2">
            <p className="bg-ink/70 backdrop-blur-sm text-white text-xs font-bold px-4 py-2 rounded-pill inline-flex items-center gap-2 text-center">
              <Wand2 className="w-3.5 h-3.5 text-terracotta-pale" />
              {style.title}
            </p>
            <p className="text-[10px] font-bold text-ink/70 bg-white/70 rounded-pill px-2.5 py-1">
              Essayage sur la tête 3D — en un tap
            </p>
          </div>
        )}

        {/* Flash de capture (rejoué à chaque angle) */}
        {!reduced && (
          <div
            key={`flash-${flashKey}`}
            aria-hidden="true"
            className="absolute inset-0 bg-white pointer-events-none motion-safe:animate-demo-flash"
          />
        )}
      </div>

      {/* Filmstrip des angles capturés */}
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
                <Image
                  src={s.sample}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 20vw, 110px"
                  className={`object-cover ${s.mirror ? 'scale-x-[-1]' : ''}`}
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-ink-soft">
                  {s.label}
                </span>
              )}
              {filled && (
                <span className="absolute top-1 right-1 bg-scan-success text-white rounded-full p-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="flex items-center justify-center gap-2 text-xs text-ink-soft">
        <ScanFace className="w-4 h-4 text-terracotta shrink-0" />
        {reduced
          ? 'Aperçu du Rituel : scan guidé, reconstruction 3D puis essayage de coiffures.'
          : 'Le scan, la reconstruction et l’essayage défilent en boucle — comme dans le vrai Rituel.'}
      </p>
    </div>
  );
};
