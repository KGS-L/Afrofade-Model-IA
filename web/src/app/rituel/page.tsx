'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  Scissors,
  Upload,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Lock,
  Download,
  Check,
  CheckCircle2,
  Sparkles,
  PartyPopper,
  Chrome,
  Mail,
  KeyRound,
  BadgePercent,
} from 'lucide-react';
import { HeadModel } from '@/components/HeadModel3D';
import { HAIRSTYLES_DATA } from '@/components/HairstyleCatalog';
import { PLANS, PlanName, formatFcfa, isProfileComplete, monthlyPrice, TERMS, TermId } from '@/lib/plans';
import { useAuth } from '@/lib/auth';

/* ------------------------------------------------------------------ */
/* Wizard « Tester le rituel 1mn » — 4 étapes + gating freemium        */
/*                                                                     */
/* 1. Dépôt des 4 photos (face, profils G/D, arrière)                  */
/* 2. Création de l'avatar 3D réaliste — flouté pour les visiteurs     */
/* 3. Choix de la coiffure appliquée à l'avatar                        */
/* 4. Finition — rendu final non modifiable : connexion (Google ou     */
/*    e-mail + OTP) puis premier abonnement (remises si profil 100 %), */
/*    puis dévoilement + téléchargement PNG.                           */
/* ------------------------------------------------------------------ */

type Step = 1 | 2 | 3 | 4;
type AngleKey = 'face' | 'profil_gauche' | 'profil_droit' | 'arriere';

const SAMPLE_PHOTOS: Record<AngleKey, { src: string; mirror?: boolean }> = {
  face: { src: '/models/client-face.jpg' },
  profil_gauche: { src: '/models/client-profil.jpg', mirror: true },
  profil_droit: { src: '/models/client-profil.jpg' },
  arriere: { src: '/models/client-arriere.jpg' },
};

const SLOTS: { key: AngleKey; label: string; desc: string }[] = [
  { key: 'face', label: 'Face', desc: 'Regard vers l’objectif' },
  { key: 'profil_gauche', label: 'Profil gauche', desc: 'Côté gauche du visage' },
  { key: 'profil_droit', label: 'Profil droit', desc: 'Côté droit du visage' },
  { key: 'arriere', label: 'Arrière', desc: 'Nuque & ligne arrière' },
];

const STEPS = [
  { n: 1, label: 'Photos' },
  { n: 2, label: 'Avatar 3D' },
  { n: 3, label: 'Coiffure' },
  { n: 4, label: 'Finition' },
];

const REQUIREMENTS = [
  'Tête entière visible',
  'Photo nette, lumière naturelle',
  'Visage dégagé',
];

/** Canvas d'avatar interactif partagé par les étapes 2-4. */
const AvatarCanvas: React.FC<{
  hairstyleId: string;
  hairstyleColor: string;
  autoRotate: boolean;
  locked: boolean;
  className?: string;
}> = ({ hairstyleId, hairstyleColor, autoRotate, locked, className = '' }) => (
  <div className={`relative ${className}`}>
    <div
      className={`absolute inset-0 ${locked ? 'blur-[16px] scale-[1.02] select-none' : ''}`}
      aria-hidden={locked}
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 1.1, 3.3], fov: 42 }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      >
        <ambientLight intensity={0.65} />
        <directionalLight position={[4, 6, 4]} intensity={1.4} color="#fff1e0" />
        <directionalLight position={[-4, 2, 2]} intensity={0.45} color="#F3D9C8" />
        <directionalLight position={[0, 4, -6]} intensity={0.9} color="#ffffff" />
        <HeadModel
          hairstyleId={hairstyleId}
          hairstyleColor={hairstyleColor}
          lineUpCutoff={50}
          isAutoRotate={autoRotate}
        />
        {!locked && (
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            minDistance={2.4}
            maxDistance={4.2}
            target={[0, 0.7, 0]}
            maxPolarAngle={Math.PI / 2 + 0.15}
          />
        )}
      </Canvas>
    </div>

    {locked && (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-6">
        <div className="w-14 h-14 rounded-full bg-card border border-terracotta/40 shadow-soft flex items-center justify-center text-terracotta">
          <Lock className="w-6 h-6" />
        </div>
        <p className="font-display text-lg text-ink">Avatar verrouillé</p>
        <p className="text-xs text-ink-soft max-w-[240px] leading-relaxed">
          Continuez le rituel — créez votre compte à la fin pour dévoiler
          votre rendu en HD.
        </p>
      </div>
    )}
  </div>
);

