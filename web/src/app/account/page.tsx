'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BadgeCent,
  CreditCard,
  History,
  LogOut,
  RefreshCw,
  Scissors,
  Sparkles,
  Store,
  UserRound,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { B2C_CREDIT_PACKS } from '@/lib/credits';
import { formatFcfa } from '@/lib/plans';

type AccountOverview = {
  profile: { displayName: string; phone: string; country: string };
  wallet: { balance: number; updatedAt: string | null };
  ledger: Array<{ id: string; delta: number; reason: string; created_at: string }>;
  payments: Array<{
    id: string;
    provider: string;
    product_id: string;
    amount_fcfa: number;
    status: string;
    created_at: string;
    paid_at: string | null;
  }>;
};

export default function AccountPage() {
  const router = useRouter();
  const { user, hydrated, logout } = useAuth();
  const [overview, setOverview] = useState<AccountOverview | null>(null);
  const [profile, setProfile] = useState({ displayName: '', phone: '', country: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payingPack, setPayingPack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [salonForm, setSalonForm] = useState({ name: '', country: '', phone: '' });
  const [creatingSalon, setCreatingSalon] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/account/overview', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Impossible de charger votre espace.');
      setOverview(data);
      setProfile(data.profile);
      setSalonForm((previous) => ({
        name: previous.name || `${data.profile.displayName || 'Mon'} Barber Shop`,
        country: previous.country || data.profile.country,
        phone: previous.phone || data.profile.phone,
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Impossible de charger votre espace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace('/connexion?next=/account');
      return;
    }
    if (user.role !== 'customer') return;
    void load();
  }, [hydrated, user, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const paidCredits = useMemo(
    () => overview?.ledger.filter((item) => item.delta > 0).reduce((sum, item) => sum + item.delta, 0) ?? 0,
    [overview]
  );

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch('/api/account/overview', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Enregistrement impossible.');
      setProfile(data.profile);
      setOverview((previous) => (previous ? { ...previous, profile: data.profile } : previous));
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const buyCredits = async (packId: string) => {
    setPayingPack(packId);
    setError(null);
    try {
      const response = await fetch('/api/v1/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'money_fusion', purpose: 'credits', packId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Paiement indisponible.');
      if (!data.url) throw new Error('Aucun lien de paiement retourné.');
      window.location.assign(data.url);
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Paiement indisponible.');
      setPayingPack(null);
    }
  };

  const createSalon = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreatingSalon(true);
    setError(null);
    try {
      const response = await fetch('/api/salon/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salonForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Création du salon impossible.');
      window.location.assign('/dashboard');
    } catch (salonError) {
      setError(salonError instanceof Error ? salonError.message : 'Création du salon impossible.');
      setCreatingSalon(false);
    }
  };

  if (!hydrated || !user || user.role !== 'customer' || loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-terracotta" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur-md border-b border-ink/10">
        <div className="max-w-container mx-auto px-6 py-3 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-card bg-terracotta flex items-center justify-center">
              <Scissors className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-lg">Afro<span className="text-terracotta">fade</span></span>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] bg-terracotta-wash text-terracotta-dark px-3 py-1.5 rounded-pill">
            <UserRound className="w-3.5 h-3.5" /> Espace particulier
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/rituel" className="min-h-[44px] inline-flex items-center gap-2 px-4 rounded-pill bg-terracotta text-white text-sm font-bold">
              <Sparkles className="w-4 h-4" /> Tester un style
            </Link>
            <button onClick={logout} className="w-11 h-11 rounded-pill border border-ink/15 flex items-center justify-center" aria-label="Se déconnecter">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-container mx-auto px-6 py-10 space-y-8">
        <div>
          <p className="font-hand text-2xl text-terracotta">votre espace</p>
          <h1 className="font-display text-3xl">Bonjour {profile.displayName || user.name}</h1>
          <p className="text-sm text-ink-soft mt-1">Crédits, achats et profil sont lus directement depuis Supabase.</p>
        </div>

        {error && <div className="rounded-input border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-card border border-ink/10 p-5 shadow-soft">
            <div className="text-xs font-bold text-ink-soft flex items-center gap-2"><Wallet className="w-4 h-4 text-terracotta" /> Crédits disponibles</div>
            <p className="font-display text-3xl mt-2">{overview?.wallet.balance ?? 0}</p>
          </div>
          <div className="bg-card rounded-card border border-ink/10 p-5 shadow-soft">
            <div className="text-xs font-bold text-ink-soft flex items-center gap-2"><BadgeCent className="w-4 h-4 text-terracotta" /> Crédits reçus</div>
            <p className="font-display text-3xl mt-2">{paidCredits}</p>
          </div>
          <div className="bg-card rounded-card border border-ink/10 p-5 shadow-soft">
            <div className="text-xs font-bold text-ink-soft flex items-center gap-2"><CreditCard className="w-4 h-4 text-terracotta" /> Achats crédits</div>
            <p className="font-display text-3xl mt-2">{overview?.payments.length ?? 0}</p>
          </div>
        </div>

        <section className="bg-card rounded-card border border-ink/10 p-6 sm:p-8 shadow-soft">
          <h2 className="font-display text-xl">Mon profil</h2>
          <form onSubmit={saveProfile} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
            <input value={profile.displayName} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} placeholder="Nom" className="min-h-[48px] rounded-input border border-ink/15 bg-cream px-4" />
            <input value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} placeholder="Pays" className="min-h-[48px] rounded-input border border-ink/15 bg-cream px-4" />
            <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+226..." className="min-h-[48px] rounded-input border border-ink/15 bg-cream px-4" />
            <div className="sm:col-span-3 flex items-center gap-3">
              <button disabled={saving} className="min-h-[46px] px-6 rounded-pill bg-terracotta text-white font-bold disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
              {saved && <span className="text-xs font-bold text-terracotta-dark">Profil enregistré ✓</span>}
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-display text-xl">Recharger mes crédits</h2>
            <p className="text-xs text-ink-soft mt-1">Les prix sont validés côté serveur ; le navigateur ne peut pas modifier le montant.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {B2C_CREDIT_PACKS.map((pack) => (
              <div key={pack.id} className={`bg-card rounded-card border p-5 shadow-soft ${pack.popular ? 'border-terracotta' : 'border-ink/10'}`}>
                <p className="text-xs uppercase tracking-[0.12em] font-bold text-ink-soft">{pack.name}</p>
                <p className="font-display text-2xl mt-2">{pack.credits} crédits</p>
                <p className="text-sm text-terracotta-dark font-bold mt-1">{formatFcfa(pack.amountFcfa)} FCFA</p>
                <p className="text-xs text-ink-soft mt-3 min-h-[48px]">{pack.description}</p>
                <button onClick={() => void buyCredits(pack.id)} disabled={Boolean(payingPack)} className="w-full min-h-[46px] mt-4 rounded-pill bg-terracotta text-white font-bold disabled:opacity-50">
                  {payingPack === pack.id ? 'Ouverture du paiement…' : 'Acheter'}
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-card rounded-card border border-ink/10 p-6 shadow-soft">
            <h2 className="font-display text-lg flex items-center gap-2"><History className="w-4 h-4 text-terracotta" /> Mouvements de crédits</h2>
            <div className="mt-4 divide-y divide-ink/10">
              {(overview?.ledger || []).length === 0 ? <p className="text-sm text-ink-soft py-4">Aucun mouvement pour le moment.</p> : overview?.ledger.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                  <div><p className="font-bold">{item.reason.replaceAll('_', ' ')}</p><p className="text-xs text-ink-soft">{new Date(item.created_at).toLocaleDateString('fr-FR')}</p></div>
                  <span className={`font-bold ${item.delta >= 0 ? 'text-terracotta-dark' : 'text-ink'}`}>{item.delta >= 0 ? '+' : ''}{item.delta}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-card rounded-card border border-ink/10 p-6 shadow-soft">
            <h2 className="font-display text-lg flex items-center gap-2"><CreditCard className="w-4 h-4 text-terracotta" /> Paiements</h2>
            <div className="mt-4 divide-y divide-ink/10">
              {(overview?.payments || []).length === 0 ? <p className="text-sm text-ink-soft py-4">Aucun paiement pour le moment.</p> : overview?.payments.map((payment) => (
                <div key={payment.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                  <div><p className="font-bold">{payment.product_id}</p><p className="text-xs text-ink-soft">{payment.provider} · {new Date(payment.created_at).toLocaleDateString('fr-FR')}</p></div>
                  <div className="text-right"><p className="font-bold">{formatFcfa(payment.amount_fcfa)} FCFA</p><p className="text-xs text-ink-soft">{payment.status}</p></div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="bg-night text-white rounded-card p-6 sm:p-8 shadow-soft">
          <div className="flex items-start gap-3"><Store className="w-5 h-5 text-terracotta mt-1" /><div><h2 className="font-display text-xl">Vous êtes professionnel ?</h2><p className="text-sm text-white/65 mt-1">Créez votre espace salon. Votre compte passera du rôle particulier au rôle salon sans perdre votre identité Supabase.</p></div></div>
          <form onSubmit={createSalon} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
            <input value={salonForm.name} onChange={(e) => setSalonForm({ ...salonForm, name: e.target.value })} placeholder="Nom du salon" className="min-h-[46px] rounded-input bg-white/10 border border-white/20 px-4 text-white placeholder:text-white/40" />
            <input value={salonForm.country} onChange={(e) => setSalonForm({ ...salonForm, country: e.target.value })} placeholder="Pays" className="min-h-[46px] rounded-input bg-white/10 border border-white/20 px-4 text-white placeholder:text-white/40" />
            <input value={salonForm.phone} onChange={(e) => setSalonForm({ ...salonForm, phone: e.target.value })} placeholder="Téléphone" className="min-h-[46px] rounded-input bg-white/10 border border-white/20 px-4 text-white placeholder:text-white/40" />
            <button disabled={creatingSalon} className="sm:col-span-3 justify-self-start min-h-[46px] px-6 rounded-pill bg-terracotta text-white font-bold disabled:opacity-50">{creatingSalon ? 'Création…' : 'Créer mon espace salon'}</button>
          </form>
        </section>
      </main>
    </div>
  );
}
