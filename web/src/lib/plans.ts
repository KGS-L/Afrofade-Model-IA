/**
 * Afrofade — source unique des plans d'abonnement et des badges plan.
 * Consommé par page.tsx (#tarifs) et PricingModal.tsx.
 * Noms exacts attendus par handleSelectPlan : 'PRO' | 'VIP' | 'EXTRA'.
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
      '20 à 30 têtes 3D générées / mois (110 FCFA / tête)',
      'Consultation pré-coupe en direct salon',
      'Catalogue complet de 15+ coupes afro & barbes',
      'Support technique WhatsApp',
    ],
  },
  {
    name: 'VIP',
    price: '4 900 FCFA',
    amount: 4900,
    desc: 'Idéal pour les salons à fort passage (100k+ FCFA/mois)',
    popular: true,
    features: [
      '100 têtes 3D générées / mois (49 FCFA / tête)',
      'Carnet Client 3D (1 Go de stockage cloud)',
      'Téléchargement HD des aperçus pour le client',
      'Carte avant/après partageable WhatsApp',
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
      'Têtes 3D illimitées',
      'Multi-postes tablette / smartphone',
      'Carnet Client 3D illimité',
      'Branding & logo du salon personnalisé',
      'Accès en avant-première aux nouveaux styles 3D',
    ],
  },
];

/** 4900 → « 4 900 » (séparateur espace fine, pas d'espace insécable) */
export function formatFcfa(amount: number): string {
  return String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export type StylePlanLabel = 'PRO' | 'VIP';

/** Plan de rattachement des styles (id du catalogue HairstyleCatalog).
 *  Les styles autrefois « premium » sont rattachés à VIP (décision 2026-08-18 :
 *  suppression du concept premium de l'interface). */
const STYLE_PLAN_BY_ID: { [id: string]: 'PRO' | 'VIP' } = {
  fade_taper_low: 'PRO',
  afro_sponge_twists: 'PRO',
  fade_burst_mohawk: 'VIP',
  locks_short_high_top: 'VIP',
  tresses_cornrows_lines: 'VIP',
  barbe_sculpted_contour: 'VIP',
};

/** Badge plan d'un style : PRO ou VIP */
export function stylePlan(item: { id: string }): StylePlanLabel {
  return STYLE_PLAN_BY_ID[item.id] ?? 'PRO';
}

/** Classes Tailwind du badge plan (grammaire DESIGN.md) */
export const PLAN_BADGE_CLASS: Record<StylePlanLabel, string> = {
  PRO: 'bg-ink-soft text-white',
  VIP: 'bg-terracotta-dark text-white',
};
