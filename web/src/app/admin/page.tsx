'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  LogOut,
  RefreshCw,
  Scissors,
  ShieldCheck,
  Store,
  Users,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { formatFcfa } from '@/lib/plans';

type AdminOverview = {
  kpis: {
    salons: number;
    users: number;
    activeSubscriptions: number;
    paidTransactions: number;
    totalRevenueFcfa: number;
    subscriptionRevenueFcfa: number;
    creditRevenueFcfa: number;
  };
  planDistribution: { PRO: number; VIP: number; EXTRA: number };
  roleDistribution: { customer: number; salon: number; admin: number };
  recentSalons: Array<{
    id: string;
    name: string;
    country: string;
    plan: string;
    created_at: string;
    status: string;
  }>;
};

export default function AdminPage() {
  const router = useRouter();
  const { user, hydrated, logout } = useAuth();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/overview', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Impossible de charger l’administration.');
      setOverview(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Impossible de charger l’administration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace('/connexion?next=/admin');
      return;
    }
    if (user.role === 'admin') void load();
  }, [hydrated, user, router]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hydrated || !user || user.role !== 'admin' || loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-terracotta" />
      </div>
    );
  }

  const maxPlan = Math.max(1, ...(Object.values(overview?.planDistribution || {}) as number[]));

  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="sticky top-0 z-30 bg-night/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-container mx-auto px-6 py-3 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-card bg-terracotta flex items-center justify-center"><Scissors className="w-4 h-4 text-white" /></div>
            <span className="font-display text-lg text-white">Afro<span className="text-terracotta">fade</span></span>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white bg-white/10 px-3 py-1.5 rounded-pill"><ShieldCheck className="w-3.5 h-3.5 text-terracotta" /> Console admin</span>
          <div className="ml-auto flex items-center gap-3"><span className="hidden md:inline text-xs text-white/60">{user.email}</span><button onClick={logout} aria-label="Se déconnecter" className="w-11 h-11 rounded-pill bg-white/10 border border-white/15 text-white flex items-center justify-center"><LogOut className="w-4 h-4" /></button></div>
        </div>
      </header>

      <main className="max-w-container mx-auto px-6 py-10 space-y-8">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div><p className="font-hand text-2xl text-terracotta">vue d’ensemble</p><h1 className="font-display text-3xl">Administration Afrofade</h1><p className="text-sm text-ink-soft mt-1">Données réelles : salons, rôles, abonnements et paiements Supabase.</p></div>
          <button onClick={() => void load()} className="min-h-[44px] px-4 rounded-pill border border-ink/15 bg-card text-sm font-bold inline-flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Actualiser</button>
        </div>

        {error && <div className="rounded-input border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Salons inscrits', value: overview?.kpis.salons ?? 0, icon: Store },
            { label: 'Abonnements actifs', value: overview?.kpis.activeSubscriptions ?? 0, icon: CreditCard },
            { label: 'Utilisateurs', value: overview?.kpis.users ?? 0, icon: Users },
            { label: 'CA encaissé', value: `${formatFcfa(overview?.kpis.totalRevenueFcfa ?? 0)} FCFA`, icon: Wallet },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-card rounded-card border border-ink/10 p-5 shadow-soft">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-soft"><kpi.icon className="w-3.5 h-3.5 text-terracotta" />{kpi.label}</div>
              <p className="font-display text-2xl mt-2">{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="bg-card rounded-card border border-ink/10 p-6 shadow-soft">
            <h2 className="font-display text-lg">Répartition des plans</h2>
            <div className="space-y-4 mt-5">
              {(['PRO', 'VIP', 'EXTRA'] as const).map((plan) => {
                const count = overview?.planDistribution[plan] ?? 0;
                return <div key={plan}><div className="flex justify-between text-xs font-bold"><span>{plan}</span><span className="text-ink-soft">{count} salons</span></div><div className="h-2.5 bg-ink/10 rounded-pill overflow-hidden mt-1.5"><div className="h-full bg-terracotta rounded-pill" style={{ width: `${(count / maxPlan) * 100}%` }} /></div></div>;
              })}
            </div>
          </section>

          <section className="bg-card rounded-card border border-ink/10 p-6 shadow-soft">
            <h2 className="font-display text-lg">Répartition des rôles</h2>
            <div className="space-y-3 mt-5 text-sm">
              <div className="flex justify-between"><span>Particuliers</span><strong>{overview?.roleDistribution.customer ?? 0}</strong></div>
              <div className="flex justify-between"><span>Salons</span><strong>{overview?.roleDistribution.salon ?? 0}</strong></div>
              <div className="flex justify-between"><span>Admins</span><strong>{overview?.roleDistribution.admin ?? 0}</strong></div>
            </div>
          </section>

          <section className="bg-night text-white rounded-card p-6 shadow-soft">
            <h2 className="font-display text-lg">Revenus vérifiés</h2>
            <div className="space-y-3 mt-5 text-sm">
              <div className="flex justify-between gap-3"><span className="text-white/65">Abonnements</span><strong>{formatFcfa(overview?.kpis.subscriptionRevenueFcfa ?? 0)} FCFA</strong></div>
              <div className="flex justify-between gap-3"><span className="text-white/65">Crédits B2C</span><strong>{formatFcfa(overview?.kpis.creditRevenueFcfa ?? 0)} FCFA</strong></div>
              <div className="flex justify-between gap-3 border-t border-white/10 pt-3"><span className="text-white/65">Transactions payées</span><strong>{overview?.kpis.paidTransactions ?? 0}</strong></div>
            </div>
          </section>
        </div>

        <section className="bg-card rounded-card border border-ink/10 p-6 shadow-soft">
          <h2 className="font-display text-lg">Derniers salons inscrits</h2>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead><tr className="uppercase tracking-[0.1em] text-[10px] text-ink-soft border-b border-ink/10"><th className="py-2 pr-3">Salon</th><th className="py-2 pr-3">Pays</th><th className="py-2 pr-3">Plan</th><th className="py-2 pr-3">Statut</th><th className="py-2">Inscrit le</th></tr></thead>
              <tbody>
                {(overview?.recentSalons || []).length === 0 ? <tr><td colSpan={5} className="py-6 text-center text-ink-soft">Aucun salon.</td></tr> : overview?.recentSalons.map((salon) => <tr key={salon.id} className="border-b border-ink/5 last:border-0"><td className="py-3 pr-3 font-bold">{salon.name}</td><td className="py-3 pr-3 text-ink-soft">{salon.country}</td><td className="py-3 pr-3"><span className="px-2 py-1 rounded-pill bg-terracotta-wash text-terracotta-dark font-bold">{salon.plan}</span></td><td className="py-3 pr-3"><span className={salon.status === 'Actif' ? 'text-terracotta-dark font-bold' : 'text-ink-soft'}>{salon.status}</span></td><td className="py-3 text-ink-soft">{new Date(salon.created_at).toLocaleDateString('fr-FR')}</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