export default function RituelPage() {
  const { user, loginWithEmail, loginWithGoogle, subscribe } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [photos, setPhotos] = useState<Record<AngleKey, boolean>>({
    face: false,
    profil_gauche: false,
    profil_droit: false,
    arriere: false,
  });
  const [processing, setProcessing] = useState(false);
  const [styleId, setStyleId] = useState<string>(HAIRSTYLES_DATA[0].id);
  const [finalReady, setFinalReady] = useState(false);

  // Connexion du mur (étape 4) : Google ou e-mail + OTP (démo : 123456)
  const [authMode, setAuthMode] = useState<'choix' | 'otp'>('choix');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [busy, setBusy] = useState(false);
  const [term, setTerm] = useState<TermId>('mensuel');

  const viewportRef = useRef<HTMLDivElement>(null);

  const revealed = Boolean(user?.subscription);

  const allPhotos = Object.values(photos).every(Boolean);
  const selectedStyle =
    HAIRSTYLES_DATA.find((h) => h.id === styleId) || HAIRSTYLES_DATA[0];

  const goStep2 = async () => {
    if (!allPhotos) return;
    setStep(2);
    setProcessing(true);
    try {
      const { trigger3DReconstruction } = await import('@/lib/inference');
      await trigger3DReconstruction([
        SAMPLE_PHOTOS.face.src,
        SAMPLE_PHOTOS.profil_gauche.src,
        SAMPLE_PHOTOS.profil_droit.src,
        SAMPLE_PHOTOS.arriere.src,
      ]);
    } catch {
      /* ignore fallback handled inside trigger3DReconstruction */
    } finally {
      setProcessing(false);
    }
  };

  const goStep4 = () => {
    setStep(4);
    setFinalReady(false);
    window.setTimeout(() => setFinalReady(true), 1800);
  };

  const reset = () => {
    setStep(1);
    setPhotos({ face: false, profil_gauche: false, profil_droit: false, arriere: false });
    setProcessing(false);
    setFinalReady(false);
    setAuthMode('choix');
    setOtp(['', '', '', '', '', '']);
  };

  const handleDownload = () => {
    const canvas = viewportRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = (canvas as HTMLCanvasElement).toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'afrofade-rendu-3d.png';
    a.click();
  };

  const onDigit = (i: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setOtp((prev) => prev.map((d, idx) => (idx === i ? digit : d)));
  };

  const wallGoogle = () => {
    setBusy(true);
    window.setTimeout(() => {
      loginWithGoogle();
      setBusy(false);
    }, 1100);
  };

  const wallOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.every((d) => d !== '')) return;
    setBusy(true);
    window.setTimeout(() => {
      loginWithEmail(email);
      setBusy(false);
    }, 900);
  };

  const eligible = Boolean(user && isProfileComplete(user.profile) && !user.everSubscribed);
  const activeTerm = TERMS.find((t) => t.id === term) ?? TERMS[0];

  return (
    <div className="min-h-screen bg-cream text-ink flex flex-col">
      {/* En-tête minimal — logo, progression, retour */}
      <header className="border-b border-ink/10">
        <div className="max-w-container mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            aria-label="Afrofade — retour à l’accueil"
          >
            <div className="w-9 h-9 rounded-card bg-terracotta flex items-center justify-center">
              <Scissors className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <span className="font-display text-lg tracking-tight">
              Afro<span className="text-terracotta">fade</span>
            </span>
          </Link>

          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-terracotta bg-terracotta-wash px-3 py-1.5 rounded-pill">
            <Sparkles className="w-3.5 h-3.5" />
            Étape {step} sur 4 — {STEPS[step - 1].label}
          </span>

          <Link
            href="/"
            className="min-h-[44px] inline-flex items-center gap-2 text-sm font-medium text-ink-soft hover:text-terracotta transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 py-10 md:py-14">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Stepper 1-4 */}
          <ol className="flex items-center" aria-label="Progression du rituel">
            {STEPS.map((s, i) => {
              const done = step > s.n;
              const current = step === s.n;
              return (
                <li key={s.n} className="flex-1 flex items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <span
                      aria-current={current ? 'step' : undefined}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        done
                          ? 'bg-terracotta text-white'
                          : current
                            ? 'bg-terracotta text-white ring-4 ring-terracotta/20'
                            : 'bg-ink/10 text-ink-soft'
                      }`}
                    >
                      {done ? <Check className="w-4 h-4 stroke-[3]" /> : s.n}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-[0.08em] ${
                        current ? 'text-terracotta' : 'text-ink-soft'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <span
                      className={`flex-1 h-0.5 mx-2 mb-5 rounded ${
                        step > s.n ? 'bg-terracotta' : 'bg-ink/10'
                      }`}
                    />
                  )}
                </li>
              );
            })}
          </ol>

          {/* ---------------- ÉTAPE 1 — Photos ---------------- */}
          {step === 1 && (
            <section aria-label="Étape 1 — dépôt des photos" className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="font-display text-2xl sm:text-3xl">
                  Ajoutez les 4 photos
                </h1>
                <p className="text-sm text-ink-soft max-w-md mx-auto">
                  Face, profil gauche, profil droit et arrière — c’est tout ce
                  qu’il faut pour votre avatar 3D.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SLOTS.map((slot) => {
                  const has = photos[slot.key];
                  const sample = SAMPLE_PHOTOS[slot.key];
                  return (
                    <button
                      type="button"
                      key={slot.key}
                      onClick={() =>
                        setPhotos((prev) => ({ ...prev, [slot.key]: true }))
                      }
                      aria-label={
                        has
                          ? `Photo ${slot.label} ajoutée — toucher pour reprendre`
                          : `Ajouter la photo ${slot.label}`
                      }
                      className={`group relative h-40 rounded-frame border-2 border-dashed flex flex-col items-center justify-center p-2 cursor-pointer transition-all overflow-hidden ${
                        has
                          ? 'border-terracotta bg-card shadow-soft'
                          : 'border-terracotta/60 bg-card hover:bg-terracotta-wash'
                      }`}
                    >
                      {has ? (
                        <>
                          <Image
                            src={sample.src}
                            alt={`Photo — ${slot.label}`}
                            fill
                            sizes="(max-width: 640px) 50vw, 150px"
                            className={`object-cover ${sample.mirror ? 'scale-x-[-1]' : ''}`}
                          />
                          <span className="absolute top-2 right-2 bg-terracotta text-white rounded-full p-1 shadow-soft">
                            <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                          <span className="absolute bottom-2 left-2 right-2 bg-ink/85 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] text-center font-bold text-white">
                            {slot.label} ✓
                          </span>
                        </>
                      ) : (
                        <div className="text-center space-y-1.5 p-2">
                          <div className="w-8 h-8 rounded-full bg-terracotta-wash border border-terracotta/30 flex items-center justify-center mx-auto text-terracotta group-hover:bg-terracotta group-hover:text-white transition-colors">
                            <Upload className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold block">{slot.label}</span>
                          <span className="text-[9px] text-ink-soft block leading-tight">
                            {slot.desc}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <ul className="grid sm:grid-cols-3 gap-3">
                {REQUIREMENTS.map((req) => (
                  <li
                    key={req}
                    className="flex items-center gap-2 bg-card border border-ink/10 rounded-pill px-4 py-3 text-xs font-medium"
                  >
                    <CheckCircle2 className="w-4 h-4 text-terracotta shrink-0" />
                    {req}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={!allPhotos}
                onClick={goStep2}
                className={`w-full min-h-[52px] rounded-pill font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors ${
                  allPhotos
                    ? 'bg-terracotta hover:bg-terracotta-dark text-white shadow-soft'
                    : 'bg-ink/10 text-ink-soft/70 cursor-not-allowed border border-ink/10'
                }`}
              >
                Créer mon avatar 3D
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-center text-[11px] leading-relaxed text-ink-soft max-w-md mx-auto">
                En continuant, vos photos sont temporairement stockées dans un
                espace isolé, puis supprimées une fois l’avatar généré.
              </p>
            </section>
          )}

          {/* ---------------- ÉTAPE 2 — Avatar 3D ---------------- */}
          {step === 2 && (
            <section aria-label="Étape 2 — création de l'avatar 3D" className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="font-display text-2xl sm:text-3xl">
                  Création de votre avatar 3D
                </h1>
                <p className="text-sm text-ink-soft max-w-md mx-auto">
                  Notre IA reconstruit les volumes du crâne et la ligne
                  d’implantation à partir de vos 4 photos.
                </p>
              </div>

              {processing ? (
                <div
                  aria-live="polite"
                  className="w-full min-h-[340px] rounded-card border border-ink/10 bg-card shadow-soft flex flex-col items-center justify-center gap-4 p-8 text-center"
                >
                  <RefreshCw className="w-10 h-10 animate-spin text-terracotta" />
                  <p className="text-base font-bold">Analyse IA — reconstruction en cours…</p>
                  <p className="text-xs text-ink-soft">
                    Assemblage des 4 angles, quelques secondes.
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-card border border-ink/10 bg-card shadow-soft overflow-hidden">
                    <AvatarCanvas
                      hairstyleId="bald"
                      hairstyleColor="#1a110b"
                      autoRotate
                      locked={!revealed}
                      className="h-[340px] bg-[radial-gradient(120%_120%_at_30%_20%,#EFE0D6_0%,#DDBFAE_60%,#C7816F_140%)]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="w-full min-h-[52px] rounded-pill bg-terracotta hover:bg-terracotta-dark text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-soft transition-colors"
                  >
                    Choisir ma coiffure
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </section>
          )}

          {/* ---------------- ÉTAPE 3 — Coiffure ---------------- */}
          {step === 3 && (
            <section aria-label="Étape 3 — choix de la coiffure" className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="font-display text-2xl sm:text-3xl">
                  Choisissez votre coiffure
                </h1>
                <p className="text-sm text-ink-soft max-w-md mx-auto">
                  Touchez un style : il s’applique instantanément à votre
                  avatar.
                </p>
              </div>

              <div className="rounded-card border border-ink/10 bg-card shadow-soft overflow-hidden">
                <AvatarCanvas
                  hairstyleId={selectedStyle.id}
                  hairstyleColor={selectedStyle.color}
                  autoRotate={false}
                  locked={!revealed}
                  className="h-[300px] bg-[radial-gradient(120%_120%_at_30%_20%,#EFE0D6_0%,#DDBFAE_60%,#C7816F_140%)]"
                />
              </div>

              <div role="radiogroup" aria-label="Styles de coiffure" className="grid grid-cols-2 gap-3">
                {HAIRSTYLES_DATA.map((item) => {
                  const active = item.id === styleId;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      role="radio"
                      aria-checked={active}
                      onClick={() => setStyleId(item.id)}
                      className={`min-h-[64px] rounded-card border p-3 text-left transition-all ${
                        active
                          ? 'border-terracotta bg-terracotta-wash ring-2 ring-terracotta/30'
                          : 'border-ink/10 bg-card hover:border-terracotta/50'
                      }`}
                    >
                      <span className="flex items-center gap-2 text-[13px] font-bold">
                        {active && <Check className="w-4 h-4 text-terracotta stroke-[3]" />}
                        {item.title}
                        {item.isPremium && (
                          <span className="text-[9px] bg-terracotta text-white font-bold px-1.5 py-0.5 rounded">
                            VIP
                          </span>
                        )}
                      </span>
                      <span className="block text-[10px] text-ink-soft mt-1 leading-tight">
                        {item.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedStyle.isPremium && (
                <div className="rounded-card border border-terracotta/30 bg-terracotta-wash p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-terracotta-dark">
                    <Sparkles className="w-4 h-4" />
                    <span>Option VIP Sélectionnée : Contours Rasoir & Soin Huile (+2 500 FCFA)</span>
                  </div>
                  <p className="text-xs text-ink-soft">
                    Cette prestation comprend un traçage haute précision à la lame et un massage hydratant du cuir chevelu.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={goStep4}
                className="w-full min-h-[52px] rounded-pill bg-terracotta hover:bg-terracotta-dark text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-soft transition-colors"
              >
                Finaliser mon rendu
                <ArrowRight className="w-4 h-4" />
              </button>
            </section>
          )}

          {/* ---------------- ÉTAPE 4 — Finition ---------------- */}
          {step === 4 && (
            <section aria-label="Étape 4 — finition" className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="font-display text-2xl sm:text-3xl">Finition</h1>
                <p className="text-sm text-ink-soft max-w-md mx-auto">
                  Votre rendu final est figé — plus aucune modification, juste
                  le résultat.
                </p>
              </div>

              {!finalReady ? (
                <div
                  aria-live="polite"
                  className="w-full min-h-[340px] rounded-card border border-ink/10 bg-card shadow-soft flex flex-col items-center justify-center gap-4 p-8 text-center"
                >
                  <RefreshCw className="w-10 h-10 animate-spin text-terracotta" />
                  <p className="text-base font-bold">Finition du rendu…</p>
                  <p className="text-xs text-ink-soft">
                    Contours adoucis, lumière studio, export HD.
                  </p>
                </div>
              ) : revealed ? (
                <>
                  <div
                    ref={viewportRef}
                    className="rounded-card border border-terracotta/40 bg-card shadow-soft overflow-hidden"
                  >
                    <AvatarCanvas
                      hairstyleId={selectedStyle.id}
                      hairstyleColor={selectedStyle.color}
                      autoRotate
                      locked={false}
                      className="h-[380px] bg-[radial-gradient(120%_120%_at_30%_20%,#EFE0D6_0%,#DDBFAE_60%,#C7816F_140%)]"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="flex-1 min-h-[52px] rounded-pill bg-terracotta hover:bg-terracotta-dark text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-soft transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Télécharger mon rendu
                    </button>
                    <button
                      type="button"
                      onClick={reset}
                      className="min-h-[52px] px-6 rounded-pill bg-transparent border-[1.5px] border-ink/20 hover:border-terracotta/50 font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Recommencer
                    </button>
                  </div>
                </>
              ) : !user ? (
                /* Mur de connexion : Google ou e-mail + code OTP */
                <div className="rounded-card border border-ink/10 bg-card shadow-soft p-6 sm:p-8 space-y-6">
                  <div className="text-center space-y-2">
                    <div className="w-14 h-14 mx-auto rounded-full bg-terracotta-wash border border-terracotta/40 flex items-center justify-center text-terracotta">
                      <PartyPopper className="w-6 h-6" />
                    </div>
                    <h2 className="font-display text-xl sm:text-2xl">
                      Votre rendu est prêt !
                    </h2>
                    <p className="text-sm text-ink-soft max-w-sm mx-auto">
                      Connectez-vous pour dévoiler votre avatar{' '}
                      {selectedStyle.title.toLowerCase()} en HD et le
                      télécharger.
                    </p>
                  </div>

                  {authMode === 'choix' ? (
                    <div className="space-y-4">
                      <button
                        type="button"
                        onClick={wallGoogle}
                        disabled={busy}
                        className="w-full min-h-[52px] rounded-pill border-[1.5px] border-ink/15 bg-cream hover:bg-terracotta-wash font-bold text-sm inline-flex items-center justify-center gap-3 transition-colors disabled:opacity-60"
                      >
                        <Chrome className="w-5 h-5 text-terracotta" />
                        {busy ? 'Connexion Google…' : 'Continuer avec Google'}
                      </button>

                      <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                        <span className="flex-1 h-px bg-ink/10" />
                        ou par e-mail
                        <span className="flex-1 h-px bg-ink/10" />
                      </div>

                      <div className="flex items-center gap-2 min-h-[48px] border border-ink/15 rounded-input bg-cream px-4 focus-within:border-terracotta">
                        <Mail className="w-4 h-4 text-ink-soft shrink-0" />
                        <input
                          type="email"
                          aria-label="Votre e-mail"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="vous@salon.com"
                          className="w-full bg-transparent text-sm focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => email.includes('@') && setAuthMode('otp')}
                          disabled={!email.includes('@')}
                          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-terracotta hover:underline disabled:opacity-40"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          Code OTP
                        </button>
                      </div>

                      <p className="text-center text-[10px] text-ink-soft">
                        Démo : OTP fictif <strong>123456</strong> · Google OAuth
                        réel avec Supabase Auth.{' '}
                        <Link href="/connexion" className="text-terracotta underline underline-offset-2">
                          Page de connexion complète
                        </Link>
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={wallOtp} className="space-y-4">
                      <p className="text-center text-xs text-ink-soft">
                        Code envoyé à <strong className="text-ink">{email}</strong> —
                        démo : <strong>123456</strong>
                      </p>
                      <div className="flex justify-center gap-2" role="group" aria-label="Code OTP">
                        {otp.map((digit, i) => (
                          <input
                            key={i}
                            type="text"
                            inputMode="numeric"
                            aria-label={`Chiffre ${i + 1}`}
                            value={digit}
                            onChange={(e) => onDigit(i, e.target.value)}
                            className="w-10 h-11 text-center text-base font-bold rounded-input border border-ink/15 bg-cream focus:outline-none focus:border-terracotta"
                          />
                        ))}
                      </div>
                      <button
                        type="submit"
                        disabled={busy || !otp.every((d) => d !== '')}
                        className="w-full min-h-[52px] rounded-pill bg-terracotta hover:bg-terracotta-dark text-white font-bold text-sm shadow-soft transition-colors disabled:opacity-60"
                      >
                        Vérifier et dévoiler mon rendu
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthMode('choix')}
                        className="w-full text-center text-xs font-medium text-terracotta hover:underline"
                      >
                        ← Changer de méthode
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                /* Connecté, pas encore abonné : premier abonnement */
                <div className="rounded-card border border-ink/10 bg-card shadow-soft p-6 sm:p-8 space-y-5">
                  <div className="text-center space-y-2">
                    <h2 className="font-display text-xl sm:text-2xl">
                      Plus qu’une étape
                    </h2>
                    <p className="text-sm text-ink-soft max-w-sm mx-auto">
                      Choisissez votre abonnement pour dévoiler votre rendu et
                      le télécharger.
                    </p>
                  </div>

                  {eligible && (
                    <div role="radiogroup" aria-label="Durée d'engagement" className="grid grid-cols-3 gap-3">
                      {TERMS.filter((t) => t.discount > 0).map((t) => (
                        <button
                          type="button"
                          key={t.id}
                          role="radio"
                          aria-checked={term === t.id}
                          onClick={() => setTerm(t.id)}
                          className={`rounded-card border p-3 text-center transition-all ${
                            term === t.id
                              ? 'border-terracotta bg-terracotta-wash ring-2 ring-terracotta/30'
                              : 'border-ink/10 bg-cream hover:border-terracotta/50'
                          }`}
                        >
                          <span className="block text-xs font-bold">{t.label}</span>
                          <span className="block text-[11px] font-bold text-terracotta mt-0.5">
                            {t.hint}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="space-y-3">
                    {PLANS.map((plan) => {
                      const price = monthlyPrice(plan.amount, eligible ? activeTerm.discount : 0);
                      const discounted = eligible && activeTerm.discount > 0;
                      return (
                        <button
                          type="button"
                          key={plan.name}
                          onClick={() => subscribe(plan.name as PlanName, plan.amount, eligible ? activeTerm.id : 'mensuel')}
                          className={`w-full text-left rounded-card border p-4 transition-all hover:border-terracotta/60 flex items-center justify-between gap-3 ${
                            plan.popular ? 'border-terracotta bg-terracotta-wash ring-1 ring-terracotta/30' : 'border-ink/10 bg-cream'
                          }`}
                        >
                          <span>
                            <span className="flex items-center gap-2 text-sm font-bold">
                              {plan.name}
                              {discounted && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white bg-terracotta px-2 py-0.5 rounded-pill">
                                  <BadgePercent className="w-3 h-3" />
                                  −{Math.round(activeTerm.discount * 100)} %
                                </span>
                              )}
                            </span>
                            <span className="block text-xs text-ink-soft mt-1">
                              {plan.features[0]}
                            </span>
                          </span>
                          <span className="text-right shrink-0">
                            <span className="font-display text-base">{formatFcfa(price)}</span>
                            <span className="block text-[10px] text-ink-soft">FCFA/mois</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {!eligible && (
                    <p className="text-center text-[11px] text-ink-soft">
                      Astuce : complétez votre profil salon à 100 % dans{' '}
                      <Link href="/dashboard" className="text-terracotta underline underline-offset-2">
                        votre espace
                      </Link>{' '}
                      pour débloquer −10 % (3 mois), −25 % (6 mois) ou −40 % (annuel)
                      sur votre premier abonnement.
                    </p>
                  )}
                </div>
              )}
            </section>
          )}
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
