import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getServiceSupabase } from '@/lib/supabase';

const SECTIONS = new Set(['salons', 'subscriptions', 'users', 'revenue']);

export async function GET(req: NextRequest, context: { params: Promise<{ section: string }> }) {
  try {
    const principal = await getVerifiedPrincipal(req);
    if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    if (!principal.profileConfigured || principal.role !== 'admin') return NextResponse.json({ error: 'Accès administrateur requis.' }, { status: 403 });
    const { section } = await context.params;
    if (!SECTIONS.has(section)) return NextResponse.json({ error: 'Section inconnue.' }, { status: 404 });
    const supabaseAdmin = getServiceSupabase();
    const now = new Date().toISOString();

    if (section === 'salons') {
      const [salonsResult, subscriptionsResult, profilesResult] = await Promise.all([
        supabaseAdmin.from('salons').select('id, name, phone, country, plan, quota_limit, quota_used, storage_used_bytes, created_at, updated_at').order('created_at', { ascending: false }).limit(250),
        supabaseAdmin.from('subscriptions').select('salon_id, provider, status, expires_at').eq('status', 'active').gt('expires_at', now),
        supabaseAdmin.from('user_profiles').select('user_id, salon_id').eq('role', 'salon').not('salon_id', 'is', null),
      ]);
      for (const result of [salonsResult, subscriptionsResult, profilesResult]) if (result.error) throw new Error(result.error.message);
      const authUsers = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const emailById = new Map((authUsers.data?.users || []).map((user) => [user.id, user.email || '']));
      const ownerBySalon = new Map((profilesResult.data || []).map((profile) => [profile.salon_id, emailById.get(profile.user_id) || '']));
      const subscriptionBySalon = new Map((subscriptionsResult.data || []).map((subscription) => [subscription.salon_id, subscription]));
      return NextResponse.json({ section, items: (salonsResult.data || []).map((salon) => ({ ...salon, owner_email: ownerBySalon.get(salon.id) || '', subscription: subscriptionBySalon.get(salon.id) || null })) });
    }

    if (section === 'subscriptions') {
      const [subscriptionsResult, salonsResult] = await Promise.all([
        supabaseAdmin.from('subscriptions').select('id, salon_id, provider, amount_fcfa, status, expires_at, created_at, updated_at').order('created_at', { ascending: false }).limit(250),
        supabaseAdmin.from('salons').select('id, name, country, plan'),
      ]);
      if (subscriptionsResult.error) throw new Error(subscriptionsResult.error.message);
      if (salonsResult.error) throw new Error(salonsResult.error.message);
      const salons = new Map((salonsResult.data || []).map((salon) => [salon.id, salon]));
      return NextResponse.json({ section, items: (subscriptionsResult.data || []).map((subscription) => ({ ...subscription, salon: salons.get(subscription.salon_id) || null })) });
    }

    if (section === 'users') {
      const profilesResult = await supabaseAdmin.from('user_profiles').select('user_id, role, salon_id, created_at, updated_at').order('created_at', { ascending: false }).limit(1000);
      if (profilesResult.error) throw new Error(profilesResult.error.message);
      const authUsers = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const userById = new Map((authUsers.data?.users || []).map((user) => [user.id, user]));
      return NextResponse.json({ section, items: (profilesResult.data || []).map((profile) => { const authUser = userById.get(profile.user_id); return { ...profile, email: authUser?.email || '', name: authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || '', last_sign_in_at: authUser?.last_sign_in_at || null }; }) });
    }

    const paymentsResult = await supabaseAdmin.from('payment_transactions').select('id, user_id, salon_id, provider, purpose, product_id, term_id, amount_fcfa, currency, status, paid_at, created_at').eq('status', 'paid').order('paid_at', { ascending: false }).limit(500);
    if (paymentsResult.error) throw new Error(paymentsResult.error.message);
    const items = paymentsResult.data || [];
    return NextResponse.json({ section, items, summary: { totalRevenueFcfa: items.reduce((sum, item) => sum + Number(item.amount_fcfa || 0), 0), paidTransactions: items.length } });
  } catch (error) {
    console.error('[Admin Details] failed:', error);
    return NextResponse.json({ error: 'Impossible de charger cette vue administrateur.' }, { status: 500 });
  }
}
