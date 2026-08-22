'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BadgeCent,
  Check,
  CreditCard,
  History,
  Images,
  LogOut,
  Menu,
  RefreshCw,
  Scissors,
  Sparkles,
  Store,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';
import { CountrySelect } from '@/components/CountrySelect';
import { NationalitySelect } from '@/components/NationalitySelect';
import { PhoneInput } from '@/components/PhoneInput';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { useAuth } from '@/lib/auth';
import { B2C_CREDIT_PACKS } from '@/lib/credits';
import { parsePhone, getDialCodeForCountry, getNationalityForCountry } from '@/lib/countries';
import type { PaymentProvider } from '@/lib/payment-providers';
import { formatFcfa } from '@/lib/plans';

type AccountOverview = {
  profile: { displayName: string; phone: string; country: string; nationality?: string };
  wallet: { balance: number; updatedAt: string | null };
  ledger: Array<{
    id: string;
    delta: number;
    reason: string;
    reference_id?: string | null;
    created_at: string;
  }>;
  payments: Array<{
    id: string;
    provider: string;
    product_id: string;
    amount_fcfa: number;
    status: string;
    created_at: string;
    paid_at: string | null;
  }>;
  heads: Array<{
    id: string;
    client_name: string;
    mesh_3d_url: string;
    saved_hairstyle_id: string | null;
    is_saved_permanently: boolean;
    expires_at: string;
    created_at: string;
  }>;
};

type Provider = {
  provider: PaymentProvider;
  displayName: string;
  effectiveEnabled: boolean;
};

async function fetchOverview(): Promise<AccountOverview> {
  const response = await fetch('/api/account/overview', { cache: 'no-store' });
  const data = await response.json();
  if (data.needsOnboarding) throw new Error('needs_onboarding');
  if (!response.ok) throw new Error(data.error || 'Impossible de charger votre espace.');
  return data as AccountOverview;
}

