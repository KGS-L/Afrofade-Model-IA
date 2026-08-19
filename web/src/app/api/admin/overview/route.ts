import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getServiceSupabase } from '@/lib/supabase';
import { getPaymentProviderStates } from '@/lib/payment-providers';

type PlanKey = 'PRO' | 'VIP' | 'EXTRA';
type RoleKey = 'customer' | 'salon' | 'admin';

function isPlanKey(value: unknown): value is PlanKey {
  return value === 'PRO' || value === 'VIP' || value === 'EXTRA';
}

function isRoleKey(value: unknown): value is RoleKey {
  return value === 'customer' || value === 'salon' || value === 'admin';
}

export async function GET(req: NextRequest) {
  try {
    const principal = await getVerifiedPrincipal(req);
    if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    if (!principal.profileConfigured || principal.role !== 'admin') return NextResponse.json({ error: 'Accès administrateur requis.' }, { status: 403 });

    const supabaseAdmin = getServiceSupabase();
    const now = new Date().toISOString();
    const [salonsResult, rolesResult, activeSubscriptionsResult, paidPaymentsResult, recentSalonsResult, jobsResult, headsResult, providerStates] = await Promise.all([
      supabaseAdmin.from('salons').select('plan'),
      supabaseAdmin.from('user_profiles').select('role'),
      supabaseAdmin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active').gt('expires_at', now),
      supabaseAdmin.from('payment_transactions').select('id, provider, purpose, amount_fcfa, paid_at, created_at').eq('status', 'paid'),
      supabaseAdmin.from('salons').select('id, name, country, plan, created_at').order('created_at', { ascending: false }).limit(10),
      supabaseAdmin.from('ai_jobs').select('status'),
      supabaseAdmin.from('head_assets').select('*', { count: 'exact', head: true }),
      getPaymentProviderStates(supabaseAdmin),
    ]);
    for (const result of [salonsResult, rolesResult, activeSubscriptionsResult, paidPaymentsResult, recentSalonsResult, jobsResult, headsResult]) {
      if (result.error) throw new Error(result.error.message);
    }

    const planDistribution: Record<PlanKey, number> = { PRO: 0, VIP: 0, EXTRA: 0 };
    for (const salon of salonsResult.data || []) {
      if (isPlanKey(salon.plan)) planDistribution[salon.plan] += 1;
    }

    const roleDistribution: Record<RoleKey, number> = { customer: 0, salon: 0, admin: 0 };
    for (const profile of rolesResult.data || []) {
      if (isRoleKey(profile.role)) roleDistribution[profile.role] += 1;
    }

    const payments = paidPaymentsResult.data || [];
    const totalRevenueFcfa = payments.reduce((sum, payment) => sum + Number(payment.amount_fcfa || 0), 0);
    const subscriptionRevenueFcfa = payments.filter((payment) => payment.purpose === 'subscription').reduce((sum, payment) => sum + Number(payment.amount_fcfa || 0), 0);
    const creditRevenueFcfa = payments.filter((payment) => payment.purpose === 'credits').reduce((sum, payment) => sum + Number(payment.amount_fcfa || 0), 0);
    const providerMetrics = new Map<string, { paidTransactions: number; revenueFcfa: number }>();
    for (const payment of payments) {
      const current = providerMetrics.get(payment.provider) || { paidTransactions: 0, revenueFcfa: 0 };
      current.paidTransactions += 1;
      current.revenueFcfa += Number(payment.amount_fcfa || 0);
      providerMetrics.set(payment.provider, current);
    }

    const recentSalons = recentSalonsResult.data || [];
    const recentIds = recentSalons.map((salon) => salon.id);
    let activeSalonIds = new Set<string>();
    if (recentIds.length) {
      const { data, error } = await supabaseAdmin.from('subscriptions').select('salon_id').in('salon_id', recentIds).eq('status', 'active').gt('expires_at', now);
      if (error) throw new Error(error.message);
      activeSalonIds = new Set((data || []).map((item) => item.salon_id));
    }

    const jobs = { queued: 0, running: 0, failed: 0, completed: 0 };
    for (const job of jobsResult.data || []) {
      if (job.status in jobs) jobs[job.status as keyof typeof jobs] += 1;
    }

    return NextResponse.json({
      kpis: {
        salons: salonsResult.data?.length ?? 0,
        users: rolesResult.data?.length ?? 0,
        activeSubscriptions: activeSubscriptionsResult.count ?? 0,
        paidTransactions: payments.length,
        totalRevenueFcfa,
        subscriptionRevenueFcfa,
        creditRevenueFcfa,
        canonicalHeads: headsResult.count ?? 0,
      },
      planDistribution,
      roleDistribution,
      jobs,
      paymentProviders: providerStates.map((state) => ({
        ...state,
        ...(providerMetrics.get(state.provider) || { paidTransactions: 0, revenueFcfa: 0 }),
      })),
      recentSalons: recentSalons.map((salon) => ({
        ...salon,
        status: activeSalonIds.has(salon.id) ? 'Actif' : 'Sans abonnement actif',
      })),
    });
  } catch (error) {
    console.error('[Admin Overview] failed:', error);
    return NextResponse.json({ error: 'Impossible de charger les statistiques administrateur.' }, { status: 500 });
  }
}
