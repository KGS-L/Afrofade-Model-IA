import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getVerifiedPrincipal, verifyAccessToken } from '@/lib/server-auth';
import { getServiceSupabase } from '@/lib/supabase';

const COOKIE_NAME = 'afrofade_session';
const VALID_PLANS = new Set(['PRO', 'VIP', 'EXTRA']);
const VALID_TERMS = new Set(['mensuel', 'trimestre', 'semestre', 'annuel']);

type Principal = NonNullable<Awaited<ReturnType<typeof getVerifiedPrincipal>>>;

async function getBillingState(principal: Principal) {
  if (!principal.salonId) {
    return { subscription: null, everSubscribed: false };
  }

  const supabaseAdmin = getServiceSupabase();
  const now = new Date().toISOString();

  const [salonResult, activeSubscriptionResult, lastPaymentResult] = await Promise.all([
    supabaseAdmin
      .from('salons')
      .select('plan')
      .eq('id', principal.salonId)
      .maybeSingle(),
    supabaseAdmin
      .from('subscriptions')
      .select('amount_fcfa, status, expires_at, created_at')
      .eq('salon_id', principal.salonId)
      .eq('status', 'active')
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('payment_transactions')
      .select('product_id, term_id, amount_fcfa, metadata, paid_at, created_at')
      .eq('salon_id', principal.salonId)
      .eq('purpose', 'subscription')
      .eq('status', 'paid')
      .order('paid_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (salonResult.error) console.warn('[Auth Session] Unable to load salon plan:', salonResult.error.message);
  if (activeSubscriptionResult.error) {
    console.warn('[Auth Session] Unable to load active subscription:', activeSubscriptionResult.error.message);
  }
  if (lastPaymentResult.error) {
    console.warn('[Auth Session] Unable to load subscription payment:', lastPaymentResult.error.message);
  }

  const activeSubscription = activeSubscriptionResult.data;
  const payment = lastPaymentResult.data;
  const everSubscribed = Boolean(activeSubscription || payment);

  if (!activeSubscription) {
    return { subscription: null, everSubscribed };
  }

  const productPlan = typeof payment?.product_id === 'string' ? payment.product_id : '';
  const salonPlan = typeof salonResult.data?.plan === 'string' ? salonResult.data.plan : '';
  const plan = VALID_PLANS.has(productPlan) ? productPlan : VALID_PLANS.has(salonPlan) ? salonPlan : 'PRO';

  const paymentTerm = typeof payment?.term_id === 'string' ? payment.term_id : '';
  const term = VALID_TERMS.has(paymentTerm) ? paymentTerm : 'mensuel';

  const monthlyFromMetadata = Number(payment?.metadata?.monthlyFcfa);
  const monthlyFcfa =
    Number.isFinite(monthlyFromMetadata) && monthlyFromMetadata > 0
      ? monthlyFromMetadata
      : Number(payment?.amount_fcfa || activeSubscription.amount_fcfa || 0);

  return {
    everSubscribed,
    subscription: {
      plan,
      term,
      monthlyFcfa,
      startedAt: payment?.paid_at || payment?.created_at || activeSubscription.created_at,
      isFirstWithDiscount: term !== 'mensuel',
    },
  };
}

async function publicPrincipal(principal: Principal) {
  const billing = await getBillingState(principal);

  return {
    id: principal.user.id,
    email: principal.user.email ?? '',
    name:
      principal.user.user_metadata?.full_name ||
      principal.user.user_metadata?.name ||
      principal.user.email?.split('@')[0] ||
      'Utilisateur',
    role: principal.role,
    salonId: principal.salonId,
    subscription: billing.subscription,
    everSubscribed: billing.everSubscribed,
  };
}

export async function GET(request: NextRequest) {
  try {
    const principal = await getVerifiedPrincipal(request);
    if (!principal) return NextResponse.json({ authenticated: false }, { status: 401 });
    return NextResponse.json({ authenticated: true, user: await publicPrincipal(principal) });
  } catch (error) {
    console.error('[Auth Session] GET failed:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accessToken = typeof body?.accessToken === 'string' ? body.accessToken.trim() : '';
    if (!accessToken) return NextResponse.json({ error: 'Access token required.' }, { status: 400 });

    const principal = await verifyAccessToken(accessToken);
    if (!principal) return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });

    const response = NextResponse.json({ authenticated: true, user: await publicPrincipal(principal) });
    response.cookies.set(COOKIE_NAME, accessToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    console.error('[Auth Session] POST failed:', error);
    return NextResponse.json({ error: 'Unable to establish session.' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, '', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
  });
  return response;
}
