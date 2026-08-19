'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BadgePercent,
  Check,
  CreditCard,
  Gauge,
  Images,
  LogOut,
  RefreshCw,
  Scissors,
  Sparkles,
  Store,
} from 'lucide-react';
import { CountrySelect } from '@/components/CountrySelect';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { useAuth } from '@/lib/auth';
import type { PaymentProvider } from '@/lib/payment-providers';
import { PLANS, TERMS, TermId, formatFcfa, monthlyPrice } from '@/lib/plans';

type SalonDashboard = {
  salon: {
    id: string;
    name: string;
    phone: string;
    country: string;
    plan: 'PRO' | 'VIP' | 'EXTRA';
    quotaLimit: number;
    quotaUsed: number;
    quotaRemaining: number;
    storageUsedBytes: number;
    profileCompletion: number;
    discountEligible: boolean;
  };
  headsCount: number;
  recentHeads: Array<{
    id: string;
    client_name: string;
    mesh_3d_url: string | null;
    created_at: string;
    expires_at: string;
  }>;
  subscription: {
    id: string;
    provider: string;
    amount_fcfa: number;
    status: string;
    expires_at: string;
    created_at: string;
  } | null;
  payments: Array<{
    id: string;
    provider: string;
    product_id: string;
    term_id: string | null;
    amount_fcfa: number;
    status: string;
    created_at: string;
    paid_at: string | null;
  }>;
};

type Provider = {
  provider: PaymentProvider;
  displayName: string;
};

