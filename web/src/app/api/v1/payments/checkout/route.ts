import { NextRequest, NextResponse } from 'next/server';
import { createGeniusPayPaymentSession } from '@/lib/genius-pay';
import { createMoneyFusionPaymentSession } from '@/lib/money-fusion';
import {
  isPaymentProvider,
  isPaymentProviderEnabled,
  type PaymentProvider,
} from '@/lib/payment-providers';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getServiceSupabase } from '@/lib/supabase';
import { B2C_CREDIT_PACKS } from '@/lib/credits';
import { PLANS, TERMS, monthlyPrice, type PlanName, type TermId } from '@/lib/plans';

function getSubscriptionProduct(planName: unknown, termId: unknown) {
  const plan = PLANS.find((item) => item.name === planName);
  const term = TERMS.find((item) => item.id === termId);
  if (!plan || !term) return null;

  const discountedMonthly = monthlyPrice(plan.amount, term.discount);
  const totalAmount = discountedMonthly * term.months;

  return {
    purpose: 'subscription' as const,
    productId: plan.name,
    termId: term.id,
    label: `Abonnement Afrofade ${plan.name} — ${term.label}`,
    amountFcfa: totalAmount,
    metadata: {
      planName: plan.name,
      termId: term.id,
      months: String(term.months),
      monthlyFcfa: String(discountedMonthly),
    },
  };
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

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizePhone(value: unknown): string | undefined {
  const input = normalizeOptionalString(value);
  if (!input) return undefined;

  const normalized = input.replace(/[\s()-]/g, '');
  if (!/^\+?[0-9]{8,20}$/.test(normalized)) return undefined;
  return normalized;
}

function articleKey(productId: string): string {
  return `afrofade_${productId}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
}

function resolveProvider(value: unknown): PaymentProvider {
  return isPaymentProvider(value) ? value : 'money_fusion';
}

export async function POST(req: NextRequest) {
  let supabaseAdmin: ReturnType<typeof getServiceSupabase>;
  try {
    supabaseAdmin = getServiceSupabase();
  } catch (error) {
    console.error('[Checkout] Supabase server credentials missing:', error);
    return NextResponse.json({ error: 'Paiement temporairement indisponible.' }, { status: 503 });
  }

  let paymentId: string | null = null;

  try {
    const principal = await getVerifiedPrincipal(req);
    if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });

    const body = await req.json();
    const provider = resolveProvider(body?.provider);
    if (!isPaymentProviderEnabled(provider)) {
      return NextResponse.json({ error: 'Prestataire de paiement indisponible.' }, { status: 503 });
    }

    const purpose = body?.purpose === 'credits' ? 'credits' : 'subscription';
    if (purpose === 'subscription' && (!principal.salonId || principal.role === 'customer')) {
      return NextResponse.json({ error: 'Un profil salon vérifié est requis pour souscrire.' }, { status: 403 });
    }

    const product =
      purpose === 'credits'
        ? getCreditProduct(body?.packId)
        : getSubscriptionProduct(body?.planName as PlanName, body?.termId as TermId);

    if (!product) return NextResponse.json({ error: 'Produit ou durée invalide.' }, { status: 400 });

    let salon: { name?: string | null; phone?: string | null } | null = null;
    if (principal.salonId) {
      const { data, error } = await supabaseAdmin
        .from('salons')
        .select('name, phone')
        .eq('id', principal.salonId)
        .maybeSingle();
      if (error) throw new Error(`Unable to load salon contact: ${error.message}`);
      salon = data;
    }

    const metadata = principal.user.user_metadata || {};
    const customerName =
      normalizeOptionalString(salon?.name) ||
      normalizeOptionalString(metadata.full_name) ||
      normalizeOptionalString(metadata.name) ||
      principal.user.email ||
      'Client Afrofade';
    const customerPhone =
      normalizePhone(salon?.phone) ||
      normalizePhone(metadata.phone) ||
      normalizePhone(body?.customerPhone);

    if (provider === 'money_fusion' && !customerPhone) {
      return NextResponse.json(
        { error: 'Un numéro de téléphone valide est requis pour Money Fusion.' },
        { status: 400 }
      );
    }

    const { data: payment, error: insertError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        user_id: principal.user.id,
        salon_id: principal.salonId,
        provider,
        purpose: product.purpose,
        product_id: product.productId,
        term_id: product.termId,
        amount_fcfa: product.amountFcfa,
        status: 'pending',
        metadata: product.metadata,
      })
      .select('id')
      .single();

    if (insertError || !payment) throw new Error(insertError?.message || 'Unable to create payment transaction.');
    paymentId = payment.id;

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://afrofade.pro').replace(/\/$/, '');
    const returnBase = `${appUrl}/dashboard`;
    const commonProviderMetadata = {
      paymentId: payment.id,
      userId: principal.user.id,
      purpose: product.purpose,
      productId: product.productId,
      ...(product.termId ? { termId: product.termId } : {}),
    };

    let providerToken: string;
    let checkoutUrl: string;

    if (provider === 'money_fusion') {
      const session = await createMoneyFusionPaymentSession({
        totalPrice: product.amountFcfa,
        article: [{ [articleKey(product.productId)]: product.amountFcfa }],
        personal_Info: [commonProviderMetadata],
        numeroSend: customerPhone!,
        nomclient: customerName,
        return_url: `${returnBase}?payment=pending&provider=money_fusion&payment_id=${payment.id}`,
        webhook_url: `${appUrl}/api/webhooks/money-fusion`,
      });
      providerToken = session.token!;
      checkoutUrl = session.url!;
    } else {
      const session = await createGeniusPayPaymentSession({
        amount: product.amountFcfa,
        currency: 'XOF',
        description: product.label,
        customer: {
          name: customerName,
          email: principal.user.email || undefined,
          phone: customerPhone,
        },
        success_url: `${returnBase}?payment=pending&provider=genius_pay&payment_id=${payment.id}`,
        error_url: `${returnBase}?payment=cancelled&provider=genius_pay&payment_id=${payment.id}`,
        metadata: commonProviderMetadata,
      });
      providerToken = session.reference;
      checkoutUrl = session.url;
    }

    const { error: updateError } = await supabaseAdmin
      .from('payment_transactions')
      .update({ provider_token: providerToken, updated_at: new Date().toISOString() })
      .eq('id', payment.id)
      .eq('status', 'pending');

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({
      url: checkoutUrl,
      paymentId: payment.id,
      provider,
    });
  } catch (error) {
    console.error('[Payment Checkout Route Error]:', error);
    if (paymentId) {
      await supabaseAdmin
        .from('payment_transactions')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', paymentId)
        .eq('status', 'pending');
    }
    return NextResponse.json({ error: 'Échec de la génération de la session de paiement.' }, { status: 500 });
  }
}
