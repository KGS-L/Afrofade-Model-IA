'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  RefreshCw,
  ScanFace,
  Video,
} from 'lucide-react';

/**
 * Scanner vidéo guidé (EXPERIENCE.md › scan_stage) — remplace la prise
 * de 4 photos (décision scan vidéo 2026-08-18). La caméra du navigateur
 * suit les 4 angles du pipeline ; la capture se déclenche toute seule
 * quand la scène est stable (différence de frames consécutives, en
 * attendant le tracking de pose MediaPipe côté pipeline).
 *
 * Mode démo : même guidage, progression simulée avec les visuels
 * d'exemple — utilisé quand la caméra est refusée ou indisponible.
 */

export type ScanAngleKey = 'face' | 'profil_droit' | 'profil_gauche' | 'nuque';

export interface ScanFrame {
  key: ScanAngleKey;
  /** dataURL capturée (mode caméra) ou visuel d'exemple (mode démo) */
  src: string;
  mirror?: boolean;
  demo: boolean;
}

interface AngleDef {
  key: ScanAngleKey;
  label: string;
  cue: string;
  deg: string;
  sample: string;
  mirror?: boolean;
}

/** Ordre du pipeline (AI-ML-3D-RECONSTRUCTION-PIPELINE.md §8) */
const ANGLES: AngleDef[] = [
  { key: 'face', label: 'Face', cue: 'Regardez la caméra', deg: '0°', sample: '/models/client-face.jpg' },
  { key: 'profil_droit', label: 'Profil droit', cue: 'Tournez doucement la tête vers la droite', deg: '+90°', sample: '/models/client-profil.jpg' },
  { key: 'profil_gauche', label: 'Profil gauche', cue: 'Tournez la tête vers la gauche', deg: '−90°', sample: '/models/client-profil.jpg', mirror: true },
  { key: 'nuque', label: 'Nuque', cue: 'Présentez la nuque à la caméra', deg: '180°', sample: '/models/client-arriere.jpg' },
];

/* Paramètres du moteur de stabilité */
const TICK_MS = 200;
const STABLE_REQUIRED_MS = 1200;
const ANGLE_MIN_ELAPSED_MS = 1500;
const DEMO_CAPTURE_MS = 2600;
const DIFF_THRESHOLD = 9;

type Phase = 'idle' | 'live' | 'done';
type Mode = 'camera' | 'demo';

