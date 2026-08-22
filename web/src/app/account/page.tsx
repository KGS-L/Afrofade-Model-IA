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
  RefreshCw,
  Scissors,
  Sparkles,
  Store,
  UserRound,
  Wallet,
  ArrowRight,
  Pencil,
} from 'lucide-react';
import { CountrySelect } from '@/components/CountrySelect';
import { MobileDrawer } from '@/components/MobileDrawer';
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
  ledger: Array<{ id: string; delta: number; reason: string; reference_id: string | null; created_at: string }>;
  payments: Array<{ id: string; provider: string; product_id: string; amount_fcfa: number; status: string; created_at: string }>;
  heads: Array<{ id: string; client_name: string; mesh_3d_url: string; saved_hairstyle_id: string | null; is_saved_permanently: boolean; expires_at: string | null; created_at: string }>;
};

type Provider = {
  provider: PaymentProvider;
  displayName: string;
  enabled: boolean;
};

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
  const [isEditing, setIsEditing] = useState(false);
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
  };

  const loadData = async () => {
    try {
      const [accRes, provRes] = await Promise.all([
        fetch('/api/account/overview', { cache: 'no-store' }),
        fetch('/api/v1/payments/providers', { cache: 'no-store' }),
      ]);
      if (accRes.status === 401) {
        router.push('/connexion?redirect=/account');
        return;
      }
      if (accRes.ok) {
        const data = (await accRes.json()) as AccountOverview;
        applyOverview(data);
      }
      if (provRes.ok) {
        const data = (await provRes.json()) as { providers: Provider[] };
        const active = (data.providers || []).filter((item) => item.enabled);
        setProviders(active);
        if (active.length > 0) setProvider(active[0].provider);
      }
    } catch {
      setError('Impossible de charger votre compte.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    if (!user) {
      router.push('/connexion?redirect=/account');
      return;
    }
    if (user.role === 'salon') {
      router.push('/dashboard');
      return;
    }
    void loadData();
  }, [hydrated, user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const status = url.searchParams.get('payment');
    if (!status) return;

    if (status === 'success') {
      setPaymentSyncing(true);
      const timer = setTimeout(() => {
        void loadData().then(() => setPaymentSyncing(false));
      }, 2500);
      url.searchParams.delete('payment');
      window.history.replaceState({}, '', url.toString());
      return () => clearTimeout(timer);
    }
  }, []);

  const paidCredits = useMemo(() => {
    if (!overview) return 0;
    return overview.ledger.filter((item) => item.delta > 0).reduce((acc, item) => acc + item.delta, 0);
  }, [overview]);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const formattedPhone = profile.phoneRaw ? `${profile.dialCode}${profile.phoneRaw}` : '';
      const response = await fetch('/api/account/overview', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: profile.displayName,
          country: profile.country,
          nationality: profile.nationality,
          phone: formattedPhone,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur d’enregistrement.');
      setSaved(true);
      setIsEditing(false);
      if (overview) {
        setOverview({
          ...overview,
          profile: {
            displayName: data.profile.displayName,
            phone: data.profile.phone,
            country: data.profile.country,
            nationality: data.profile.nationality,
          },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau.');
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
        body: JSON.stringify({ provider, purpose: 'credits', productId: packId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Paiement indisponible.');
      if (!data.url) throw new Error('Aucun lien de paiement retourné.');
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Paiement indisponible.');
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
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du salon.');
      setCreatingSalon(false);
    }
  };

  if (!hydrated || !user || user.role !== 'customer' || loading) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen bg-cream text-ink">
      <main className="max-w-[1550px] mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
        {/* Entête d'Accueil */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-card border border-ink/10 shadow-soft">
          <div>
            <p className="font-hand text-2xl text-terracotta">votre espace client</p>
            <h1 className="font-display text-3xl sm:text-4xl mt-1">Bonjour {profile.displayName || user.name}</h1>
            <p className="text-sm text-ink-soft mt-1">Gérez votre profil, vos crédits 3D et vos rendus virtuels en toute sécurité.</p>
          </div>
          <Link
            href="/rituel"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 px-6 rounded-pill bg-terracotta text-white font-bold text-sm shadow-soft hover:bg-terracotta-dark transition-all shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            Essayer une coiffure 3D
          </Link>
        </div>

        {paymentSyncing && (
          <div className="rounded-input border border-terracotta/30 bg-terracotta-wash px-4 py-3 text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-terracotta" />
            Paiement reçu. Synchronisation du solde de vos crédits…
          </div>
        )}
        {error && <div className="rounded-input border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

        {/* 4 Cartes de Statistiques Équilibrées */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Crédits disponibles', value: overview?.wallet.balance ?? 0, icon: Wallet, badge: 'Solde actuel' },
            { label: 'Crédits accumulés', value: paidCredits, icon: BadgeCent, badge: 'Total acheté' },
            { label: 'Rendus 3D créés', value: overview?.heads.length ?? 0, icon: Images, badge: 'Essais enregistrés' },
            { label: 'Achats effectués', value: overview?.payments.length ?? 0, icon: CreditCard, badge: 'Transactions' },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-card border border-ink/10 p-5 shadow-soft flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="w-9 h-9 rounded-pill bg-terracotta-wash text-terracotta flex items-center justify-center">
                  <stat.icon className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-soft/70">{stat.badge}</span>
              </div>
              <div className="mt-4">
                <p className="font-display text-3xl text-ink">{stat.value}</p>
                <p className="text-xs font-bold text-ink-soft mt-1">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="bg-card rounded-card border border-ink/10 p-6 sm:p-8 shadow-soft">
          <div className="flex items-center justify-between pb-4 border-b border-ink/10 flex-wrap gap-3">
            <div>
              <h2 className="font-display text-xl">Mon profil</h2>
              <p className="text-xs text-ink-soft mt-0.5">Vos coordonnées permettent de préremplir vos réservations et reçus de paiement.</p>
            </div>
            <div className="flex items-center gap-3">
              {saved && (
                <span className="text-xs font-bold text-scan-success bg-scan-success/10 px-3 py-1.5 rounded-pill inline-flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Enregistré !
                </span>
              )}

              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="min-h-[40px] px-5 rounded-pill border border-ink/15 bg-cream hover:bg-terracotta-wash/50 text-xs font-bold text-ink inline-flex items-center gap-2 shadow-soft transition-all"
                >
                  <Pencil className="w-3.5 h-3.5 text-terracotta" />
                  Modifier mon profil
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="min-h-[40px] px-4 rounded-pill border border-ink/15 bg-cream text-xs font-bold text-ink-soft hover:bg-ink/5"
                >
                  Annuler
                </button>
              )}
            </div>
          </div>

          <form onSubmit={saveProfile} className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <label className="block text-xs font-bold text-ink">
                Votre nom complet
                <input
                  value={profile.displayName}
                  onChange={(event) => setProfile({ ...profile, displayName: event.target.value })}
                  placeholder="Ex: Moussa Sawadogo"
                  required
                  disabled={!isEditing}
                  className={`mt-2 w-full min-h-[48px] rounded-input border border-ink/15 px-4 font-normal text-sm focus:outline-none focus:border-terracotta transition-colors ${
                    !isEditing ? 'bg-cream/60 text-ink/80 cursor-not-allowed border-transparent' : 'bg-cream text-ink'
                  }`}
                />
              </label>

              <label className="block text-xs font-bold text-ink">
                Pays de résidence
                <CountrySelect
                  value={profile.country}
                  onChange={(country) => {
                    const dialCode = getDialCodeForCountry(country);
                    const nationality = getNationalityForCountry(country);
                    setProfile((prev) => ({ ...prev, country, dialCode, nationality }));
                  }}
                  required
                  disabled={!isEditing}
                  className="mt-2 w-full font-normal"
                />
              </label>

              <label className="block text-xs font-bold text-ink">
                Téléphone (Indicatif + Numéro)
                <PhoneInput
                  dialCode={profile.dialCode}
                  onDialCodeChange={(dialCode) => setProfile({ ...profile, dialCode })}
                  phoneNumber={profile.phoneRaw}
                  onPhoneNumberChange={(phoneRaw) => setProfile({ ...profile, phoneRaw })}
                  required
                  disabled={!isEditing}
                  className="mt-2"
                />
              </label>
            </div>

            {isEditing && (
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="min-h-[48px] px-6 rounded-pill border border-ink/15 bg-cream text-ink text-sm font-bold hover:bg-ink/5"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[48px] px-8 rounded-pill bg-terracotta text-white font-bold text-sm shadow-soft hover:bg-terracotta-dark disabled:opacity-50 transition-all"
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer mon profil'}
                </button>
              </div>
            )}
          </form>
        </section>

        {/* Section Recharger mes Crédits */}
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3 flex-wrap bg-card p-6 rounded-card border border-ink/10 shadow-soft">
            <div>
              <h2 className="font-display text-xl">Recharger mes crédits 3D</h2>
              <p className="text-xs text-ink-soft mt-1">Sélectionnez le moyen de paiement et le pack de votre choix.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {providers.map((item) => (
                <button
                  key={item.provider}
                  type="button"
                  onClick={() => setProvider(item.provider)}
                  className={`px-4 min-h-[40px] rounded-pill text-xs font-bold border transition-colors ${
                    provider === item.provider ? 'bg-ink text-white border-ink' : 'bg-cream border-ink/15 text-ink hover:border-terracotta'
                  }`}
                >
                  {item.displayName}
                </button>
              ))}
            </div>
          </div>

          {providers.length === 0 ? (
            <div className="rounded-input border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm">
              Aucun prestataire de paiement n’est actuellement disponible.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {B2C_CREDIT_PACKS.map((pack) => (
                <div
                  key={pack.id}
                  className={`bg-card rounded-card border p-6 shadow-soft flex flex-col justify-between relative ${
                    pack.popular ? 'border-terracotta ring-2 ring-terracotta-wash' : 'border-ink/10'
                  }`}
                >
                  {pack.popular && (
                    <span className="absolute -top-3 right-4 bg-terracotta text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-pill shadow-soft">
                      Le plus populaire
                    </span>
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-[.12em] font-bold text-ink-soft">{pack.name}</p>
                    <p className="font-display text-3xl mt-2 text-ink">{pack.credits} crédits</p>
                    <p className="text-lg text-terracotta font-bold mt-1">{formatFcfa(pack.amountFcfa)} FCFA</p>
                    <p className="text-xs text-ink-soft mt-3">{pack.description}</p>

                    <ul className="mt-4 space-y-2 text-xs text-ink-soft border-t border-ink/10 pt-4">
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-terracotta" /> Crédits valables sans limite de temps
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-terracotta" /> Essayages virtuels et génération 3D
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => void buyCredits(pack.id)}
                    disabled={Boolean(payingPack)}
                    className={`w-full min-h-[46px] mt-6 rounded-pill font-bold text-sm transition-all disabled:opacity-50 ${
                      pack.popular
                        ? 'bg-terracotta text-white hover:bg-terracotta-dark shadow-soft'
                        : 'bg-ink text-white hover:bg-ink-soft'
                    }`}
                  >
                    {payingPack === pack.id ? 'Ouverture de la caisse…' : 'Acheter ce pack'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Rendus 3D & Historique des Mouvements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-card rounded-card border border-ink/10 p-6 shadow-soft">
            <h2 className="font-display text-lg flex items-center gap-2">
              <Images className="w-4 h-4 text-terracotta" /> Mes rendus 3D
            </h2>
            <div className="mt-4 divide-y divide-ink/10">
              {!overview?.heads.length ? (
                <p className="text-sm text-ink-soft py-4">Aucun rendu enregistré pour le moment.</p>
              ) : (
                overview.heads.map((head) => (
                  <div key={head.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-ink">{head.client_name}</p>
                      <p className="text-xs text-ink-soft">{new Date(head.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <a href={head.mesh_3d_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-terracotta hover:underline">
                      Ouvrir en 3D
                    </a>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="bg-card rounded-card border border-ink/10 p-6 shadow-soft">
            <h2 className="font-display text-lg flex items-center gap-2">
              <History className="w-4 h-4 text-terracotta" /> Mouvements de crédits
            </h2>
            <div className="mt-4 divide-y divide-ink/10">
              {!overview?.ledger.length ? (
                <p className="text-sm text-ink-soft py-4">Aucun mouvement de crédits.</p>
              ) : (
                overview.ledger.map((item) => (
                  <div key={item.id} className="py-3 flex justify-between gap-3 text-sm">
                    <span className="text-ink-soft">{item.reason.replaceAll('_', ' ')}</span>
                    <strong className={item.delta > 0 ? 'text-terracotta-dark font-bold' : 'text-ink'}>
                      {item.delta > 0 ? '+' : ''}
                      {item.delta}
                    </strong>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Historique des Paiements */}
        <section className="bg-card rounded-card border border-ink/10 p-6 shadow-soft">
          <h2 className="font-display text-lg flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-terracotta" /> Historique des transactions
          </h2>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-ink-soft border-b border-ink/10">
                  <th className="py-2.5">Prestataire</th>
                  <th>Pack</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {!overview?.payments.length ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-ink-soft">
                      Aucune transaction effectuée.
                    </td>
                  </tr>
                ) : (
                  overview.payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-ink/5">
                      <td className="py-3 font-bold">{payment.provider}</td>
                      <td>{payment.product_id}</td>
                      <td>{formatFcfa(payment.amount_fcfa)} FCFA</td>
                      <td>
                        <span className="px-2 py-0.5 rounded-pill bg-terracotta-wash text-terracotta-dark font-bold">
                          {payment.status}
                        </span>
                      </td>
                      <td>{new Date(payment.created_at).toLocaleDateString('fr-FR')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Module Devenir Espace Salon */}
        <section className="bg-night text-white rounded-card p-6 sm:p-8 shadow-soft">
          <div className="flex items-start gap-3">
            <Store className="w-5 h-5 text-terracotta mt-1 shrink-0" />
            <div>
              <h2 className="font-display text-xl">Vous êtes un salon de coiffure ?</h2>
              <p className="text-sm text-white/70 mt-1">Créez votre espace salon pour gérer vos créneaux, vos coiffeurs et recevoir des réservations directement sur la marketplace Afrofade.</p>
            </div>
          </div>

          <form onSubmit={createSalon} className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <input
              value={salonForm.name}
              onChange={(event) => setSalonForm({ ...salonForm, name: event.target.value })}
              placeholder="Nom du salon (ex: Afro Beauty Bar)"
              required
              className="min-h-[48px] rounded-input bg-white/10 border border-white/20 px-4 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-terracotta"
            />
            <CountrySelect
              value={salonForm.country}
              onChange={(country) => setSalonForm({ ...salonForm, country })}
              required
              className="w-full"
            />
            <input
              value={salonForm.phone}
              onChange={(event) => setSalonForm({ ...salonForm, phone: event.target.value })}
              placeholder="Téléphone professionnel"
              required
              className="min-h-[48px] rounded-input bg-white/10 border border-white/20 px-4 text-white placeholder:text-white/40 text-sm focus:outline-none focus:border-terracotta"
            />
            <button
              disabled={creatingSalon}
              className="md:col-span-3 justify-self-end min-h-[48px] px-8 rounded-pill bg-terracotta text-white font-bold text-sm shadow-soft hover:bg-terracotta-dark disabled:opacity-50 transition-all inline-flex items-center gap-2 mt-2"
            >
              <span>{creatingSalon ? 'Création…' : 'Créer mon espace salon'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
