import 'server-only';
import { PLANS, TERMS, monthlyPrice, type PlanName, type TermId } from '@/lib/plans';

export type MarketplaceSubscriptionProductId =
  | 'PROFESSIONAL_PRO'
  | 'SALON_PRO'
  | 'SALON_VIP'
  | 'SALON_EXTRA'
  | 'BUSINESS_MULTI_LOCATION';

export type MarketplaceSubjectType = 'professional' | 'salon';

export interface MarketplaceSubscriptionProduct {
  id: MarketplaceSubscriptionProductId;
  subjectType: MarketplaceSubjectType;
  label: string;
  amountFcfa: number | null;
  enabled: boolean;
  legacySalonPlan?: PlanName;
  capabilities: string[];
}

function positiveEnvInt(name: string): number | null {
  const raw = process.env[name];
  if (!raw) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function salonProduct(planName: PlanName, id: MarketplaceSubscriptionProductId, capabilities: string[]): MarketplaceSubscriptionProduct {
  const plan = PLANS.find((item) => item.name === planName);
  if (!plan) throw new Error(`Missing legacy salon plan ${planName}`);
  return { id, subjectType: 'salon', label: `Afrofade Salon ${planName}`, amountFcfa: plan.amount, enabled: true, legacySalonPlan: planName, capabilities };
}

export function getMarketplaceSubscriptionCatalog(): MarketplaceSubscriptionProduct[] {
  const professionalPrice = positiveEnvInt('PROFESSIONAL_PRO_PRICE_FCFA');
  const businessPrice = positiveEnvInt('BUSINESS_MULTI_LOCATION_PRICE_FCFA');
  return [
    {
      id: 'PROFESSIONAL_PRO', subjectType: 'professional', label: 'Afrofade Professional Pro',
      amountFcfa: professionalPrice, enabled: professionalPrice !== null,
      capabilities: ['professional.independent.list', 'professional.independent.book', 'portfolio.manage', 'career.apply'],
    },
    salonProduct('PRO', 'SALON_PRO', ['salon.marketplace.list', 'salon.booking.work', 'salon.team.manage', 'tryon.salon.use']),
    salonProduct('VIP', 'SALON_VIP', ['salon.marketplace.list', 'salon.booking.work', 'salon.team.manage', 'salon.analytics.view', 'tryon.salon.use']),
    salonProduct('EXTRA', 'SALON_EXTRA', ['salon.marketplace.list', 'salon.booking.work', 'salon.team.manage', 'salon.analytics.view', 'salon.location.create', 'tryon.salon.use']),
    {
      id: 'BUSINESS_MULTI_LOCATION', subjectType: 'salon', label: 'Afrofade Business Multi-location',
      amountFcfa: businessPrice, enabled: businessPrice !== null, legacySalonPlan: 'EXTRA',
      capabilities: ['salon.marketplace.list', 'salon.booking.work', 'salon.team.manage', 'salon.analytics.view', 'salon.location.create', 'salon.multi_location.manage', 'career.post_job', 'tryon.salon.use'],
    },
  ];
}

export function getMarketplaceSubscriptionProduct(id: unknown): MarketplaceSubscriptionProduct | null {
  return typeof id === 'string' ? getMarketplaceSubscriptionCatalog().find((item) => item.id === id) ?? null : null;
}

export function legacySalonProductId(plan: unknown): MarketplaceSubscriptionProductId | null {
  if (plan === 'PRO') return 'SALON_PRO';
  if (plan === 'VIP') return 'SALON_VIP';
  if (plan === 'EXTRA') return 'SALON_EXTRA';
  return null;
}

export function getSubscriptionTerm(termId: unknown): (typeof TERMS)[number] | null {
  return TERMS.find((item) => item.id === termId) ?? null;
}

export function priceSubscription(product: MarketplaceSubscriptionProduct, termId: TermId, discountEligible: boolean) {
  if (!product.enabled || !product.amountFcfa) return null;
  const term = getSubscriptionTerm(termId);
  if (!term) return null;
  const discount = discountEligible ? term.discount : 0;
  const monthlyFcfa = monthlyPrice(product.amountFcfa, discount);
  return { amountFcfa: monthlyFcfa * term.months, months: term.months, monthlyFcfa, discount };
}
