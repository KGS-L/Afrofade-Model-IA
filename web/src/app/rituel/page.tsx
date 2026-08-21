'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  Gauge,
  Lock,
  RefreshCw,
  Scissors,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { HeadModel } from '@/components/HeadModel3D';
import { HAIRSTYLES_DATA } from '@/components/HairstyleCatalog';
import { GuidedScanner, ScanFrame } from '@/components/GuidedScanner';
import { useAuth } from '@/lib/auth';
import type { ReconstructionResult } from '@/lib/inference';

type Step = 1 | 2 | 3 | 4;

type AccessState = {
  loading: boolean;
  allowed: boolean;
  message: string;
  balance?: number;
  quotaRemaining?: number;
};

const STEPS = [
  { n: 1, label: 'Scan 3D' },
  { n: 2, label: 'Avatar' },
  { n: 3, label: 'Coiffure' },
  { n: 4, label: 'Finition' },
];

function requestKey(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().replaceAll('-', '_')}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
}

const AvatarCanvas: React.FC<{
  hairstyleId: string;
  hairstyleColor: string;
  modelUrl: string;
  autoRotate?: boolean;
  canvasRef?: React.Ref<HTMLDivElement>;
}> = ({ hairstyleId, hairstyleColor, modelUrl, autoRotate = true, canvasRef }) => (
  <div ref={canvasRef} className="relative h-[380px] rounded-card overflow-hidden bg-[radial-gradient(120%_120%_at_30%_20%,#EFE0D6_0%,#DDBFAE_60%,#C7816F_140%)]">
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
        modelUrl={modelUrl}
      />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minDistance={2.4}
        maxDistance={4.2}
        target={[0, 0.7, 0]}
        maxPolarAngle={Math.PI / 2 + 0.15}
      />
    </Canvas>
  </div>
);

