'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Scissors,
  LogOut,
  Sparkles,
  MapPin,
  Phone,
  Store,
  Check,
  RefreshCw,
  BadgePercent,
  Gauge,
  Images,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  PLANS,
  PlanName,
  TERMS,
  TermId,
  formatFcfa,
  isProfileComplete,
  monthlyPrice,
  profileCompletion,
} from '@/lib/plans';

/**
 * Espace salon — complétion du profil (nom, pays, numéro) débloquant les
 * remises premier abonnement : −10 % (3 mois), −25 % (6 mois), −40 % (annuel).
 */

const FIELD_META = [
  { key: 'salonName' as const, label: 'Nom du salon', icon: Store, placeholder: 'Barber Shop Abidjan' },
  { key: 'country' as const, label: 'Pays', icon: MapPin, placeholder: 'Côte d’Ivoire' },
  { key: 'phone' as const, label: 'Numéro du salon', icon: Phone, placeholder: '+225 07 00 00 00 00' },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, hydrated, logout, updateProfile, subscribe } = useAuth();
  const [form, setForm] = useState({ salonName: '', country: '', phone: '' });
  const [saved, setSaved] = useState(false);
  const [term, setTerm] = useState<TermId>('3mois');

  useEffect(() => {
    if (hydrated && !user) router.replace('/connexion?next=/dashboard');
  }, [hydrated, user, router]);

  useEffect(() => {
    if (user) setForm(user.profile);
  }, [user?.profile.salonName, user?.profile.country, user?.profile.phone]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hydrated || !user) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-terracotta" />
      </div>
    );
  }

  const completion = profileCompletion(form);
  const complete = isProfileComplete(form);
  const eligible = complete && !user.everSubscribed;
  const activeTerm = TERMS.find((t) => t.id === term) ?? TERMS[1];

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(form);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-cream text-ink flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-cream/90 backdrop-blur-md border-b border-ink/10">
        <div className="max-w-container mx-auto px-6 py-3 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Afrofade — accueil">
            <div className="w-9 h-9 rounded-card bg-terracotta flex items-center justify-center">
              <Scissors className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <span className="font-display text-lg tracking-tight">
              Afro<span className="text-terracotta">fade</span>
            </span>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-terracotta bg-terracotta-wash px-3 py-1.5 rounded-pill">
            <Gauge className="w-3.5 h-3.5" />
            Espace salon
          </span>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden md:inline text-xs text-ink-soft">{user.email}</span>
            <Link
              href="/rituel"
              className="min-h-[44px] inline-flex items-center gap-2 bg-terracotta hover:bg-terracotta-dark text-white font-bold text-sm px-4 rounded-pill transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Tester le rituel</span>
            </Link>
            <button
              onClick={logout}
              aria-label="Se déconnecter"
              className="w-11 h-11 rounded-pill bg-card border border-ink/15 text-ink-soft hover:text-terracotta flex items-center justify-center transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-container mx-auto w-full px-6 py-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <p className="font-hand text-2xl text-terracotta">bon retour</p>
            <h1 className="font-display text-2xl sm:text-3xl">Bonjour {user.name}</h1>
          </div>
        </div>

        {/* Stats mock */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Têtes ce mois', value: user.subscription ? '12 / ' + (user.subscription.plan === 'PRO' ? 30 : 100) : '—', icon: Images },
            { label: 'Rendus enregistrés', value: '8', icon: Images },
            { label: 'Profil complété', value: completion + ' %', icon: Store },
            { label: 'Abonnement', value: user.subscription ? user.subscription.plan : 'Aucun', icon: BadgePercent },
          ].map((s) => (
            <div key={s.label} className="bg-card rounded-card border border-ink/10 shadow-soft p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-soft">
                <s.icon className="w-3.5 h-3.5 text-terracotta" />
                {s.label}
              </div>
              <p className="font-display text-xl mt-2">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Profil salon */}
        <section aria-label="Profil du salon" className="bg-card rounded-card border border-ink/10 shadow-soft p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl">Profil du salon</h2>
              <p className="text-xs text-ink-soft mt-1">
                Nom, pays et numéro — 3 champs pour débloquer vos remises de
                premier abonnement.
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-pill ${
                complete ? 'bg-terracotta text-white' : 'bg-terracotta-wash text-terracotta-dark'
              }`}
            >
              {complete ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
              {completion} % complété
            </span>
          </div>

          {/* Barre de progression */}
          <div className="h-2.5 bg-ink/10 rounded-pill overflow-hidden" role="progressbar" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-terracotta rounded-pill transition-all duration-500" style={{ width: `${completion}%` }} />
          </div>

          <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {FIELD_META.map((f) => (
              <div key={f.key}>
                <label htmlFor={f.key} className="flex items-center gap-1.5 text-xs font-bold mb-1.5">
                  <f.icon className="w-3.5 h-3.5 text-terracotta" />
                  {f.label}
                </label>
                <input
                  id={f.key}
                  type={f.key === 'phone' ? 'tel' : 'text'}
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="w-full min-h-[48px] rounded-input border border-ink/15 bg-cream px-4 text-sm focus:outline-none focus:border-terracotta"
                />
              </div>
            ))}
            <div className="sm:col-span-3 flex items-center gap-3">
              <button
                type="submit"
                className="min-h-[48px] px-6 rounded-pill bg-terracotta hover:bg-terracotta-dark text-white font-bold text-sm shadow-soft transition-colors"
              >
                Enregistrer mon profil
              </button>
              {saved && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-terracotta-dark">
                  <Check className="w-4 h-4 stroke-[3]" /> Profil mis à jour
                </span>
              )}
            </div>
          </form>
        </section>

        {/* Abonnement / remises */}
        {user.subscription ? (
          <section aria-label="Abonnement actif" className="bg-card rounded-card border border-terracotta/40 shadow-soft p-6 sm:p-8 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-display text-xl">Abonnement actif</h2>
              {user.subscription.isFirstWithDiscount && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-white bg-terracotta px-3 py-1.5 rounded-pill">
                  <BadgePercent className="w-3.5 h-3.5" />
                  Remise premier abonnement appliquée
                </span>
              )}
            </div>
            <p className="text-sm text-ink-soft">
              Plan <strong className="text-ink">{user.subscription.plan}</strong> ·{' '}
              {TERMS.find((t) => t.id === user.subscription?.term)?.label} ·{' '}
              <strong className="text-ink">{formatFcfa(user.subscription.monthlyFcfa)} FCFA/mois</strong>
            </p>
            <p className="text-xs text-ink-soft">
              Actif depuis le {new Date(user.subscription.startedAt).toLocaleDateString('fr-FR')} ·
              paiement Mobile Money (Wave, Orange Money, MTN, Moov).
            </p>
          </section>
        ) : (
          <section aria-label="Premier abonnement" className="bg-card rounded-card border border-ink/10 shadow-soft p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-display text-xl">Premier abonnement</h2>
                <p className="text-xs text-ink-soft mt-1 max-w-lg">
                  {eligible
                    ? 'Profil 100 % ✓ : vos remises de lancement sont débloquées sur votre premier abonnement.'
                    : 'Complétez votre profil à 100 % pour débloquer les remises de lancement : −10 % (3 mois), −25 % (6 mois), −40 % (annuel).'}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] px-3 py-1.5 rounded-pill ${eligible ? 'text-white bg-terracotta' : 'text-ink-soft bg-ink/5'}`}>
                <BadgePercent className="w-3.5 h-3.5" />
                {eligible ? 'Remises actives' : 'Remises verrouillées'}
              </span>
            </div>

            {/* Choix de l'engagement */}
            <div role="radiogroup" aria-label="Durée d'engagement" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {TERMS.map((t) => {
                const locked = t.discount > 0 && !eligible;
                const active = t.id === term;
                return (
                  <button
                    type="button"
                    key={t.id}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTerm(t.id)}
                    className={`text-left rounded-card border p-4 transition-all ${
                      active
                        ? 'border-terracotta bg-terracotta-wash ring-2 ring-terracotta/30'
                        : 'border-ink/10 bg-cream hover:border-terracotta/50'
                    } ${locked ? 'opacity-50' : ''}`}
                  >
                    <span className="block text-sm font-bold">{t.label}</span>
                    <span className={`block text-xs mt-1 font-bold ${t.discount > 0 && eligible ? 'text-terracotta' : 'text-ink-soft'}`}>
                      {t.discount > 0 ? t.hint : t.hint}
                    </span>
                    {locked && <span className="block text-[10px] text-ink-soft mt-1">Profil 100 % requis</span>}
                  </button>
                );
              })}
            </div>

            {/* Plans au prix remisé */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PLANS.map((plan) => {
                const price = monthlyPrice(plan.amount, eligible ? activeTerm.discount : 0);
                const discounted = eligible && activeTerm.discount > 0;
                return (
                  <div
                    key={plan.name}
                    className={`rounded-card border p-5 flex flex-col ${
                      plan.popular ? 'border-terracotta bg-terracotta-wash/50 ring-1 ring-terracotta/30' : 'border-ink/10 bg-cream'
                    }`}
                  >
                    <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-ink-soft">{plan.name}</h3>
                    <p className="mt-2">
                      <span className="font-display text-2xl">{formatFcfa(price)}</span>
                      <span className="text-xs text-ink-soft"> FCFA/mois</span>
                    </p>
                    {discounted && (
                      <p className="text-[11px] text-ink-soft mt-0.5">
                        au lieu de <s>{formatFcfa(plan.amount)}</s>
                      </p>
                    )}
                    <ul className="mt-3 mb-4 space-y-1.5 text-xs text-ink-soft">
                      {plan.features.slice(0, 3).map((f) => (
                        <li key={f} className="flex gap-1.5">
                          <span className="text-terracotta font-bold" aria-hidden>✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => subscribe(plan.name as PlanName, plan.amount, activeTerm.id)}
                      className={`mt-auto min-h-[46px] rounded-pill font-bold text-sm transition-colors ${
                        plan.popular
                          ? 'bg-terracotta hover:bg-terracotta-dark text-white'
                          : 'bg-transparent border-[1.5px] border-ink/20 hover:border-terracotta/50'
                      }`}
                    >
                      {discounted ? `Profiter de −${Math.round(activeTerm.discount * 100)} %` : `Choisir ${plan.name.charAt(0)}${plan.name.slice(1).toLowerCase()}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
