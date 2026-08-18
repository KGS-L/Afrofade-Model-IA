'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Scissors,
  LogOut,
  RefreshCw,
  Store,
  CreditCard,
  Wallet,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { formatFcfa } from '@/lib/plans';

/**
 * Console d'administration Afrofade (accès dev/démo depuis /connexion).
 * Données mock en attendant les tables Supabase réelles.
 */

const KPIS = [
  { label: 'Salons inscrits', value: '128', icon: Store, delta: '+12 ce mois' },
  { label: 'Abonnements actifs', value: '74', icon: CreditCard, delta: '+8 ce mois' },
  { label: 'MRR', value: '362 400 FCFA', icon: Wallet, delta: '+9,4 % vs m-1' },
  { label: 'Conversion essai → payant', value: '12 %', icon: TrendingUp, delta: 'Rituel 1mn' },
];

const PLAN_DISTRIBUTION = [
  { plan: 'PRO', count: 31, color: 'bg-ink-soft' },
  { plan: 'VIP', count: 32, color: 'bg-terracotta' },
  { plan: 'EXTRA', count: 11, color: 'bg-terracotta-dark' },
];

const RECENT_SALONS = [
  { salon: 'Barber Shop Abidjan', pays: 'Côte d’Ivoire', plan: 'VIP', statut: 'Actif', date: '18/08/2026' },
  { salon: 'Fade Master Dakar', pays: 'Sénégal', plan: 'PRO', statut: 'Essai', date: '17/08/2026' },
  { salon: 'Locks & Co Lomé', pays: 'Togo', plan: 'EXTRA', statut: 'Actif', date: '16/08/2026' },
  { salon: 'Le Salon d’Awa', pays: 'Côte d’Ivoire', plan: '—', statut: 'Profil incomplet', date: '16/08/2026' },
  { salon: 'Yaoundé Cut Studio', pays: 'Cameroun', plan: 'VIP', statut: 'Actif', date: '15/08/2026' },
  { salon: 'Cotonou Barber Club', pays: 'Bénin', plan: 'PRO', statut: 'Actif', date: '14/08/2026' },
];

export default function AdminPage() {
  const router = useRouter();
  const { user, hydrated, logout } = useAuth();

  useEffect(() => {
    if (hydrated && (!user || user.role !== 'admin')) {
      router.replace('/connexion?next=/admin');
    }
  }, [hydrated, user, router]);

  if (!hydrated || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-terracotta" />
      </div>
    );
  }

  const maxCount = Math.max(...PLAN_DISTRIBUTION.map((p) => p.count));

  return (
    <div className="min-h-screen bg-cream text-ink flex flex-col">
      <header className="sticky top-0 z-30 bg-night/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-container mx-auto px-6 py-3 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Afrofade — accueil">
            <div className="w-9 h-9 rounded-card bg-terracotta flex items-center justify-center">
              <Scissors className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <span className="font-display text-lg tracking-tight text-white">
              Afro<span className="text-terracotta">fade</span>
            </span>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white bg-white/10 px-3 py-1.5 rounded-pill">
            <ShieldCheck className="w-3.5 h-3.5 text-terracotta" />
            Console admin
          </span>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden md:inline text-xs text-white/60">{user.email}</span>
            <button
              onClick={logout}
              aria-label="Se déconnecter"
              className="w-11 h-11 rounded-pill bg-white/10 border border-white/15 text-white/80 hover:text-white flex items-center justify-center transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-container mx-auto w-full px-6 py-10 space-y-8">
        <div>
          <p className="font-hand text-2xl text-terracotta">vue d’ensemble</p>
          <h1 className="font-display text-2xl sm:text-3xl">Administration Afrofade</h1>
          <p className="text-sm text-ink-soft mt-1">
            Chiffres de démonstration — branchement Supabase (tables salons,
            subscriptions) à l’étape backend.
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {KPIS.map((kpi) => (
            <div key={kpi.label} className="bg-card rounded-card border border-ink/10 shadow-soft p-5">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-soft">
                <kpi.icon className="w-3.5 h-3.5 text-terracotta" />
                {kpi.label}
              </div>
              <p className="font-display text-2xl mt-2">{kpi.value}</p>
              <p className="text-[11px] text-terracotta-dark font-bold mt-1">{kpi.delta}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Répartition par plan */}
          <section aria-label="Répartition par plan" className="lg:col-span-2 bg-card rounded-card border border-ink/10 shadow-soft p-6 space-y-5">
            <h2 className="font-display text-lg">Répartition par plan</h2>
            {PLAN_DISTRIBUTION.map((p) => (
              <div key={p.plan} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>{p.plan}</span>
                  <span className="text-ink-soft">{p.count} salons</span>
                </div>
                <div className="h-2.5 bg-ink/10 rounded-pill overflow-hidden">
                  <div
                    className={`h-full rounded-pill ${p.color}`}
                    style={{ width: `${(p.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-[11px] text-ink-soft pt-1">
              MRR simulé : 31×2 200 + 32×4 900 + 11×7 500 = {formatFcfa(362400)} FCFA.
            </p>
          </section>

          {/* Derniers salons inscrits */}
          <section aria-label="Derniers salons inscrits" className="lg:col-span-3 bg-card rounded-card border border-ink/10 shadow-soft p-6 space-y-4">
            <h2 className="font-display text-lg">Derniers salons inscrits</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-ink-soft uppercase tracking-[0.1em] text-[10px] border-b border-ink/10">
                    <th className="py-2 pr-3 font-bold">Salon</th>
                    <th className="py-2 pr-3 font-bold">Pays</th>
                    <th className="py-2 pr-3 font-bold">Plan</th>
                    <th className="py-2 pr-3 font-bold">Statut</th>
                    <th className="py-2 font-bold">Inscrit le</th>
                  </tr>
                </thead>
                <tbody>
                  {RECENT_SALONS.map((row) => (
                    <tr key={row.salon} className="border-b border-ink/5 last:border-0">
                      <td className="py-2.5 pr-3 font-bold">{row.salon}</td>
                      <td className="py-2.5 pr-3 text-ink-soft">{row.pays}</td>
                      <td className="py-2.5 pr-3">
                        {row.plan === '—' ? (
                          <span className="text-ink-soft">—</span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-pill bg-terracotta-wash text-terracotta-dark font-bold">
                            {row.plan}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-pill font-bold ${
                            row.statut === 'Actif'
                              ? 'bg-terracotta text-white'
                              : row.statut === 'Essai'
                                ? 'bg-ink/10 text-ink'
                                : 'bg-ink/5 text-ink-soft'
                          }`}
                        >
                          {row.statut}
                        </span>
                      </td>
                      <td className="py-2.5 text-ink-soft">{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
