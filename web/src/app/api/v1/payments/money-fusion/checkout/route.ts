import { NextRequest, NextResponse } from 'next/server';
import { createMoneyFusionPaymentSession } from '@/lib/money-fusion';
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
    metadata: {
      packId: pack.id,
      credits: String(pack.credits),
    },
  };
}

export async function POST(req: NextRequest) {
  const supabaseAdmin = getServiceSupabase();
  let paymentId: string | null = null;

  try {
    const principal = await getVerifiedPrincipal(req);
    if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });

    const body = await req.json();
    const purpose = body?.purpose === 'credits' ? 'credits' : 'subscription';
    const product =
      purpose === 'credits'
        ? getCreditProduct(body?.packId)
        : getSubscriptionProduct(body?.planName as PlanName, body?.termId as TermId);

    if (!product) {
      return NextResponse.json({ error: 'Produit ou durée invalide.' }, { status: 400 });
    }

    const { data: payment, error: insertError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        user_id: principal.user.id,
        salon_id: principal.salonId,
        provider: 'money_fusion',
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://afrofade.pro';
    const session = await createMoneyFusionPaymentSession({
      totalPrice: product.amountFcfa,
      article: [{ name: product.label, price: product.amountFcfa }],
      personal_info: [{ client_name: principal.user.user_metadata?.full_name || principal.user.email || 'Client Afrofade' }],
      return_url: `${appUrl}/dashboard?payment=pending&provider=money_fusion&payment_id=${payment.id}`,
      cancel_url: `${appUrl}/dashboard?payment=cancelled&payment_id=${payment.id}`,
      custom_metadata: {
        paymentId: payment.id,
        userId: principal.user.id,
        purpose: product.purpose,
        productId: product.productId,
        ...(product.termId ? { termId: product.termId } : {}),
      },
    });

    const { error: updateError } = await supabaseAdmin
      .from('payment_transactions')
      .update({ provider_token: session.token, updated_at: new Date().toISOString() })
      .eq('id', payment.id)
      .eq('status', 'pending');

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ url: session.url, paymentId: payment.id });
  } catch (error) {
    console.error('[Money Fusion Checkout Route Error]:', error);
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
