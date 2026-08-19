import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getServiceSupabase } from '@/lib/supabase';
import { getPaymentProviderStates, isPaymentProvider } from '@/lib/payment-providers';

async function requireAdmin(req: NextRequest) {
  const principal = await getVerifiedPrincipal(req);
  if (!principal) return { response: NextResponse.json({ error: 'Authentification requise.' }, { status: 401 }) };
  if (!principal.profileConfigured || principal.role !== 'admin') return { response: NextResponse.json({ error: 'Accès administrateur requis.' }, { status: 403 }) };
  return { principal };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ('response' in auth) return auth.response;
  return NextResponse.json({ providers: await getPaymentProviderStates(getServiceSupabase()) });
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin(req);
    if ('response' in auth) return auth.response;
    const body = await req.json();
    if (!isPaymentProvider(body?.provider) || typeof body?.enabled !== 'boolean') return NextResponse.json({ error: 'Configuration prestataire invalide.' }, { status: 400 });
    const supabaseAdmin = getServiceSupabase();
    const { error } = await supabaseAdmin.from('payment_provider_settings').update({ enabled: body.enabled, updated_by: auth.principal.user.id, updated_at: new Date().toISOString() }).eq('provider', body.provider);
    if (error) throw new Error(error.message);
    return NextResponse.json({ providers: await getPaymentProviderStates(supabaseAdmin) });
  } catch (error) {
    console.error('[Admin Payment Providers] failed:', error);
    return NextResponse.json({ error: 'Impossible de modifier le prestataire.' }, { status: 500 });
  }
}
