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
  MapPin,
  Phone,
  RefreshCw,
  Scissors,
  Sparkles,
  Store,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
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
    saved_hairstyle_id: string | null;
    is_saved_permanently: boolean;
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

export default function DashboardPage() {
  const router = useRouter();
  const { user, hydrated, logout } = useAuth();
  const [data, setData] = useState<SalonDashboard | null>(null);
  const [form, setForm] = useState({ name: '', country: '', phone: '' });
  const [term, setTerm] = useState<TermId>('3mois');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/salon/dashboard', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Impossible de charger le tableau de bord.');
      setData(payload);
      setForm({ name: payload.salon.name, country: payload.salon.country, phone: payload.salon.phone });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Impossible de charger le tableau de bord.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace('/connexion?next=/dashboard');
      return;
    }
    if (user.role === 'salon') void load();
  }, [hydrated, user, router]); // eslint-disable-line react-hooks/exhaustive-deps

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
      await load();
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
        body: JSON.stringify({ provider: 'money_fusion', purpose: 'subscription', planName, termId: term }),
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

  if (!hydrated || !user || user.role !== 'salon' || loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-terracotta" />
      </div>
    );
  }

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
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-terracotta bg-terracotta-wash px-3 py-1.5 rounded-pill"><Gauge className="w-3.5 h-3.5" /> Espace salon</span>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/rituel" className="min-h-[44px] inline-flex items-center gap-2 bg-terracotta text-white font-bold text-sm px-4 rounded-pill"><Sparkles className="w-4 h-4" /> Rituel</Link>
            <button onClick={logout} aria-label="Se déconnecter" className="w-11 h-11 rounded-pill bg-card border border-ink/15 flex items-center justify-center"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-container mx-auto px-6 py-10 space-y-8">
        <div>
          <p className="font-hand text-2xl text-terracotta">bon retour</p>
          <h1 className="font-display text-3xl">{data?.salon.name || user.name}</h1>
          <p className="text-sm text-ink-soft mt-1">Toutes les statistiques ci-dessous viennent de Supabase.</p>
        </div>

        {error && <div className="rounded-input border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Têtes enregistrées', value: String(data?.headsCount ?? 0), icon: Images },
            { label: 'Quota utilisé', value: `${data?.salon.quotaUsed ?? 0} / ${data?.salon.quotaLimit ?? 0}`, icon: Gauge },
            { label: 'Profil complété', value: `${data?.salon.profileCompletion ?? 0} %`, icon: Store },
            { label: 'Abonnement', value: data?.subscription ? data.salon.plan : 'Aucun', icon: BadgePercent },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-card border border-ink/10 p-5 shadow-soft">
              <div className="text-[10px] uppercase tracking-[0.12em] font-bold text-ink-soft flex items-center gap-2"><stat.icon className="w-3.5 h-3.5 text-terracotta" /> {stat.label}</div>
              <p className="font-display text-2xl mt-2">{stat.value}</p>
            </div>
          ))}
        </div>

        <section className="bg-card rounded-card border border-ink/10 p-6 sm:p-8 shadow-soft space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div><h2 className="font-display text-xl">Profil du salon</h2><p className="text-xs text-ink-soft mt-1">Ces informations sont persistées dans <code>public.salons</code>.</p></div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-pill ${(data?.salon.profileCompletion ?? 0) === 100 ? 'bg-terracotta text-white' : 'bg-terracotta-wash text-terracotta-dark'}`}>{data?.salon.profileCompletion ?? 0} % complété</span>
          </div>
          <form onSubmit={saveProfile} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="text-xs font-bold"><span className="flex items-center gap-1.5 mb-1.5"><Store className="w-3.5 h-3.5 text-terracotta" />Nom</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full min-h-[48px] rounded-input border border-ink/15 bg-cream px-4 font-normal" /></label>
            <label className="text-xs font-bold"><span className="flex items-center gap-1.5 mb-1.5"><MapPin className="w-3.5 h-3.5 text-terracotta" />Pays</span><input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="w-full min-h-[48px] rounded-input border border-ink/15 bg-cream px-4 font-normal" /></label>
            <label className="text-xs font-bold"><span className="flex items-center gap-1.5 mb-1.5"><Phone className="w-3.5 h-3.5 text-terracotta" />Téléphone</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full min-h-[48px] rounded-input border border-ink/15 bg-cream px-4 font-normal" /></label>
            <div className="sm:col-span-3 flex items-center gap-3"><button disabled={saving} className="min-h-[46px] px-6 rounded-pill bg-terracotta text-white font-bold disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>{saved && <span className="text-xs font-bold text-terracotta-dark flex items-center gap-1"><Check className="w-4 h-4" /> Enregistré dans Supabase</span>}</div>
          </form>
        </section>

        {data?.subscription ? (
          <section className="bg-card rounded-card border border-terracotta/40 p-6 shadow-soft">
            <h2 className="font-display text-xl">Abonnement actif</h2>
            <p className="text-sm text-ink-soft mt-2">Plan <strong className="text-ink">{data.salon.plan}</strong> · {data.subscription.provider} · expire le <strong className="text-ink">{new Date(data.subscription.expires_at).toLocaleDateString('fr-FR')}</strong></p>
          </section>
        ) : (
          <section className="bg-card rounded-card border border-ink/10 p-6 sm:p-8 shadow-soft space-y-6">
            <div className="flex items-start justify-between gap-3 flex-wrap"><div><h2 className="font-display text-xl">Choisir un abonnement</h2><p className="text-xs text-ink-soft mt-1">Les remises sont recalculées et validées côté serveur.</p></div><span className={`text-xs font-bold px-3 py-1.5 rounded-pill ${eligible ? 'bg-terracotta text-white' : 'bg-ink/5 text-ink-soft'}`}>{eligible ? 'Remises premier abonnement actives' : 'Remises verrouillées'}</span></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {TERMS.map((item) => <button key={item.id} type="button" onClick={() => setTerm(item.id)} className={`rounded-card border p-4 text-left ${term === item.id ? 'border-terracotta bg-terracotta-wash' : 'border-ink/10'}`}><span className="block font-bold text-sm">{item.label}</span><span className="block text-xs text-ink-soft mt-1">{eligible ? item.hint : item.id === 'mensuel' ? item.hint : 'Profil complet + premier abonnement requis'}</span></button>)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map((plan) => {
                const price = monthlyPrice(plan.amount, eligible ? activeTerm.discount : 0);
                return <div key={plan.name} className={`rounded-card border p-5 flex flex-col ${plan.popular ? 'border-terracotta bg-terracotta-wash/40' : 'border-ink/10'}`}><p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-soft">{plan.name}</p><p className="font-display text-2xl mt-2">{formatFcfa(price)} <span className="text-xs font-sans text-ink-soft">FCFA/mois</span></p><p className="text-xs text-ink-soft mt-2">{activeTerm.label} · total calculé côté serveur</p><ul className="text-xs text-ink-soft mt-4 space-y-1.5 mb-4">{plan.features.slice(0, 3).map((feature) => <li key={feature}>✓ {feature}</li>)}</ul><button onClick={() => void subscribe(plan.name)} disabled={Boolean(paying)} className="mt-auto min-h-[46px] rounded-pill bg-terracotta text-white font-bold disabled:opacity-50">{paying === plan.name ? 'Ouverture du paiement…' : `Choisir ${plan.name}`}</button></div>;
              })}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-card rounded-card border border-ink/10 p-6 shadow-soft">
            <h2 className="font-display text-lg flex items-center gap-2"><Images className="w-4 h-4 text-terracotta" /> Dernières têtes</h2>
            <div className="divide-y divide-ink/10 mt-4">{(data?.recentHeads || []).length === 0 ? <p className="py-4 text-sm text-ink-soft">Aucune tête enregistrée.</p> : data?.recentHeads.map((head) => <div key={head.id} className="py-3 flex items-center justify-between gap-3"><div><p className="text-sm font-bold">{head.client_name}</p><p className="text-xs text-ink-soft">{new Date(head.created_at).toLocaleDateString('fr-FR')}</p></div><span className="text-xs text-ink-soft">{head.mesh_3d_url ? '3D prête' : 'En traitement'}</span></div>)}</div>
          </section>
          <section className="bg-card rounded-card border border-ink/10 p-6 shadow-soft">
            <h2 className="font-display text-lg flex items-center gap-2"><CreditCard className="w-4 h-4 text-terracotta" /> Historique des paiements</h2>
            <div className="divide-y divide-ink/10 mt-4">{(data?.payments || []).length === 0 ? <p className="py-4 text-sm text-ink-soft">Aucun paiement.</p> : data?.payments.map((payment) => <div key={payment.id} className="py-3 flex items-center justify-between gap-3"><div><p className="text-sm font-bold">{payment.product_id}</p><p className="text-xs text-ink-soft">{payment.provider} · {payment.status}</p></div><span className="text-sm font-bold">{formatFcfa(payment.amount_fcfa)} FCFA</span></div>)}</div>
          </section>
        </div>
      </main>
    </div>
  );
}
