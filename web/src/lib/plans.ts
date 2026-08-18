/**
 * Afrofade — source unique des plans d'abonnement Salons (B2B) et badges.
 * Consommé par page.tsx (#tarifs) et PricingModal.tsx.
 * Noms exacts attendus : 'PRO' | 'VIP' | 'EXTRA'.
 */

export type PlanName = 'PRO' | 'VIP' | 'EXTRA';

export interface PlanInfo {
  name: PlanName;
  price: string;
  amount: number;
  desc: string;
  popular: boolean;
  features: string[];
}

export const PLANS: PlanInfo[] = [
  {
    name: 'PRO',
    price: '2 200 FCFA',
    amount: 2200,
    desc: 'Pour les barbiers indépendants & petits salons',
    popular: false,
    features: [
      '20 nouveaux clients 3D / mois',
      'Essayages de coiffures illimités sur têtes créées',
      'Catalogue de coiffures Afro (Fades, Tapers, Cuts)',
      'Consultation pré-coupe en direct salon',
      'Carnet client basique',
      'Support technique WhatsApp',
    ],
  },
  {
    name: 'VIP',
    price: '4 900 FCFA',
    amount: 4900,
    desc: 'Idéal pour les salons à fort passage',
    popular: true,
    features: [
      '60 nouveaux clients 3D / mois',
      'Essayages de coiffures illimités sur têtes créées',
      'Catalogue complet (Afro, Braids, Locks, Twists)',
      'Carnet client avec stockage Cloud (1 Go)',
      'Téléchargement HD des aperçus pour le client',
      'Cartes avant/après partageables WhatsApp',
      'Support prioritaire 7j/7',
    ],
  },
  {
    name: 'EXTRA',
    price: '7 500 FCFA',
    amount: 7500,
    desc: 'Pour les grands salons & franchises',
    popular: false,
    features: [
      '120 nouveaux clients 3D / mois',
      'Essayages de coiffures illimités sur têtes créées',
      'Multi-postes tablette / smartphone',
      'Carnet client étendu',
      'Branding & logo du salon personnalisé',
      'Accès anticipé aux nouvelles coiffures 3D',
      'Support prioritaire dédié 7j/7',
    ],
  },
];

/** 4900 → « 4 900 » */
export function formatFcfa(amount: number): string {
  return String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export type StylePlanLabel = 'PRO' | 'VIP';

const STYLE_PLAN_BY_ID: { [id: string]: 'PRO' | 'VIP' } = {
  fade_taper_low: 'PRO',
  afro_sponge_twists: 'PRO',
  fade_burst_mohawk: 'VIP',
  locks_short_high_top: 'VIP',
  tresses_cornrows_lines: 'VIP',
  barbe_sculpted_contour: 'VIP',
};

export function stylePlan(item: { id: string }): StylePlanLabel {
  return STYLE_PLAN_BY_ID[item.id] ?? 'PRO';
}

export const PLAN_BADGE_CLASS: Record<StylePlanLabel, string> = {
  PRO: 'bg-ink-soft text-white',
  VIP: 'bg-terracotta-dark text-white',
};

export interface SalonProfileFields {
  salonName: string;
  country: string;
  phone: string;
}

export function profileCompletion(profile: Partial<SalonProfileFields>): number {
  const fields = [profile.salonName, profile.country, profile.phone];
  const filled = fields.filter((f) => Boolean(f && f.trim())).length;
  return Math.round((filled / fields.length) * 100);
}

export function isProfileComplete(profile: Partial<SalonProfileFields>): boolean {
  return profileCompletion(profile) === 100;
}

export type TermId = 'mensuel' | '3mois' | '6mois' | 'annuel';

export const TERMS: {
  id: TermId;
  label: string;
  months: number;
  discount: number;
  hint: string;
}[] = [
  { id: 'mensuel', label: 'Mensuel', months: 1, discount: 0, hint: 'Sans engagement' },
  { id: '3mois', label: '3 mois', months: 3, discount: 0.1, hint: '−10 % pendant 3 mois' },
  { id: '6mois', label: '6 mois', months: 6, discount: 0.25, hint: '−25 % pendant 6 mois' },
  { id: 'annuel', label: 'Annuel', months: 12, discount: 0.4, hint: '−40 % pendant 1 an' },
];

export function monthlyPrice(amountFcfa: number, discount: number): number {
  return Math.round(amountFcfa * (1 - discount));
}