async function fetchSalonDashboard(): Promise<SalonDashboard> {
  const response = await fetch('/api/salon/dashboard', { cache: 'no-store' });
  const payload = await response.json();
  if (payload.needsOnboarding) throw new Error('needs_onboarding');
  if (!response.ok) throw new Error(payload.error || 'Impossible de charger le tableau de bord.');
  return payload as SalonDashboard;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, hydrated, logout } = useAuth();
  const [data, setData] = useState<SalonDashboard | null>(null);
  const [form, setForm] = useState({ name: '', country: '', phone: '' });
  const [providers, setProviders] = useState<Provider[]>([]);
  const [provider, setProvider] = useState<PaymentProvider>('money_fusion');
  const [term, setTerm] = useState<TermId>('3mois');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const [paymentSyncing, setPaymentSyncing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyDashboard = (payload: SalonDashboard) => {
    setData(payload);
    setForm({
      name: payload.salon.name,
      country: payload.salon.country,
      phone: payload.salon.phone,
    });
  };

  const loadProviders = async () => {
    const response = await fetch('/api/v1/payments/providers', { cache: 'no-store' });
    if (!response.ok) return;
    const payload = await response.json();
    const nextProviders = (payload.providers || []) as Provider[];
    setProviders(nextProviders);
    if (nextProviders.length && !nextProviders.some((item) => item.provider === provider)) {
      setProvider(nextProviders[0].provider);
    }
  };

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [payload] = await Promise.all([fetchSalonDashboard(), loadProviders()]);
      applyDashboard(payload);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.message === 'needs_onboarding') {
        router.replace('/onboarding');
        return;
      }
      setError(loadError instanceof Error ? loadError.message : 'Impossible de charger le tableau de bord.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace('/connexion?next=/dashboard');
      return;
    }
    if (user.needsOnboarding) {
      router.replace('/onboarding');
      return;
    }
    if (user.role === 'customer') {
      router.replace('/account');
      return;
    }
    if (user.role === 'admin') {
      router.replace('/admin');
      return;
    }
    void load();
  }, [hydrated, user, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // Provider redirects can land before the verified webhook has activated the
  // subscription. Poll server truth for a bounded window instead of showing stale state.
  useEffect(() => {
    if (!hydrated || user?.role !== 'salon' || user.needsOnboarding) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') !== 'pending') return;
    const paymentId = params.get('payment_id');
    if (!paymentId) return;

    setPaymentSyncing(true);
    let stopped = false;
    let attempts = 0;

    const poll = async () => {
      if (stopped) return;
      attempts += 1;
      try {
        const next = await fetchSalonDashboard();
        applyDashboard(next);
        const payment = next.payments.find((item) => item.id === paymentId);
        if ((payment && payment.status !== 'pending') || next.subscription) {
          stopped = true;
          setPaymentSyncing(false);
          window.history.replaceState({}, '', '/dashboard');
          return;
        }
      } catch {
        // Provider/webhook propagation can be transient; retry below.
      }
      if (attempts >= 15) {
        stopped = true;
        setPaymentSyncing(false);
      }
    };

    void poll();
    const timer = window.setInterval(() => void poll(), 2000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [hydrated, user?.role, user?.needsOnboarding]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch('/api/salon/dashboard', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Enregistrement impossible.');
      await load(true);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const subscribe = async (planName: string) => {
    setPaying(planName);
    setError(null);
    try {
      const response = await fetch('/api/v1/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, purpose: 'subscription', planName, termId: term }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Paiement indisponible.');
      if (!payload.url) throw new Error('Aucun lien de paiement retourné.');
      window.location.assign(payload.url);
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Paiement indisponible.');
      setPaying(null);
    }
  };

  if (!hydrated || !user || user.role !== 'salon' || loading) return <DashboardSkeleton />;

  const activeTerm = TERMS.find((item) => item.id === term) ?? TERMS[1];
  const eligible = data?.salon.discountEligible ?? false;

  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur-md border-b border-ink/10">
        <div className="max-w-container mx-auto px-6 py-3 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-card bg-terracotta flex items-center justify-center"><Scissors className="w-4 h-4 text-white" /></div>
            <span className="font-display text-lg">Afro<span className="text-terracotta">fade</span></span>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-terracotta bg-terracotta-wash px-3 py-1.5 rounded-pill"><Gauge className="w-3.5 h-3.5" />Espace salon</span>
          <div className="ml-auto flex gap-2">
            <Link href="/rituel" className="min-h-[44px] inline-flex items-center gap-2 bg-terracotta text-white font-bold text-sm px-4 rounded-pill"><Sparkles className="w-4 h-4" />Rituel</Link>
            <button onClick={logout} aria-label="Se déconnecter" className="w-11 h-11 rounded-pill bg-card border border-ink/15 flex items-center justify-center"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-container mx-auto px-6 py-10 space-y-8">
        <div>
          <p className="font-hand text-2xl text-terracotta">bon retour</p>
          <h1 className="font-display text-3xl">{data?.salon.name || user.name}</h1>
          <p className="text-sm text-ink-soft mt-1">Profil, quota, clients et facturation synchronisés avec Supabase.</p>
        </div>

        {paymentSyncing && (
          <div className="rounded-input border border-terracotta/30 bg-terracotta-wash px-4 py-3 text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-terracotta" />
            Paiement reçu. Synchronisation de l’abonnement avec le prestataire…
          </div>
        )}
        {error && <div className="rounded-input border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Têtes enregistrées', value: String(data?.headsCount ?? 0), icon: Images },
            { label: 'Quota utilisé', value: `${data?.salon.quotaUsed ?? 0} / ${data?.salon.quotaLimit ?? 0}`, icon: Gauge },
            { label: 'Profil complété', value: `${data?.salon.profileCompletion ?? 0} %`, icon: Store },
            { label: 'Abonnement', value: data?.subscription ? data.salon.plan : 'Aucun', icon: BadgePercent },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-card border border-ink/10 p-5 shadow-soft">
              <div className="text-[10px] uppercase tracking-[.12em] font-bold text-ink-soft flex items-center gap-2"><stat.icon className="w-3.5 h-3.5 text-terracotta" />{stat.label}</div>
              <p className="font-display text-2xl mt-2">{stat.value}</p>
            </div>
          ))}
        </div>

        <section className="bg-card rounded-card border border-ink/10 p-6 sm:p-8 shadow-soft space-y-5">
          <div><h2 className="font-display text-xl">Profil du salon</h2><p className="text-xs text-ink-soft mt-1">Un profil complet est nécessaire pour bénéficier des offres et paiements.</p></div>
          <form onSubmit={saveProfile} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required placeholder="Nom du salon" className="min-h-[48px] rounded-input border border-ink/15 bg-cream px-4" />
            <CountrySelect value={form.country} onChange={(country) => setForm({ ...form, country })} required className="w-full" />
            <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required placeholder="+226..." className="min-h-[48px] rounded-input border border-ink/15 bg-cream px-4" />
            <div className="sm:col-span-3 flex items-center gap-3">
              <button disabled={saving} className="min-h-[46px] px-6 rounded-pill bg-terracotta text-white font-bold disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
              {saved && <span className="text-xs font-bold text-terracotta-dark flex items-center gap-1"><Check className="w-4 h-4" />Enregistré</span>}
            </div>
          </form>
        </section>

        {data?.subscription ? (
          <section className="bg-card rounded-card border border-terracotta/40 p-6 shadow-soft">
            <h2 className="font-display text-xl">Abonnement actif</h2>
            <p className="text-sm text-ink-soft mt-2">Plan <strong>{data.salon.plan}</strong> · {data.subscription.provider} · expire le <strong>{new Date(data.subscription.expires_at).toLocaleDateString('fr-FR')}</strong></p>
          </section>
        ) : (
          <section className="bg-card rounded-card border border-ink/10 p-6 sm:p-8 shadow-soft space-y-6">
            <div className="flex justify-between gap-3 flex-wrap">
              <div><h2 className="font-display text-xl">Choisir un abonnement</h2><p className="text-xs text-ink-soft mt-1">Le prix et les remises sont recalculés côté serveur.</p></div>
              <div className="flex gap-2 flex-wrap">
                {providers.map((item) => (
                  <button key={item.provider} type="button" onClick={() => setProvider(item.provider)} className={`px-4 min-h-[40px] rounded-pill text-xs font-bold border ${provider === item.provider ? 'bg-night text-white border-night' : 'border-ink/15'}`}>{item.displayName}</button>
                ))}
              </div>
            </div>

            {providers.length === 0 ? (
              <div className="rounded-input bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-sm">Aucun prestataire de paiement n’est actuellement disponible.</div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {TERMS.map((item) => (
                    <button key={item.id} type="button" onClick={() => setTerm(item.id)} className={`rounded-card border p-4 text-left ${term === item.id ? 'border-terracotta bg-terracotta-wash' : 'border-ink/10'}`}>
                      <span className="block font-bold text-sm">{item.label}</span>
                      <span className="block text-xs text-ink-soft mt-1">{eligible ? item.hint : item.id === 'mensuel' ? item.hint : 'Profil complet + premier abonnement requis'}</span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PLANS.map((plan) => {
                    const price = monthlyPrice(plan.amount, eligible ? activeTerm.discount : 0);
                    return (
                      <div key={plan.name} className={`rounded-card border p-5 flex flex-col ${plan.popular ? 'border-terracotta bg-terracotta-wash/40' : 'border-ink/10'}`}>
                        <p className="text-xs font-bold uppercase tracking-[.12em] text-ink-soft">{plan.name}</p>
                        <p className="font-display text-2xl mt-2">{formatFcfa(price)} <span className="text-xs font-sans text-ink-soft">FCFA/mois</span></p>
                        <p className="text-xs text-ink-soft mt-2">{activeTerm.label}</p>
                        <ul className="text-xs text-ink-soft mt-4 space-y-1.5 mb-4">{plan.features.slice(0, 3).map((feature) => <li key={feature}>✓ {feature}</li>)}</ul>
                        <button onClick={() => void subscribe(plan.name)} disabled={Boolean(paying)} className="mt-auto min-h-[46px] rounded-pill bg-terracotta text-white font-bold disabled:opacity-50">{paying === plan.name ? 'Ouverture…' : 'Choisir ce plan'}</button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-card rounded-card border border-ink/10 p-6 shadow-soft">
            <h2 className="font-display text-lg flex gap-2"><Images className="w-4 h-4 text-terracotta" />Dernières têtes</h2>
            <div className="mt-4 divide-y divide-ink/10">
              {!data?.recentHeads.length ? <p className="text-sm text-ink-soft py-4">Aucun client scanné.</p> : data.recentHeads.map((head) => (
                <div key={head.id} className="py-3 flex justify-between gap-3"><div><p className="text-sm font-bold">{head.client_name}</p><p className="text-xs text-ink-soft">{new Date(head.created_at).toLocaleDateString('fr-FR')}</p></div>{head.mesh_3d_url && <a href={head.mesh_3d_url} className="text-xs font-bold text-terracotta">Ouvrir</a>}</div>
              ))}
            </div>
          </section>
          <section className="bg-card rounded-card border border-ink/10 p-6 shadow-soft">
            <h2 className="font-display text-lg flex gap-2"><CreditCard className="w-4 h-4 text-terracotta" />Historique paiements</h2>
            <div className="mt-4 divide-y divide-ink/10">
              {!data?.payments.length ? <p className="text-sm text-ink-soft py-4">Aucun paiement.</p> : data.payments.map((payment) => (
                <div key={payment.id} className="py-3 flex justify-between gap-3 text-sm"><div><p className="font-bold">{payment.product_id} · {payment.provider}</p><p className="text-xs text-ink-soft">{new Date(payment.created_at).toLocaleDateString('fr-FR')}</p></div><div className="text-right"><strong>{formatFcfa(payment.amount_fcfa)} FCFA</strong><p className="text-xs text-ink-soft">{payment.status}</p></div></div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
