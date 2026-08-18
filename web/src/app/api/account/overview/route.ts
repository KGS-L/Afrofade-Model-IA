import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getServiceSupabase } from '@/lib/supabase';

function cleanString(value: unknown, max = 120): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function cleanPhone(value: unknown): string {
  const phone = cleanString(value, 50).replace(/[\s()-]/g, '');
  if (!phone) return '';
  return /^\+?[0-9]{8,20}$/.test(phone) ? phone : '';
}

async function requireCustomer(req: NextRequest) {
  const principal = await getVerifiedPrincipal(req);
  if (!principal) return { response: NextResponse.json({ error: 'Authentification requise.' }, { status: 401 }) };
  if (principal.role !== 'customer' || principal.salonId) {
    return { response: NextResponse.json({ error: 'Espace réservé aux particuliers.' }, { status: 403 }) };
  }
  return { principal };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireCustomer(req);
    if ('response' in auth) return auth.response;

    const { principal } = auth;
    const supabaseAdmin = getServiceSupabase();

    const [profileResult, walletResult, ledgerResult, paymentsResult] = await Promise.all([
      supabaseAdmin
        .from('customer_profiles')
        .select('display_name, phone, country, updated_at')
        .eq('user_id', principal.user.id)
        .maybeSingle(),
      supabaseAdmin
        .from('credit_wallets')
        .select('balance, updated_at')
        .eq('user_id', principal.user.id)
        .maybeSingle(),
      supabaseAdmin
        .from('credit_transactions')
        .select('id, delta, reason, created_at')
        .eq('user_id', principal.user.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('payment_transactions')
        .select('id, provider, product_id, amount_fcfa, status, created_at, paid_at')
        .eq('user_id', principal.user.id)
        .eq('purpose', 'credits')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    for (const result of [profileResult, walletResult, ledgerResult, paymentsResult]) {
      if (result.error) throw new Error(result.error.message);
    }

    const metadata = principal.user.user_metadata || {};
    const fallbackName =
      metadata.full_name || metadata.name || principal.user.email?.split('@')[0] || 'Utilisateur Afrofade';

    return NextResponse.json({
      profile: {
        displayName: profileResult.data?.display_name || fallbackName,
        phone: profileResult.data?.phone || '',
        country: profileResult.data?.country || '',
      },
      wallet: {
        balance: walletResult.data?.balance ?? 0,
        updatedAt: walletResult.data?.updated_at ?? null,
      },
      ledger: ledgerResult.data || [],
      payments: paymentsResult.data || [],
    });
  } catch (error) {
    console.error('[Customer Account] GET failed:', error);
    return NextResponse.json({ error: 'Impossible de charger votre espace.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireCustomer(req);
    if ('response' in auth) return auth.response;

    const { principal } = auth;
    const body = await req.json();
    const displayName = cleanString(body?.displayName, 120);
    const country = cleanString(body?.country, 100);
    const phone = cleanPhone(body?.phone);

    if (!displayName) {
      return NextResponse.json({ error: 'Le nom est requis.' }, { status: 400 });
    }
    if (body?.phone && !phone) {
      return NextResponse.json({ error: 'Numéro de téléphone invalide.' }, { status: 400 });
    }

    const supabaseAdmin = getServiceSupabase();
    const { data, error } = await supabaseAdmin
      .from('customer_profiles')
      .upsert(
        {
          user_id: principal.user.id,
          display_name: displayName,
          phone: phone || null,
          country: country || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select('display_name, phone, country')
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({
      profile: {
        displayName: data.display_name || '',
        phone: data.phone || '',
        country: data.country || '',
      },
    });
  } catch (error) {
    console.error('[Customer Account] PATCH failed:', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer votre profil.' }, { status: 500 });
  }
}