export const GuidedScanner: React.FC<{ onComplete: (frames: ScanFrame[]) => void }> = ({
  onComplete,
}) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [mode, setMode] = useState<Mode>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [angleIndex, setAngleIndex] = useState(0);
  const [frames, setFrames] = useState<ScanFrame[]>([]);
  const [stability, setStability] = useState(0); // 0..1
  const [flash, setFlash] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevLumaRef = useRef<Uint8ClampedArray | null>(null);
  const stableMsRef = useRef(0);
  const angleStartRef = useRef(0);
  const framesRef = useRef<ScanFrame[]>([]);
  const modeRef = useRef<Mode>('camera');
  const angleIndexRef = useRef(0);
  const completedRef = useRef(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  const captureCurrentAngle = useCallback(() => {
    const angle = ANGLES[angleIndexRef.current];
    let src = angle.sample;
    let demo = true;

    if (modeRef.current === 'camera' && videoRef.current && videoRef.current.videoWidth > 0) {
      const video = videoRef.current;
      const scale = Math.min(1, 720 / video.videoWidth);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Miroir : la capture correspond au flux auto-visualisé
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        src = canvas.toDataURL('image/jpeg', 0.88);
        demo = false;
      }
    }

    const frame: ScanFrame = { key: angle.key, src, mirror: angle.mirror, demo };
    const next = [...framesRef.current, frame];
    framesRef.current = next;
    setFrames(next);
    setFlash(true);
    window.setTimeout(() => setFlash(false), 380);

    if (angleIndexRef.current < ANGLES.length - 1) {
      angleIndexRef.current += 1;
      setAngleIndex(angleIndexRef.current);
      stableMsRef.current = 0;
      prevLumaRef.current = null;
      angleStartRef.current = Date.now();
      setStability(0);
    } else {
      setPhase('done');
      stopStream();
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete(next);
      }
    }
  }, [onComplete, stopStream]);

  /* Moteur : tick de stabilité (mode caméra) ou progression simulée (démo) */
  useEffect(() => {
    if (phase !== 'live') return;
    angleStartRef.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - angleStartRef.current;

      if (modeRef.current === 'demo') {
        const p = Math.min(1, elapsed / DEMO_CAPTURE_MS);
        setStability(p);
        if (p >= 1) captureCurrentAngle();
        return;
      }

      const video = videoRef.current;
      if (!video || video.videoWidth === 0 || !sampleCanvasRef.current) return;

      if (!sampleCanvasRef.current.width) {
        sampleCanvasRef.current.width = 48;
        sampleCanvasRef.current.height = 48;
      }
      const ctx = sampleCanvasRef.current.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, 48, 48);
      const { data } = ctx.getImageData(0, 0, 48, 48);
      const luma = new Uint8ClampedArray(48 * 48);
      for (let i = 0; i < luma.length; i++) {
        luma[i] = (data[i * 4] * 299 + data[i * 4 + 1] * 587 + data[i * 4 + 2] * 114) / 1000;
      }

      const prev = prevLumaRef.current;
      if (prev) {
        let diff = 0;
        for (let i = 0; i < luma.length; i++) diff += Math.abs(luma[i] - prev[i]);
        diff /= luma.length;
        if (diff < DIFF_THRESHOLD) stableMsRef.current += TICK_MS;
        else stableMsRef.current = 0;
      }
      prevLumaRef.current = luma;

      const stableP = Math.min(1, stableMsRef.current / STABLE_REQUIRED_MS);
      const readyP = Math.min(1, elapsed / ANGLE_MIN_ELAPSED_MS);
      const p = Math.min(stableP, readyP);
      setStability(p);
      if (stableP >= 1 && readyP >= 1) captureCurrentAngle();
    };

    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, [phase, captureCurrentAngle]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      modeRef.current = 'camera';
      setMode('camera');
      resetProgress();
      setPhase('live');
      // laisse le <video> se monter avant l'attachement du flux
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
      }, 0);
    } catch {
      setCameraError(
        'Caméra inaccessible ou permission refusée. Vous pouvez réessayer, ou lancer le mode démo pour découvrir le déroulé du scan.'
      );
    }
  };

  const startDemo = () => {
    setCameraError(null);
    modeRef.current = 'demo';
    setMode('demo');
    resetProgress();
    setPhase('live');
  };

  const resetProgress = () => {
    framesRef.current = [];
    setFrames([]);
    angleIndexRef.current = 0;
    setAngleIndex(0);
    stableMsRef.current = 0;
    prevLumaRef.current = null;
    completedRef.current = false;
    setStability(0);
  };

  const restart = () => {
    stopStream();
    setPhase('idle');
    setCameraError(null);
    resetProgress();
  };

  const angle = ANGLES[angleIndex];
  const pct = Math.round(stability * 100);

  /* ------------------------- Écran d'accueil ------------------------- */
  if (phase === 'idle') {
    return (
      <div className="rounded-card border border-ink/10 bg-card shadow-soft p-6 sm:p-8 space-y-5 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-terracotta-wash border border-terracotta/30 flex items-center justify-center text-terracotta">
          <ScanFace className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="font-display text-xl">Prêt pour le scan guidé</h2>
          <p className="text-sm text-ink-soft max-w-sm mx-auto leading-relaxed">
            La caméra vous guide : face, profil droit, profil gauche puis nuque.
            Chaque angle est capturé <strong>automatiquement</strong> — vous n'avez
            rien à toucher.
          </p>
        </div>
        <button
          type="button"
          onClick={startCamera}
          className="w-full min-h-[52px] rounded-pill bg-terracotta hover:bg-terracotta-dark text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-soft transition-colors"
        >
          <Camera className="w-4 h-4" />
          Activer la caméra
        </button>
        <button
          type="button"
          onClick={startDemo}
          className="w-full min-h-[44px] rounded-pill border-[1.5px] border-ink/15 hover:border-terracotta/50 hover:bg-terracotta-wash/50 text-ink font-bold text-xs inline-flex items-center justify-center gap-2 transition-colors"
        >
          <Video className="w-4 h-4 text-terracotta" />
          Continuer sans caméra — mode démo
        </button>
        {cameraError && (
          <p role="alert" className="text-xs text-ink-soft bg-terracotta-wash border border-terracotta/30 rounded-input px-4 py-3 leading-relaxed">
            {cameraError}
          </p>
        )}
        <p className="text-[11px] text-ink-soft leading-relaxed max-w-sm mx-auto">
          Les images capturées restent dans un espace isolé et sont supprimées
          une fois l'avatar généré.
        </p>
      </div>
    );
  }

  /* ---------------------- Résumé après capture ----------------------- */
  if (phase === 'done') {
    return (
      <div className="rounded-card border border-ink/10 bg-card shadow-soft p-6 space-y-4" aria-live="polite">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-scan-success/10 border border-scan-success/40 text-scan-success flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </span>
          <div>
            <p className="font-display text-lg leading-tight">Scan terminé — 4 angles validés</p>
            <p className="text-xs text-ink-soft">
              {frames.every((f) => f.demo)
                ? 'Mode démo : visuels d\'exemple.'
                : 'Captures prêtes pour la reconstruction 3D.'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {ANGLES.map((a) => {
            const f = frames.find((fr) => fr.key === a.key);
            return (
              <div key={a.key} className="relative aspect-square rounded-frame overflow-hidden border border-ink/10 bg-cream">
                {f && (
                  // eslint-disable-next-line @next/next/no-img-element -- dataURL de capture caméra
                  <img
                    src={f.src}
                    alt={`Capture validée — ${a.label}`}
                    className={`w-full h-full object-cover ${a.mirror ? 'scale-x-[-1]' : ''}`}
                  />
                )}
                <span className="absolute bottom-1 left-1 right-1 bg-ink/85 rounded px-1 py-0.5 text-[9px] font-bold text-white text-center truncate">
                  {a.label} ✓
                </span>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={restart}
          className="min-h-[44px] px-5 rounded-pill border-[1.5px] border-ink/15 hover:border-terracotta/50 text-xs font-bold inline-flex items-center gap-2 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refaire le scan
        </button>
      </div>
    );
  }

  /* -------------------------- Scanner live --------------------------- */
  return (
    <div className="space-y-4">
      <div className="relative rounded-frame overflow-hidden border border-ink/10 shadow-soft bg-night aspect-[4/3]">
        {mode === 'camera' ? (
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_35%_25%,#4A3A2E_0%,#2A211B_65%,#1F1B17_100%)] flex items-center justify-center">
            <div className="text-center space-y-2 px-6">
              <Video className="w-8 h-8 text-white/50 mx-auto" />
              <p className="text-xs font-bold text-white/85">Mode démo — scan simulé</p>
              <p className="text-[10px] text-white/55 leading-relaxed max-w-[220px]">
                Sur tablette, la caméra remplacera cet écran et capturera vos
                angles en direct.
              </p>
            </div>
          </div>
        )}

        {/* Ovale de cadrage */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
          aria-hidden="true"
        >
          <ellipse
            cx="50"
            cy="48"
            rx="26"
            ry="36"
            fill="none"
            stroke="#2E7D46"
            strokeWidth="0.9"
            className="motion-safe:animate-pulse"
            style={{ filter: 'drop-shadow(0 0 6px rgba(46,125,70,0.55))' }}
          />
        </svg>

        {/* Bandeau angle + consigne */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="bg-ink/70 backdrop-blur-sm text-white text-[10px] font-bold tracking-[0.1em] uppercase px-3 py-1.5 rounded-pill">
            {angle.label} · {angle.deg}
          </span>
          <span className="bg-ink/70 backdrop-blur-sm text-white/80 text-[10px] font-bold px-2.5 py-1.5 rounded-pill">
            {angleIndex + 1}/4
          </span>
        </div>

        {mode === 'demo' && (
          <span className="absolute top-3 right-3 bg-white/90 text-ink text-[9px] font-bold tracking-[0.14em] uppercase px-2.5 py-1.5 rounded-pill">
            Démo
          </span>
        )}

        <div className="absolute bottom-3 left-3 right-3 flex flex-col items-center gap-2">
          <p aria-live="polite" className="bg-ink/70 backdrop-blur-sm text-white text-xs font-bold px-4 py-2 rounded-pill text-center">
            {stability > 0.15 ? angle.cue : `${angle.cue} — restez stable…`}
          </p>
          <div className="w-full max-w-[280px] h-1.5 bg-white/25 rounded-pill overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Stabilité de l'angle ${angle.label}`}>
            <div
              className="h-full bg-scan-success transition-[width] duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] font-bold text-white/70">
            Capture automatique à 100 % — ne touchez à rien
          </p>
        </div>

        {/* Flash de capture */}
        <div
          aria-hidden="true"
          className={`absolute inset-0 bg-white transition-opacity duration-300 pointer-events-none ${
            flash ? 'opacity-80' : 'opacity-0'
          }`}
        />
      </div>

      {/* Filmstrip des angles */}
      <div className="grid grid-cols-4 gap-2">
        {ANGLES.map((a, i) => {
          const f = frames.find((fr) => fr.key === a.key);
          const isNext = i === angleIndex && !f;
          return (
            <div
              key={a.key}
              className={`relative aspect-video rounded-frame overflow-hidden border bg-cream ${
                f ? 'border-scan-success/60' : isNext ? 'border-terracotta/70 ring-2 ring-terracotta/25' : 'border-ink/10'
              }`}
            >
              {f ? (
                // eslint-disable-next-line @next/next/no-img-element -- dataURL de capture caméra
                <img
                  src={f.src}
                  alt={`Capture validée — ${a.label}`}
                  className={`w-full h-full object-cover ${a.mirror ? 'scale-x-[-1]' : ''}`}
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-ink-soft">
                  {a.label}
                </span>
              )}
              {f && (
                <span className="absolute top-1 right-1 bg-scan-success text-white rounded-full p-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                </span>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={restart}
        className="min-h-[44px] w-full rounded-pill border-[1.5px] border-ink/15 hover:border-terracotta/50 text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors"
      >
        <CameraOff className="w-3.5 h-3.5" />
        Arrêter et recommencer
      </button>
    </div>
  );
};
