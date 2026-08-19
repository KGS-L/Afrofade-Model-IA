'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Check, Scissors, Sparkles, Store, UserRound, Users, Wallet } from 'lucide-react';
import { CountrySelect } from '@/components/CountrySelect';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { useAuth } from '@/lib/auth';

type ProfileType = 'customer' | 'salon';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, hydrated } = useAuth();
  const [profileType, setProfileType] = useState<ProfileType | null>(null);
  const [form, setForm] = useState({ displayName: '', salonName: '', country: 'Burkina Faso', phone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!user) { router.replace('/connexion?next=/onboarding'); return; }
    if (!user.needsOnboarding) router.replace(user.role === 'admin' ? '/admin' : user.role === 'salon' ? '/dashboard' : '/account');
    setForm((current) => ({ ...current, displayName: current.displayName || user.name }));
  }, [hydrated, user, router]);

  if (!hydrated || !user) return <DashboardSkeleton />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profileType) return;
    setSaving(true); setError(null);
    try {
      const response = await fetch('/api/onboarding/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profileType, ...form }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Configuration impossible.');
      window.location.assign(data.redirectTo || (profileType === 'salon' ? '/dashboard' : '/account'));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Configuration impossible.');
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-cream text-ink px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-card bg-terracotta text-white flex items-center justify-center"><Scissors className="w-5 h-5" /></div>
          <p className="font-hand text-2xl text-terracotta">bienvenue chez Afrofade</p>
          <h1 className="font-display text-3xl sm:text-4xl">Quel espace souhaitez-vous créer ?</h1>
          <p className="text-sm text-ink-soft max-w-2xl mx-auto">Ce choix adapte le tableau de bord, la facturation et les outils 3D. Vous pourrez toujours contacter l’équipe si votre activité évolue.</p>
        </div>

        {!profileType && (
          <div className="grid md:grid-cols-2 gap-5">
            <button onClick={() => setProfileType('customer')} className="text-left bg-card rounded-card border border-ink/10 p-6 shadow-soft hover:border-terracotta transition-colors">
              <div className="w-11 h-11 rounded-full bg-terracotta-wash text-terracotta flex items-center justify-center"><UserRound className="w-5 h-5"/></div>
              <h2 className="font-display text-2xl mt-4">Particulier</h2>
              <p className="text-sm text-ink-soft mt-2">Pour tester des coiffures sur votre propre tête avant d’aller chez le coiffeur.</p>
              <ul className="mt-5 space-y-2 text-sm"><li className="flex gap-2"><Check className="w-4 h-4 text-terracotta"/>Crédits rechargeables, sans abonnement mensuel</li><li className="flex gap-2"><Check className="w-4 h-4 text-terracotta"/>Création et conservation de vos rendus 3D</li><li className="flex gap-2"><Check className="w-4 h-4 text-terracotta"/>Téléchargement et partage de votre look</li></ul>
              <span className="mt-6 inline-flex items-center gap-2 font-bold text-terracotta"><Wallet className="w-4 h-4"/>Choisir Particulier</span>
            </button>
            <button onClick={() => setProfileType('salon')} className="text-left bg-night text-white rounded-card border border-white/10 p-6 shadow-soft hover:border-terracotta transition-colors">
              <div className="w-11 h-11 rounded-full bg-terracotta text-white flex items-center justify-center"><Store className="w-5 h-5"/></div>
              <h2 className="font-display text-2xl mt-4">Salon de coiffure</h2>
              <p className="text-sm text-white/65 mt-2">Pour utiliser Afrofade avec vos clients et piloter votre activité professionnelle.</p>
              <ul className="mt-5 space-y-2 text-sm"><li className="flex gap-2"><Check className="w-4 h-4 text-terracotta"/>Abonnements PRO, VIP et EXTRA</li><li className="flex gap-2"><Check className="w-4 h-4 text-terracotta"/>Quota de reconstructions pour vos clients</li><li className="flex gap-2"><Check className="w-4 h-4 text-terracotta"/>Historique, facturation et gestion du salon</li></ul>
              <span className="mt-6 inline-flex items-center gap-2 font-bold text-terracotta"><Building2 className="w-4 h-4"/>Choisir Salon</span>
            </button>
          </div>
        )}

        {profileType && (
          <form onSubmit={submit} className="max-w-2xl mx-auto bg-card rounded-card border border-ink/10 p-6 sm:p-8 shadow-soft space-y-5">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-terracotta">{profileType === 'salon' ? 'Salon de coiffure' : 'Particulier'}</p><h2 className="font-display text-2xl mt-1">Finaliser votre profil</h2></div><button type="button" onClick={() => setProfileType(null)} className="text-xs font-bold text-ink-soft hover:text-terracotta">Changer</button></div>
            {profileType === 'customer' ? <label className="block text-xs font-bold">Votre nom<input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required className="mt-1.5 w-full min-h-[48px] rounded-input border border-ink/15 bg-cream px-4 font-normal" /></label> : <label className="block text-xs font-bold">Nom du salon<input value={form.salonName} onChange={(e) => setForm({ ...form, salonName: e.target.value })} required className="mt-1.5 w-full min-h-[48px] rounded-input border border-ink/15 bg-cream px-4 font-normal" /></label>}
            <label className="block text-xs font-bold">Pays<CountrySelect value={form.country} onChange={(country) => setForm({ ...form, country })} required className="mt-1.5 w-full font-normal" /></label>
            <label className="block text-xs font-bold">Téléphone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="+226..." className="mt-1.5 w-full min-h-[48px] rounded-input border border-ink/15 bg-cream px-4 font-normal" /></label>
            {error && <div className="rounded-input border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            <button disabled={saving} className="w-full min-h-[52px] rounded-pill bg-terracotta text-white font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2">{saving ? <><Sparkles className="w-4 h-4 animate-pulse"/>Création de votre espace…</> : <><Users className="w-4 h-4"/>Accéder à mon espace</>}</button>
          </form>
        )}
      </div>
    </main>
  );
}
