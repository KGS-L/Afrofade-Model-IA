import { NextRequest, NextResponse } from 'next/server';
import { createGeniusPayPaymentSession } from '@/lib/genius-pay';
import { createMoneyFusionPaymentSession } from '@/lib/money-fusion';
import { getOperationalPaymentProviders, isPaymentProvider, type PaymentProvider } from '@/lib/payment-providers';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getServiceSupabase } from '@/lib/supabase';
import { B2C_CREDIT_PACKS } from '@/lib/credits';
import {
  getMarketplaceSubscriptionProduct,
  legacySalonProductId,
  priceSubscription,
  type MarketplaceSubscriptionProduct,
} from '@/lib/marketplace-plans';
import type { TermId } from '@/lib/plans';

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}
function normalizePhone(value: unknown) {
  const input = normalizeOptionalString(value);
  if (!input) return undefined;
  const normalized = input.replace(/[\s()-]/g, '');
  return /^\+?[0-9]{8,20}$/.test(normalized) ? normalized : undefined;
}
function articleKey(productId: string) {
  return `afrofade_${productId}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
}
function resolveProvider(value: unknown): PaymentProvider {
  return isPaymentProvider(value) ? value : 'money_fusion';
}
function getCreditProduct(packId: unknown) {
  const pack = B2C_CREDIT_PACKS.find((item) => item.id === packId);
  if (!pack) return null;
  return {
    purpose: 'credits' as const,
    productId: pack.id,
    termId: null,
    label: `Afrofade ${pack.name} — ${pack.credits} crédits`,
    amountFcfa: pack.amountFcfa,
    metadata: { packId: pack.id, credits: String(pack.credits) },
  };
}

async function resolveSalonSubscriptionContext(
  supabaseAdmin: ReturnType<typeof getServiceSupabase>,
  userId: string,
  legacySalonId: string | null,
  requestedSalonId: unknown,
) {
  const salonId = normalizeOptionalString(requestedSalonId) || legacySalonId || '';
  if (!salonId) return null;
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('salon_memberships')
    .select('role, status')
    .eq('salon_id', salonId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();
  if (membershipError && membershipError.code !== 'PGRST116') throw new Error(membershipError.message);
  const allowedByMembership = membership?.role === 'owner' || membership?.role === 'manager';
  const allowedByLegacyCompatibility = legacySalonId === salonId;
  if (!allowedByMembership && !allowedByLegacyCompatibility) return null;
  const { data: salon, error } = await supabaseAdmin
    .from('salons')
    .select('id, name, phone, country')
    .eq('id', salonId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return salon ? { salonId, salon } : null;
}

export async function POST(req: NextRequest) {
  let supabaseAdmin: ReturnType<typeof getServiceSupabase>;
  try { supabaseAdmin = getServiceSupabase(); }
  catch (error) {
    console.error('[Checkout] Supabase server credentials missing:', error);
    return NextResponse.json({ error: 'Paiement temporairement indisponible.' }, { status: 503 });
  }

  let paymentId: string | null = null;
  try {
    const principal = await getVerifiedPrincipal(req);
    if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    if (!principal.profileConfigured) return NextResponse.json({ error: 'Finalisez votre profil avant de payer.', needsOnboarding: true }, { status: 409 });

    const body = await req.json();
    const provider = resolveProvider(body?.provider);
    const operationalProviders = await getOperationalPaymentProviders(supabaseAdmin);
    if (!operationalProviders.includes(provider)) return NextResponse.json({ error: 'Prestataire de paiement désactivé ou non configuré.' }, { status: 503 });
    if (body?.purpose !== 'credits' && body?.purpose !== 'subscription') return NextResponse.json({ error: 'Type de paiement invalide.' }, { status: 400 });

    const purpose = body.purpose as 'credits' | 'subscription';
    if (principal.role === 'admin') return NextResponse.json({ error: 'Utilisez un compte utilisateur pour les achats personnels ou professionnels.' }, { status: 403 });

    let product: { purpose: 'credits' | 'subscription'; productId: string; termId: string | null; label: string; amountFcfa: number; metadata: Record<string, string> } | null = null;
    let salonContext: { salonId: string; salon: { id: string; name?: string | null; phone?: string | null; country?: string | null } } | null = null;
    let professionalProfile: { id: string; professional_name?: string | null } | null = null;
    let discountEligible = false;

    if (purpose === 'credits') {
      product = getCreditProduct(body?.packId);
    } else {
      const stableProductId = normalizeOptionalString(body?.subscriptionProductId) || legacySalonProductId(body?.planName);
      const subscriptionProduct = getMarketplaceSubscriptionProduct(stableProductId);
      if (!subscriptionProduct) return NextResponse.json({ error: 'Produit d’abonnement invalide.' }, { status: 400 });
      if (!subscriptionProduct.enabled || !subscriptionProduct.amountFcfa) {
        return NextResponse.json({ error: 'Cette offre n’est pas encore activée commercialement.' }, { status: 409 });
      }
      const termId = body?.termId as TermId;

      if (subscriptionProduct.subjectType === 'professional') {
        const requestedProfileId = normalizeOptionalString(body?.professionalProfileId);
        let query = supabaseAdmin.from('professional_profiles').select('id, professional_name').eq('user_id', principal.user.id);
        if (requestedProfileId) query = query.eq('id', requestedProfileId);
        const { data, error } = await query.maybeSingle();
        if (error && error.code !== 'PGRST116') throw new Error(error.message);
        if (!data) return NextResponse.json({ error: 'Créez d’abord votre profil professionnel.' }, { status: 409 });
        professionalProfile = data;
        const priced = priceSubscription(subscriptionProduct, termId, false);
        if (!priced) return NextResponse.json({ error: 'Durée d’abonnement invalide.' }, { status: 400 });
        product = {
          purpose: 'subscription', productId: subscriptionProduct.id, termId,
          label: `${subscriptionProduct.label} — ${priced.months} mois`, amountFcfa: priced.amountFcfa,
          metadata: {
            subjectType: 'professional', professionalProfileId: data.id,
            months: String(priced.months), monthlyFcfa: String(priced.monthlyFcfa), discountApplied: String(priced.discount),
          },
        };
      } else {
        salonContext = await resolveSalonSubscriptionContext(supabaseAdmin, principal.user.id, principal.salonId, body?.salonId);
        if (!salonContext) return NextResponse.json({ error: 'Vous ne pouvez pas souscrire pour ce salon.' }, { status: 403 });
        const { data: previousPayment, error: previousPaymentError } = await supabaseAdmin
          .from('payment_transactions').select('id').eq('salon_id', salonContext.salonId).eq('purpose', 'subscription').eq('status', 'paid').limit(1).maybeSingle();
        if (previousPaymentError) throw new Error(previousPaymentError.message);
        discountEligible = Boolean(normalizeOptionalString(salonContext.salon.name) && normalizeOptionalString(salonContext.salon.country) && normalizePhone(salonContext.salon.phone) && !previousPayment);
        const priced = priceSubscription(subscriptionProduct, termId, discountEligible);
        if (!priced) return NextResponse.json({ error: 'Durée d’abonnement invalide.' }, { status: 400 });
        product = {
          purpose: 'subscription', productId: subscriptionProduct.id, termId,
          label: `${subscriptionProduct.label} — ${priced.months} mois`, amountFcfa: priced.amountFcfa,
          metadata: {
            subjectType: 'salon', salonId: salonContext.salonId,
            legacyPlanName: subscriptionProduct.legacySalonPlan || '', months: String(priced.months),
            monthlyFcfa: String(priced.monthlyFcfa), discountApplied: String(priced.discount),
          },
        };
      }
    }

    if (!product) return NextResponse.json({ error: 'Produit ou durée invalide.' }, { status: 400 });

    const { data: customerProfile, error: customerProfileError } = await supabaseAdmin
      .from('customer_profiles').select('display_name, phone').eq('user_id', principal.user.id).maybeSingle();
    if (customerProfileError && customerProfileError.code !== 'PGRST116') throw new Error(customerProfileError.message);
    const metadata = principal.user.user_metadata || {};
    const customerName = normalizeOptionalString(salonContext?.salon.name)
      || normalizeOptionalString(professionalProfile?.professional_name)
      || normalizeOptionalString(customerProfile?.display_name)
      || normalizeOptionalString(metadata.full_name)
      || normalizeOptionalString(metadata.name)
      || normalizeOptionalString(body?.customerName)
      || principal.user.email || 'Client Afrofade';
    const customerPhone = normalizePhone(salonContext?.salon.phone)
      || normalizePhone(customerProfile?.phone)
      || normalizePhone(metadata.phone)
      || normalizePhone(body?.customerPhone);
    if (provider === 'money_fusion' && !customerPhone) return NextResponse.json({ error: 'Ajoutez un numéro de téléphone valide avant de payer avec Money Fusion.' }, { status: 400 });

    const { data: payment, error: insertError } = await supabaseAdmin.from('payment_transactions').insert({
      user_id: principal.user.id,
      salon_id: salonContext?.salonId ?? null,
      provider,
      purpose: product.purpose,
      product_id: product.productId,
      term_id: product.termId,
      amount_fcfa: product.amountFcfa,
      status: 'pending',
      metadata: product.metadata,
    }).select('id').single();
    if (insertError || !payment) throw new Error(insertError?.message || 'Unable to create payment transaction.');
    paymentId = payment.id;

    const forwardedHost = req.headers.get('x-forwarded-host');
    const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || (forwardedHost ? `${forwardedProto}://${forwardedHost}` : req.nextUrl.origin)).replace(/\/$/, '');
    const returnPath = purpose === 'credits' ? '/account' : professionalProfile ? '/pro/onboarding' : '/dashboard';
    const returnBase = `${appUrl}${returnPath}`;
    const commonProviderMetadata = {
      paymentId: payment.id, userId: principal.user.id, purpose: product.purpose, productId: product.productId,
      ...(product.termId ? { termId: product.termId } : {}),
    };

    let providerToken: string;
    let checkoutUrl: string;
    if (provider === 'money_fusion') {
      const session = await createMoneyFusionPaymentSession({
        totalPrice: product.amountFcfa,
        article: [{ [articleKey(product.productId)]: product.amountFcfa }],
        personal_Info: [commonProviderMetadata], numeroSend: customerPhone!, nomclient: customerName,
        return_url: `${returnBase}?payment=pending&provider=money_fusion&payment_id=${payment.id}`,
        webhook_url: `${appUrl}/api/webhooks/money-fusion`,
      });
      providerToken = session.token!; checkoutUrl = session.url!;
    } else {
      const session = await createGeniusPayPaymentSession({
        amount: product.amountFcfa, currency: 'XOF', description: product.label,
        customer: { name: customerName, email: principal.user.email || undefined, phone: customerPhone },
        success_url: `${returnBase}?payment=pending&provider=genius_pay&payment_id=${payment.id}`,
        error_url: `${returnBase}?payment=cancelled&provider=genius_pay&payment_id=${payment.id}`,
        metadata: commonProviderMetadata,
      });
      providerToken = session.reference; checkoutUrl = session.url;
    }

    const { error: updateError } = await supabaseAdmin.from('payment_transactions')
      .update({ provider_token: providerToken, updated_at: new Date().toISOString() })
      .eq('id', payment.id).eq('status', 'pending');
    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ url: checkoutUrl, paymentId: payment.id, provider, discountEligible: purpose === 'subscription' ? discountEligible : undefined });
  } catch (error) {
    console.error('[Payment Checkout Route Error]:', error);
    if (paymentId) await supabaseAdmin.from('payment_transactions').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', paymentId).eq('status', 'pending');
    return NextResponse.json({ error: 'Échec de la génération de la session de paiement.' }, { status: 500 });
  }
}
