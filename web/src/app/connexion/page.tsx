'use client';

import React, { Suspense, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Scissors, ArrowLeft, Mail, Chrome, KeyRound, RefreshCw, AlertCircle, Check, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';

function ConnexionInner() {
  const router = useRouter();
  const params = useSearchParams();
  const requestedNext = params.get('next');
  const nextUrl = requestedNext?.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/dashboard';
  const { user, hydrated, loginWithEmail, verifyEmailOtp, loginWithGoogle } = useAuth();

  React.useEffect(() => {
    if (hydrated && user) {
      router.replace(nextUrl);
    }
  }, [hydrated, user, nextUrl, router]);

  const [method, setMethod] = useState<'choix' | 'otp-envoye'>('choix');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '', '', '']);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const otpComplet = otp.every((digit) => digit !== '');

  const handleSendOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.includes('@')) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const sent = await loginWithEmail(email);
      if (!sent) throw new Error('otp_send_failed');
      setMethod('otp-envoye');
    } catch {
      setErrorMessage('Erreur lors de l’envoi du code. Veuillez réessayer.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!otpComplet) return;
    setBusy(true);
    setErrorMessage(null);
    const success = await verifyEmailOtp(email, otp.join(''));
    if (success) router.push(nextUrl);
    else {
      setErrorMessage('Code OTP invalide ou expiré.');
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    setErrorMessage(null);
    try {
      await loginWithGoogle(nextUrl);
    } catch {
      setErrorMessage('Erreur de connexion avec Google.');
      setBusy(false);
    }
  };

  const onDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const nextOtp = [...otp];
    nextOtp[index] = digit;
    setOtp(nextOtp);
    if (digit && index < 7) inputRefs.current[index + 1]?.focus();
  };

  const onKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  return (
    <main className="grid min-h-screen bg-cream lg:grid-cols-2 overflow-hidden">
      {/* SECTION GAUCHE : Panneau Visuel & Pitch Afrofade (visible uniquement sur écran lg) */}
      <section className="relative hidden min-h-screen overflow-hidden bg-night lg:flex lg:flex-col lg:justify-between p-12 xl:p-16 text-white border-r border-ink/10">
        {/* Background Image avec superpositions élégantes */}
        <Image
          src="/auth-showcase.png"
          alt="Studio Virtuel Afrofade 3D"
          fill
          priority
          className="object-cover opacity-60 mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/50 to-night/20" />
        <div className="absolute inset-0 bg-radial-gradient from-terracotta/20 via-transparent to-transparent opacity-40 pointer-events-none" />

        {/* En-tête Marque Panneau Gauche */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group" aria-label="Afrofade — accueil">
            <div className="w-10 h-10 rounded-card bg-terracotta flex items-center justify-center shadow-soft group-hover:scale-105 transition-transform">
              <Scissors className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <span className="font-display text-2xl tracking-tight text-white">
              Afro<span className="text-terracotta">fade</span>
            </span>
          </Link>
        </div>

        {/* Message d'inspiration & Caractéristiques clés */}
        <div className="relative z-10 max-w-lg space-y-8 my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-terracotta/20 border border-terracotta/30 text-terracotta-wash text-xs font-semibold tracking-wide backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-terracotta-wash" /> Studio Virtuel 3D
          </div>

          <blockquote className="font-display text-3xl xl:text-4xl leading-tight text-cream drop-shadow-sm">
            « Visualisez votre style en 3D photoréaliste avant même le premier coup de ciseau. »
          </blockquote>

          <ul className="space-y-4 text-sm text-cream/90 font-medium">
            <li className="flex items-center gap-3">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-terracotta/30 border border-terracotta/50 text-white shrink-0 shadow-sm">
                <Check size={14} className="stroke-[3]" />
              </span>
              Reconstruction 3D sur-mesure de votre visage & votre coupe
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-terracotta/30 border border-terracotta/50 text-white shrink-0 shadow-sm">
                <Check size={14} className="stroke-[3]" />
              </span>
              Catalogue d’Afros, Fades, Tresses et Locks Haute Définition
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-terracotta/30 border border-terracotta/50 text-white shrink-0 shadow-sm">
                <Check size={14} className="stroke-[3]" />
              </span>
              Réservation directe avec les salons partenaires d’excellence
            </li>
          </ul>
        </div>

        {/* Pied de page du panneau gauche */}
        <div className="relative z-10 flex items-center justify-between text-xs text-cream/50 border-t border-white/10 pt-6">
          <span>© {new Date().getFullYear()} Afrofade</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-terracotta" /> Données biométriques sécurisées
          </span>
        </div>
      </section>

      {/* SECTION DROITE : Formulaire de connexion & Navigation */}
      <section className="flex min-h-screen flex-col justify-between bg-cream">
        <header className="flex h-20 items-center justify-between px-6 sm:px-10">
          <Link href="/" className="lg:hidden flex items-center gap-2.5" aria-label="Afrofade — accueil">
            <div className="w-9 h-9 rounded-card bg-terracotta flex items-center justify-center">
              <Scissors className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <span className="font-display text-lg tracking-tight">Afro<span className="text-terracotta">fade</span></span>
          </Link>

          <Link href="/" className="min-h-[44px] inline-flex items-center gap-2 text-sm font-medium text-ink-soft hover:text-terracotta transition-colors ml-auto">
            <ArrowLeft className="w-4 h-4" /> Retour à l’accueil
          </Link>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-8 sm:px-10">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center space-y-2">
              <h1 className="font-display text-2xl sm:text-3xl text-ink">Connexion / Inscription</h1>
              <p className="text-sm text-ink-soft">Connectez-vous pour accéder à votre espace Afrofade.</p>
            </div>

            {errorMessage && (
              <div className="rounded-input bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {method === 'choix' ? (
              <div className="rounded-card border border-ink/10 bg-card shadow-soft p-6 sm:p-8 space-y-4">
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={busy}
                  className="w-full min-h-[52px] rounded-pill border-[1.5px] border-ink/15 bg-cream hover:bg-terracotta-wash font-bold text-sm inline-flex items-center justify-center gap-3 transition-colors disabled:opacity-60 text-ink"
                >
                  <Chrome className="w-5 h-5 text-terracotta" />
                  {busy ? 'Connexion Google…' : 'Continuer avec Google'}
                </button>

                <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                  <span className="flex-1 h-px bg-ink/10" /> ou par e-mail <span className="flex-1 h-px bg-ink/10" />
                </div>

                <form onSubmit={handleSendOtp} className="space-y-3">
                  <label htmlFor="email" className="block text-xs font-bold text-ink">
                    Votre e-mail
                  </label>
                  <div className="flex items-center gap-2 min-h-[48px] border border-ink/15 rounded-input bg-cream px-4 focus-within:border-terracotta">
                    <Mail className="w-4 h-4 text-ink-soft shrink-0" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="vous@exemple.com"
                      className="w-full bg-transparent text-sm focus:outline-none text-ink placeholder:text-ink-soft/50"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy || !email.includes('@')}
                    className="w-full min-h-[52px] rounded-pill bg-terracotta hover:bg-terracotta-dark text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-soft transition-colors disabled:opacity-60"
                  >
                    {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} Recevoir mon code OTP
                  </button>
                </form>
              </div>
            ) : (
              <form onSubmit={handleVerifyOtp} className="rounded-card border border-ink/10 bg-card shadow-soft p-6 sm:p-8 space-y-5">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 mx-auto rounded-full bg-terracotta-wash border border-terracotta/40 flex items-center justify-center text-terracotta">
                    <Mail className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold text-ink">Code envoyé à {email}</p>
                  <p className="text-xs text-ink-soft">Saisissez les 8 chiffres du code reçu par e-mail.</p>
                </div>

                <div className="flex justify-center gap-2" role="group" aria-label="Code OTP">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        inputRefs.current[index] = element;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      aria-label={`Chiffre ${index + 1}`}
                      value={digit}
                      onChange={(event) => onDigitChange(index, event.target.value)}
                      onKeyDown={(event) => onKeyDown(index, event)}
                      className="w-9 h-11 text-center text-base font-bold rounded-input border border-ink/15 bg-cream focus:outline-none focus:border-terracotta text-ink"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={busy || !otpComplet}
                  className="w-full min-h-[52px] rounded-pill bg-terracotta hover:bg-terracotta-dark text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-soft transition-colors disabled:opacity-60"
                >
                  {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : null} Vérifier et me connecter
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMethod('choix');
                    setErrorMessage(null);
                  }}
                  className="w-full text-center text-xs font-medium text-terracotta hover:underline"
                >
                  ← Changer d’e-mail ou utiliser Google
                </button>
              </form>
            )}
          </div>
        </div>

        <footer className="py-6 text-center text-xs text-ink-soft px-6 border-t border-ink/5">
          En vous connectant, vous acceptez nos{' '}
          <Link href="/legal/cgv" className="underline hover:text-terracotta">
            CGV
          </Link>{' '}
          et notre{' '}
          <Link href="/legal/confidentialite" className="underline hover:text-terracotta">
            Politique de confidentialité
          </Link>
          .
        </footer>
      </section>
    </main>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream flex items-center justify-center"><RefreshCw className="w-6 h-6 animate-spin text-terracotta" /></div>}>
      <ConnexionInner />
    </Suspense>
  );
}