export default function RituelPage() {
  const { user, hydrated } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [scan, setScan] = useState<ScanFrame[] | null>(null);
  const [clientName, setClientName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [styleId, setStyleId] = useState<string>(HAIRSTYLES_DATA[0].id);
  const [result, setResult] = useState<ReconstructionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [access, setAccess] = useState<AccessState>({ loading: true, allowed: false, message: '' });
  const viewportRef = useRef<HTMLDivElement>(null);

  const selectedStyle = HAIRSTYLES_DATA.find((item) => item.id === styleId) || HAIRSTYLES_DATA[0];
  const headId = typeof result?.usage?.head_id === 'string' ? result.usage.head_id : null;

  const refreshAccess = async () => {
    if (!user) {
      setAccess({ loading: false, allowed: false, message: 'Connectez-vous pour lancer une reconstruction réelle.' });
      return;
    }
    if (user.role === 'admin') {
      setAccess({ loading: false, allowed: false, message: 'Le compte administrateur ne consomme pas le moteur de production.' });
      return;
    }

    setAccess((previous) => ({ ...previous, loading: true }));
    try {
      if (user.role === 'customer') {
        const response = await fetch('/api/account/overview', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Impossible de lire votre portefeuille.');
        const balance = Number(data.wallet?.balance || 0);
        setAccess({
          loading: false,
          allowed: balance >= 2,
          balance,
          message: balance >= 2 ? '2 crédits seront débités uniquement après une reconstruction réussie.' : 'Il faut au moins 2 crédits pour créer une tête 3D.',
        });
      } else {
        const response = await fetch('/api/salon/dashboard', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Impossible de lire votre abonnement salon.');
        const quotaRemaining = Number(data.salon?.quotaRemaining || 0);
        const subscribed = Boolean(data.subscription);
        setAccess({
          loading: false,
          allowed: subscribed && quotaRemaining > 0,
          quotaRemaining,
          message: !subscribed
            ? 'Un abonnement actif est requis pour lancer le moteur 3D.'
            : quotaRemaining > 0
              ? `Il reste ${quotaRemaining} reconstruction(s) dans votre quota.`
              : 'Votre quota de reconstructions est épuisé.',
        });
      }
    } catch (accessError) {
      setAccess({ loading: false, allowed: false, message: accessError instanceof Error ? accessError.message : 'Accès au moteur indisponible.' });
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    void refreshAccess();
  }, [hydrated, user?.id, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  const goStep2 = async () => {
    if (!scan || scan.length < 3 || !user || !access.allowed) return;
    setStep(2);
    setProcessing(true);
    setError(null);
    try {
      const { trigger3DReconstruction } = await import('@/lib/inference');
      const reconstructed = await trigger3DReconstruction(
        scan.map((frame) => frame.src),
        clientName || (user.role === 'salon' ? 'Client Salon' : user.name)
      );
      setResult(reconstructed);
      await refreshAccess();
    } catch (reconstructionError) {
      setError(reconstructionError instanceof Error ? reconstructionError.message : 'La reconstruction 3D a échoué.');
      await refreshAccess();
    } finally {
      setProcessing(false);
    }
  };

  const reset = async () => {
    setStep(1);
    setScan(null);
    setResult(null);
    setError(null);
    setStyleId(HAIRSTYLES_DATA[0].id);
    await refreshAccess();
  };

  const handleDownload = async () => {
    if (!result || !viewportRef.current) return;
    setDownloading(true);
    setError(null);
    try {
      if (user?.role === 'customer') {
        if (!headId) throw new Error('Rendu client introuvable.');
        const response = await fetch('/api/account/download-credit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ headId, requestId: requestKey('download') }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Impossible de valider le téléchargement.');
        await refreshAccess();
      }

      const canvas = viewportRef.current.querySelector('canvas');
      if (!canvas) throw new Error('Le rendu 3D n’est pas prêt pour l’export.');
      const url = (canvas as HTMLCanvasElement).toDataURL('image/png');
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'afrofade-rendu-3d.png';
      anchor.click();
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Téléchargement impossible.');
    } finally {
      setDownloading(false);
    }
  };

  if (!hydrated || access.loading) {
    return <div className="min-h-screen bg-cream flex items-center justify-center"><RefreshCw className="w-7 h-7 animate-spin text-terracotta" /></div>;
  }

  return (
    <div className="min-h-screen bg-cream text-ink flex flex-col">
      <header className="border-b border-ink/10">
        <div className="max-w-container mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5"><div className="w-9 h-9 rounded-card bg-terracotta flex items-center justify-center"><Scissors className="w-4 h-4 text-white" /></div><span className="font-display text-lg">Afro<span className="text-terracotta">fade</span></span></Link>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-terracotta bg-terracotta-wash px-3 py-1 rounded-pill"><Sparkles className="w-3.5 h-3.5" /> Étape {step}/4 — {STEPS[step - 1].label}</span>
          <Link href={user?.role === 'salon' ? '/dashboard' : user?.role === 'customer' ? '/account' : '/'} className="min-h-[44px] inline-flex items-center gap-2 text-sm font-medium text-ink-soft hover:text-terracotta"><ArrowLeft className="w-4 h-4" /> Mon espace</Link>
        </div>
      </header>

      <main className="flex-1 px-6 py-10 md:py-14">
        <div className="max-w-3xl mx-auto space-y-8">
          <ol className="flex items-center" aria-label="Progression du rituel">
            {STEPS.map((item, index) => {
              const done = step > item.n;
              const current = step === item.n;
              return <li key={item.n} className="flex-1 flex items-center last:flex-none"><div className="flex flex-col items-center gap-1.5"><span className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${done || current ? 'bg-terracotta text-white' : 'bg-ink/10 text-ink-soft'} ${current ? 'ring-4 ring-terracotta/20' : ''}`}>{done ? <Check className="w-4 h-4" /> : item.n}</span><span className={`text-[10px] font-bold uppercase tracking-[0.08em] ${current ? 'text-terracotta' : 'text-ink-soft'}`}>{item.label}</span></div>{index < STEPS.length - 1 && <span className={`flex-1 h-0.5 mx-2 mb-5 rounded ${done ? 'bg-terracotta' : 'bg-ink/10'}`} />}</li>;
            })}
          </ol>

          {error && <div className="rounded-input border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

          {step === 1 && (
            <section className="space-y-6">
              <div className="text-center space-y-2"><h1 className="font-display text-3xl">Scan guidé du visage</h1><p className="text-sm text-ink-soft">Les images sont envoyées au moteur FLAME uniquement pour la reconstruction. Aucun résultat fictif n’est utilisé si le moteur échoue.</p></div>

              {!user ? (
                <div className="rounded-card bg-card border border-ink/10 shadow-soft p-8 text-center space-y-4"><Lock className="w-9 h-9 mx-auto text-terracotta" /><h2 className="font-display text-xl">Connexion requise</h2><p className="text-sm text-ink-soft">Connectez-vous avant le scan pour conserver un flux sécurisé et rattacher le rendu au bon compte.</p><Link href="/connexion?next=/rituel" className="inline-flex min-h-[48px] items-center px-6 rounded-pill bg-terracotta text-white font-bold">Se connecter / créer un compte</Link></div>
              ) : !access.allowed ? (
                <div className="rounded-card bg-card border border-ink/10 shadow-soft p-8 text-center space-y-4">{user.role === 'customer' ? <Wallet className="w-9 h-9 mx-auto text-terracotta" /> : <Gauge className="w-9 h-9 mx-auto text-terracotta" />}<h2 className="font-display text-xl">Rituel verrouillé</h2><p className="text-sm text-ink-soft">{access.message}</p>{user.role === 'customer' ? <Link href="/account" className="inline-flex min-h-[48px] items-center px-6 rounded-pill bg-terracotta text-white font-bold">Recharger mes crédits</Link> : user.role === 'salon' ? <Link href="/dashboard" className="inline-flex min-h-[48px] items-center px-6 rounded-pill bg-terracotta text-white font-bold">Gérer mon abonnement</Link> : <Link href="/admin" className="inline-flex min-h-[48px] items-center px-6 rounded-pill bg-terracotta text-white font-bold">Retour admin</Link>}</div>
              ) : (
                <>
                  <div className="rounded-input bg-terracotta-wash border border-terracotta/25 px-4 py-3 text-sm flex items-center gap-2">{user.role === 'customer' ? <Wallet className="w-4 h-4 text-terracotta" /> : <Gauge className="w-4 h-4 text-terracotta" />}<span>{access.message}</span></div>
                  {user.role === 'salon' && <input value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Nom du client (optionnel)" className="w-full min-h-[48px] rounded-input border border-ink/15 bg-card px-4" />}
                  <GuidedScanner onComplete={setScan} />
                  <ul className="grid sm:grid-cols-3 gap-3">{['Face et profils guidés', 'Capture automatique', 'Validation serveur après succès'].map((label) => <li key={label} className="flex items-center gap-2 bg-card border border-ink/10 rounded-pill px-4 py-3 text-xs font-medium"><CheckCircle2 className="w-4 h-4 text-scan-success shrink-0" />{label}</li>)}</ul>
                  <button type="button" disabled={!scan || scan.length < 3} onClick={() => void goStep2()} className="w-full min-h-[52px] rounded-pill bg-terracotta text-white font-bold disabled:opacity-40 inline-flex items-center justify-center gap-2">Lancer la reconstruction réelle <ArrowRight className="w-4 h-4" /></button>
                </>
              )}
            </section>
          )}

          {step === 2 && (
            <section className="space-y-6">
              <div className="text-center"><h1 className="font-display text-3xl">Votre tête 3D</h1><p className="text-sm text-ink-soft mt-2">Le quota ou les crédits ne sont consommés qu’après finalisation réussie côté serveur.</p></div>
              {processing ? <div className="min-h-[380px] rounded-card bg-card border border-ink/10 flex flex-col items-center justify-center gap-4"><RefreshCw className="w-10 h-10 animate-spin text-terracotta" /><p className="font-bold">Fitting FLAME en cours…</p><p className="text-xs text-ink-soft">Cette étape peut prendre jusqu’à deux minutes.</p></div> : result ? <><AvatarCanvas modelUrl={result.meshGlbUrl} hairstyleId="bald" hairstyleColor="#1a110b" /><div className="rounded-input bg-card border border-ink/10 px-4 py-3 text-xs text-ink-soft">{result.verticesCount.toLocaleString('fr-FR')} vertices · {Math.round(result.processingTimeMs / 1000)} s · identité {result.identityPreserved ? 'préservée' : 'non confirmée'}</div><button onClick={() => setStep(3)} className="w-full min-h-[52px] rounded-pill bg-terracotta text-white font-bold inline-flex items-center justify-center gap-2">Choisir une coiffure <ArrowRight className="w-4 h-4" /></button></> : <div className="rounded-card bg-card border border-red-200 p-8 text-center space-y-4"><p className="font-bold">La reconstruction n’a pas abouti.</p><button onClick={() => setStep(1)} className="min-h-[46px] px-6 rounded-pill border border-ink/20 font-bold">Revenir au scan</button></div>}
            </section>
          )}

          {step === 3 && result && (
            <section className="space-y-6">
              <div className="text-center"><h1 className="font-display text-3xl">Choisissez votre style</h1><p className="text-sm text-ink-soft mt-2">La coiffure est appliquée sur le modèle GLB généré pour votre compte.</p></div>
              <AvatarCanvas modelUrl={result.meshGlbUrl} hairstyleId={selectedStyle.id} hairstyleColor={selectedStyle.color} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{HAIRSTYLES_DATA.map((item) => <button type="button" key={item.id} onClick={() => setStyleId(item.id)} className={`rounded-card border p-4 text-left ${item.id === styleId ? 'border-terracotta bg-terracotta-wash ring-2 ring-terracotta/20' : 'border-ink/10 bg-card'}`}><span className="font-bold text-sm">{item.title}</span><span className="block text-xs text-ink-soft mt-1">{item.subtitle}</span></button>)}</div>
              <button onClick={() => setStep(4)} className="w-full min-h-[52px] rounded-pill bg-terracotta text-white font-bold inline-flex items-center justify-center gap-2">Finaliser <ArrowRight className="w-4 h-4" /></button>
            </section>
          )}

          {step === 4 && result && (
            <section className="space-y-6">
              <div className="text-center"><h1 className="font-display text-3xl">Rendu final</h1><p className="text-sm text-ink-soft mt-2">{user?.role === 'customer' ? 'Le téléchargement HD coûte 1 crédit.' : 'Le téléchargement est inclus dans votre abonnement salon.'}</p></div>
              <AvatarCanvas canvasRef={viewportRef} modelUrl={result.meshGlbUrl} hairstyleId={selectedStyle.id} hairstyleColor={selectedStyle.color} />
              <div className="flex flex-col sm:flex-row gap-3"><button disabled={downloading} onClick={() => void handleDownload()} className="flex-1 min-h-[52px] rounded-pill bg-terracotta text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50">{downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Télécharger en PNG</button><button onClick={() => void reset()} className="min-h-[52px] px-6 rounded-pill border border-ink/20 font-bold inline-flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4" /> Nouveau rituel</button></div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
