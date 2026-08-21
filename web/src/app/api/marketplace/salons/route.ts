import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getServiceSupabase } from '@/lib/supabase';
import { isSupportedCountry } from '@/lib/countries';

function cleanString(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function cleanPhone(value: unknown): string {
  const phone = cleanString(value, 50).replace(/[\s()-]/g, '');
  return /^\+?[0-9]{8,20}$/.test(phone) ? phone : '';
}

export async function GET(req: NextRequest) {
  try {
    const principal = await getVerifiedPrincipal(req);
    if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });

    const { data, error } = await getServiceSupabase()
      .from('salon_memberships')
      .select('id, salon_id, role, status, professional_profile_id, started_at, salons(id, name, slug, city, neighborhood, listing_status, verification_status)')
      .eq('user_id', principal.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return NextResponse.json({ memberships: data ?? [] });
  } catch (error) {
    console.error('[Marketplace Salons] GET failed:', error);
    return NextResponse.json({ error: 'Impossible de charger vos salons.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const principal = await getVerifiedPrincipal(req);
    if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    if (principal.role === 'admin') return NextResponse.json({ error: 'Utilisez un compte utilisateur pour créer une activité salon.' }, { status: 403 });

    const body = await req.json();
    const name = cleanString(body?.name, 255);
    const country = cleanString(body?.country, 100);
    const phone = cleanPhone(body?.phone);
    if (!name) return NextResponse.json({ error: 'Le nom du salon est requis.' }, { status: 400 });
    if (!isSupportedCountry(country)) return NextResponse.json({ error: 'Sélectionnez un pays valide.' }, { status: 400 });
    if (!phone) return NextResponse.json({ error: 'Ajoutez un numéro de téléphone valide.' }, { status: 400 });

    const { data, error } = await getServiceSupabase().rpc('create_marketplace_salon', {
      p_actor_user_id: principal.user.id,
      p_name: name,
      p_country: country,
      p_phone: phone,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ salon: data }, { status: 201 });
  } catch (error) {
    console.error('[Marketplace Salons] POST failed:', error);
    return NextResponse.json({ error: 'Impossible de créer ce salon.' }, { status: 500 });
  }
}