export default function AccountPage() {
  const router = useRouter();
  const { user, hydrated, logout } = useAuth();
  const [overview, setOverview] = useState<AccountOverview | null>(null);
  const [profile, setProfile] = useState({
    displayName: '',
    country: 'Burkina Faso',
    nationality: 'Burkinabè',
    dialCode: '+226',
    phoneRaw: '',
  });
  const [salonForm, setSalonForm] = useState({ name: '', country: '', phone: '' });
  const [providers, setProviders] = useState<Provider[]>([]);
  const [provider, setProvider] = useState<PaymentProvider>('money_fusion');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingSalon, setCreatingSalon] = useState(false);
  const [payingPack, setPayingPack] = useState<string | null>(null);
  const [paymentSyncing, setPaymentSyncing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyOverview = (data: AccountOverview) => {
    setOverview(data);
    const parsed = parsePhone(data.profile.phone || '');
    setProfile({
      displayName: data.profile.displayName || '',
      country: data.profile.country || 'Burkina Faso',
      nationality: data.profile.nationality || getNationalityForCountry(data.profile.country || 'Burkina Faso'),
      dialCode: parsed.dialCode,
      phoneRaw: parsed.numberOnly,
    });
    setSalonForm((previous) => ({
      name: previous.name || `${data.profile.displayName || 'Mon'} Barber Shop`,
      country: previous.country || data.profile.country,
      phone: previous.phone || data.profile.phone,
    }));
  };

  const loadProviders = async () => {
    const response = await fetch('/api/v1/payments/providers', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    const nextProviders = (data.providers || []) as Provider[];
    setProviders(nextProviders);
    if (nextProviders.length && !nextProviders.some((item) => item.provider === provider)) {
      setProvider(nextProviders[0].provider);
    }
  };

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [nextOverview] = await Promise.all([fetchOverview(), loadProviders()]);
      applyOverview(nextOverview);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.message === 'needs_onboarding') {
        router.replace('/onboarding');
        return;
      }
      setError(loadError instanceof Error ? loadError.message : 'Impossible de charger votre espace.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.replace('/connexion?next=/account');
      return;
    }
    if (user.needsOnboarding) {
      router.replace('/onboarding');
      return;
    }
    if (user.role === 'salon') {
      router.replace('/dashboard');
      return;
    }
    if (user.role === 'admin') {
      router.replace('/admin');
      return;
    }
    void load();
  }, [hydrated, user, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // A provider can redirect before its verified webhook has credited the wallet.
  // Keep the UI synchronized with server truth until this transaction leaves pending.
  useEffect(() => {
    if (!hydrated || user?.role !== 'customer' || user.needsOnboarding) return;
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
        const next = await fetchOverview();
        applyOverview(next);
        const payment = next.payments.find((item) => item.id === paymentId);
        if (payment && payment.status !== 'pending') {
          stopped = true;
          setPaymentSyncing(false);
          window.history.replaceState({}, '', '/account');
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

  const paidCredits = useMemo(
    () => overview?.ledger.filter((item) => item.delta > 0).reduce((sum, item) => sum + item.delta, 0) ?? 0,
    [overview],
  );

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const fullPhone = `${profile.dialCode}${profile.phoneRaw.replace(/\s+/g, '')}`;

    try {
      const response = await fetch('/api/account/overview', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: profile.displayName,
          country: profile.country,
          nationality: profile.nationality,
          phone: fullPhone,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Enregistrement impossible.');
      const parsed = parsePhone(data.profile.phone || fullPhone);
      setProfile({
        displayName: data.profile.displayName || profile.displayName,
        country: data.profile.country || profile.country,
        nationality: data.profile.nationality || profile.nationality,
        dialCode: parsed.dialCode,
        phoneRaw: parsed.numberOnly,
      });
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
        body: JSON.stringify({ provider, purpose: 'credits', packId }),
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

  const [menuOpen, setMenuOpen] = useState(false);

  if (!hydrated || !user || user.role !== 'customer' || loading) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur-md border-b border-ink/10">
        <div className="max-w-container mx-auto px-4 sm:px-6 min-h-[64px] flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-card bg-terracotta flex items-center justify-center"><Scissors className="w-4 h-4 text-white" /></div>
            <span className="font-display text-lg">Afro<span className="text-terracotta">fade</span></span>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.12em] bg-terracotta-wash text-terracotta-dark px-3 py-1.5 rounded-pill"><UserRound className="w-3.5 h-3.5" />Espace particulier</span>
          
          <div className="ml-auto flex items-center gap-2">
            <Link href="/rituel" className="hidden sm:inline-flex min-h-[44px] items-center gap-2 px-4 rounded-pill bg-terracotta text-white text-sm font-bold hover:bg-terracotta-dark"><Sparkles className="w-4 h-4" />Tester un style</Link>
            <button onClick={logout} className="hidden sm:flex w-11 h-11 rounded-pill border border-ink/15 flex items-center justify-center hover:bg-ink/5" aria-label="Se déconnecter"><LogOut className="w-4 h-4" /></button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden w-11 h-11 rounded-pill border border-ink/15 bg-card flex items-center justify-center" aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}>{menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
          </div>
        </div>

        {menuOpen && (
          <nav className="sm:hidden border-t border-ink/10 bg-card p-4 space-y-3 shadow-soft">
            <div className="pb-3 border-b border-ink/10 flex items-center justify-between">
              <span className="text-xs font-bold text-ink-soft">Connecté en tant que</span>
              <span className="text-xs font-bold text-terracotta">{profile.displayName || user.name}</span>
            </div>
            <Link href="/discover" onClick={() => setMenuOpen(false)} className="min-h-[44px] flex items-center px-3 rounded-input text-sm font-medium hover:bg-terracotta-wash">Découvrir la marketplace</Link>
            <Link href="/styles" onClick={() => setMenuOpen(false)} className="min-h-[44px] flex items-center px-3 rounded-input text-sm font-medium hover:bg-terracotta-wash">Catalogue des styles</Link>
            <Link href="/pour-les-pros" onClick={() => setMenuOpen(false)} className="min-h-[44px] flex items-center px-3 rounded-input text-sm font-medium hover:bg-terracotta-wash">Offres pour les salons (Pros)</Link>
            <button onClick={() => { setMenuOpen(false); void logout(); }} className="w-full min-h-[44px] flex items-center gap-2 px-3 rounded-input text-sm font-bold text-red-600 hover:bg-red-50 text-left"><LogOut className="w-4 h-4" />Se déconnecter</button>
          </nav>
        )}
      </header>

      <main className="max-w-container mx-auto px-6 py-10 space-y-8">
        <div>
          <p className="font-hand text-2xl text-terracotta">votre espace</p>
          <h1 className="font-display text-3xl">Bonjour {profile.displayName || user.name}</h1>
          <p className="text-sm text-ink-soft mt-1">Crédits, rendus 3D, achats et profil synchronisés en toute sécurité.</p>
        </div>

        {paymentSyncing && (
          <div className="rounded-input border border-terracotta/30 bg-terracotta-wash px-4 py-3 text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-terracotta" />
            Paiement reçu. Synchronisation du solde avec le prestataire…
          </div>
        )}
        {error && <div className="rounded-input border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Crédits disponibles', value: overview?.wallet.balance ?? 0, icon: Wallet },
            { label: 'Crédits reçus', value: paidCredits, icon: BadgeCent },
            { label: 'Rendus 3D', value: overview?.heads.length ?? 0, icon: Images },
            { label: 'Achats crédits', value: overview?.payments.length ?? 0, icon: CreditCard },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-card border border-ink/10 p-5 shadow-soft">
              <div className="text-xs font-bold text-ink-soft flex items-center gap-2"><stat.icon className="w-4 h-4 text-terracotta" />{stat.label}</div>
              <p className="font-display text-3xl mt-2">{stat.value}</p>
            </div>
          ))}
        </div>

        <section className="bg-card rounded-card border border-ink/10 p-6 sm:p-8 shadow-soft">
          <h2 className="font-display text-xl">Mon profil</h2>
          <p className="text-xs text-ink-soft mt-1">Ces données servent aussi à préremplir les paiements et réservations.</p>
          <form onSubmit={saveProfile} className="space-y-4 mt-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="block text-xs font-bold">Votre nom
                <input value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} placeholder="Nom" required className="mt-1.5 w-full min-h-[48px] rounded-input border border-ink/15 bg-cream px-4 font-normal" />
              </label>
              <label className="block text-xs font-bold">Pays de résidence
                <CountrySelect
                  value={profile.country}
                  onChange={(country) => {
                    const dialCode = getDialCodeForCountry(country);
                    const nationality = getNationalityForCountry(country);
                    setProfile((prev) => ({ ...prev, country, dialCode, nationality }));
                  }}
                  required
                  className="mt-1.5 w-full font-normal"
                />
              </label>
              <label className="block text-xs font-bold">Nationalité
                <NationalitySelect
                  value={profile.nationality}
                  onChange={(nationality) => setProfile({ ...profile, nationality })}
                  required
                  className="mt-1.5 w-full font-normal"
                />
              </label>
            </div>

            <label className="block text-xs font-bold">Téléphone (Indicatif + Numéro sans indicatif)
              <PhoneInput
                dialCode={profile.dialCode}
                onDialCodeChange={(dialCode) => setProfile({ ...profile, dialCode })}
                phoneNumber={profile.phoneRaw}
                onPhoneNumberChange={(phoneRaw) => setProfile({ ...profile, phoneRaw })}
                required
                className="mt-1.5"
              />
            </label>

            <div className="flex items-center gap-3 pt-2">
              <button disabled={saving} className="min-h-[46px] px-6 rounded-pill bg-terracotta text-white font-bold disabled:opacity-50">{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
              {saved && <span className="text-xs font-bold text-terracotta-dark inline-flex items-center gap-1"><Check className="w-4 h-4" />Profil enregistré</span>}
            </div>
          </form>
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div><h2 className="font-display text-xl">Recharger mes crédits</h2><p className="text-xs text-ink-soft mt-1">Choisissez un prestataire activé par l’administration.</p></div>
            <div className="flex gap-2 flex-wrap">
              {providers.map((item) => (
                <button key={item.provider} type="button" onClick={() => setProvider(item.provider)} className={`px-4 min-h-[40px] rounded-pill text-xs font-bold border ${provider === item.provider ? 'bg-night text-white border-night' : 'bg-card border-ink/15'}`}>{item.displayName}</button>
              ))}
            </div>
          </div>
          {providers.length === 0 ? (
            <div className="rounded-input border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm">Aucun prestataire de paiement n’est actuellement disponible.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {B2C_CREDIT_PACKS.map((pack) => (
                <div key={pack.id} className={`bg-card rounded-card border p-5 shadow-soft ${pack.popular ? 'border-terracotta' : 'border-ink/10'}`}>
                  <p className="text-xs uppercase tracking-[.12em] font-bold text-ink-soft">{pack.name}</p>
                  <p className="font-display text-2xl mt-2">{pack.credits} crédits</p>
                  <p className="text-sm text-terracotta-dark font-bold mt-1">{formatFcfa(pack.amountFcfa)} FCFA</p>
                  <p className="text-xs text-ink-soft mt-3 min-h-[48px]">{pack.description}</p>
                  <button onClick={() => void buyCredits(pack.id)} disabled={Boolean(payingPack)} className="w-full min-h-[46px] mt-4 rounded-pill bg-terracotta text-white font-bold disabled:opacity-50">{payingPack === pack.id ? 'Ouverture…' : 'Acheter'}</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-card rounded-card border border-ink/10 p-6 shadow-soft">
            <h2 className="font-display text-lg flex items-center gap-2"><Images className="w-4 h-4 text-terracotta" />Mes rendus 3D</h2>
            <div className="mt-4 divide-y divide-ink/10">
              {!overview?.heads.length ? <p className="text-sm text-ink-soft py-4">Aucun rendu pour le moment.</p> : overview.heads.map((head) => (
                <div key={head.id} className="py-3 flex items-center justify-between gap-3"><div><p className="text-sm font-bold">{head.client_name}</p><p className="text-xs text-ink-soft">{new Date(head.created_at).toLocaleDateString('fr-FR')}</p></div><a href={head.mesh_3d_url} className="text-xs font-bold text-terracotta">Ouvrir</a></div>
              ))}
            </div>
          </section>
          <section className="bg-card rounded-card border border-ink/10 p-6 shadow-soft">
            <h2 className="font-display text-lg flex items-center gap-2"><History className="w-4 h-4 text-terracotta" />Mouvements de crédits</h2>
            <div className="mt-4 divide-y divide-ink/10">
              {!overview?.ledger.length ? <p className="text-sm text-ink-soft py-4">Aucun mouvement.</p> : overview.ledger.map((item) => (
                <div key={item.id} className="py-3 flex justify-between gap-3 text-sm"><span>{item.reason.replaceAll('_', ' ')}</span><strong className={item.delta > 0 ? 'text-terracotta-dark' : ''}>{item.delta > 0 ? '+' : ''}{item.delta}</strong></div>
              ))}
            </div>
          </section>
        </div>

        <section className="bg-card rounded-card border border-ink/10 p-6 shadow-soft">
          <h2 className="font-display text-lg flex items-center gap-2"><CreditCard className="w-4 h-4 text-terracotta" />Historique des paiements</h2>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-ink-soft border-b border-ink/10"><th className="py-2">Prestataire</th><th>Pack</th><th>Montant</th><th>Statut</th><th>Date</th></tr></thead>
              <tbody>{overview?.payments.map((payment) => <tr key={payment.id} className="border-b border-ink/5"><td className="py-3">{payment.provider}</td><td>{payment.product_id}</td><td>{formatFcfa(payment.amount_fcfa)} FCFA</td><td>{payment.status}</td><td>{new Date(payment.created_at).toLocaleDateString('fr-FR')}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="bg-night text-white rounded-card p-6 sm:p-8 shadow-soft">
          <div className="flex items-start gap-3">
            <Store className="w-5 h-5 text-terracotta mt-1" />
            <div><h2 className="font-display text-xl">Vous devenez professionnel ?</h2><p className="text-sm text-white/65 mt-1">Un particulier existant peut toujours créer son espace salon. La conversion reste contrôlée côté serveur.</p></div>
          </div>
          <form onSubmit={createSalon} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
            <input value={salonForm.name} onChange={(event) => setSalonForm({ ...salonForm, name: event.target.value })} placeholder="Nom du salon" required className="min-h-[46px] rounded-input bg-white/10 border border-white/20 px-4 text-white placeholder:text-white/40" />
            <CountrySelect value={salonForm.country} onChange={(country) => setSalonForm({ ...salonForm, country })} required className="w-full" />
            <input value={salonForm.phone} onChange={(event) => setSalonForm({ ...salonForm, phone: event.target.value })} placeholder="Téléphone" required className="min-h-[46px] rounded-input bg-white/10 border border-white/20 px-4 text-white placeholder:text-white/40" />
            <button disabled={creatingSalon} className="sm:col-span-3 justify-self-start min-h-[46px] px-6 rounded-pill bg-terracotta text-white font-bold disabled:opacity-50">{creatingSalon ? 'Création…' : 'Créer mon espace salon'}</button>
          </form>
        </section>
      </main>
    </div>
  );
}
