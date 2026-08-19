import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const principal = await getVerifiedPrincipal(req);
    if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    if (principal.role !== 'admin') {
      return NextResponse.json({ error: 'Accès administrateur requis.' }, { status: 403 });
    }

    const supabaseAdmin = getServiceSupabase();
    const now = new Date().toISOString();

    const [salonsResult, rolesResult, activeSubscriptionsResult, paidPaymentsResult, recentSalonsResult] =
      await Promise.all([
        supabaseAdmin.from('salons').select('plan'),
        supabaseAdmin.from('user_profiles').select('role'),
        supabaseAdmin
          .from('subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .gt('expires_at', now),
        supabaseAdmin
          .from('payment_transactions')
          .select('id, provider, purpose, amount_fcfa, paid_at, created_at')
          .eq('status', 'paid'),
        supabaseAdmin
          .from('salons')
          .select('id, name, country, plan, created_at')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

    for (const result of [salonsResult, rolesResult, activeSubscriptionsResult, paidPaymentsResult, recentSalonsResult]) {
      if (result.error) throw new Error(result.error.message);
    }

    const planDistribution: Record<'PRO' | 'VIP' | 'EXTRA', number> = { PRO: 0, VIP: 0, EXTRA: 0 };
    for (const salon of salonsResult.data || []) {
      const plan = salon.plan as 'PRO' | 'VIP' | 'EXTRA' | null;
      if (plan === 'PRO' || plan === 'VIP' || plan === 'EXTRA') {
        planDistribution[plan] += 1;
      }
    }

    const roleDistribution: Record<'customer' | 'salon' | 'admin', number> = { customer: 0, salon: 0, admin: 0 };
    for (const profile of rolesResult.data || []) {
      const role = profile.role as 'customer' | 'salon' | 'admin' | null;
      if (role === 'customer' || role === 'salon' || role === 'admin') {
        roleDistribution[role] += 1;
      }
    }

    const payments = paidPaymentsResult.data || [];
    const totalRevenueFcfa = payments.reduce((sum, payment) => sum + Number(payment.amount_fcfa || 0), 0);
    const subscriptionRevenueFcfa = payments
      .filter((payment) => payment.purpose === 'subscription')
      .reduce((sum, payment) => sum + Number(payment.amount_fcfa || 0), 0);
    const creditRevenueFcfa = payments
      .filter((payment) => payment.purpose === 'credits')
      .reduce((sum, payment) => sum + Number(payment.amount_fcfa || 0), 0);

    const recentSalons = recentSalonsResult.data || [];
    const recentIds = recentSalons.map((salon) => salon.id);
    let activeSalonIds = new Set<string>();

    if (recentIds.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .select('salon_id')
        .in('salon_id', recentIds)
        .eq('status', 'active')
        .gt('expires_at', now);
      if (error) throw new Error(error.message);
      activeSalonIds = new Set((data || []).map((item) => item.salon_id));
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
      },
      planDistribution,
      roleDistribution,
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
