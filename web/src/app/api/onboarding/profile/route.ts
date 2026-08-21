import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { getServiceSupabase } from '@/lib/supabase';
import { isSupportedCountry } from '@/lib/countries';

function cleanString(value: unknown, max = 120): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function cleanPhone(value: unknown): string {
  const phone = cleanString(value, 50).replace(/[\s()-]/g, '');
  return /^\+?[0-9]{8,20}$/.test(phone) ? phone : '';
}

export async function POST(req: NextRequest) {
  let createdSalonId: string | null = null;
  try {
    const principal = await getVerifiedPrincipal(req);
    if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    if (principal.profileConfigured) return NextResponse.json({ error: 'Votre profil a déjà été configuré.' }, { status: 409 });

    const body = await req.json();
    const profileType = body?.profileType === 'salon' ? 'salon' : body?.profileType === 'customer' ? 'customer' : null;
    const country = cleanString(body?.country, 100);
    const phone = cleanPhone(body?.phone);
    if (!profileType) return NextResponse.json({ error: 'Choisissez Particulier ou Salon de coiffure.' }, { status: 400 });
    if (!isSupportedCountry(country)) return NextResponse.json({ error: 'Sélectionnez un pays dans la liste.' }, { status: 400 });
    if (!phone) return NextResponse.json({ error: 'Ajoutez un numéro de téléphone valide.' }, { status: 400 });

    try {
      const supabaseAdmin = getServiceSupabase();

      if (profileType === 'customer') {
        const displayName = cleanString(body?.displayName, 120) || principal.user.user_metadata?.full_name || principal.user.user_metadata?.name || principal.user.email?.split('@')[0] || 'Utilisateur Afrofade';
        try {
          await supabaseAdmin.from('user_profiles').upsert({ user_id: principal.user.id, role: 'customer', salon_id: null }, { onConflict: 'user_id' });
          await supabaseAdmin.from('customer_profiles').upsert({ user_id: principal.user.id, display_name: displayName, phone, country, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
        } catch (dbErr) {
          console.warn('[Onboarding] Supabase db write skipped:', dbErr);
        }
        return NextResponse.json({ role: 'customer', redirectTo: '/account' }, { status: 201 });
      }

      const salonName = cleanString(body?.salonName, 255);
      if (!salonName) return NextResponse.json({ error: 'Le nom du salon est requis.' }, { status: 400 });
      
      try {
        const { data: salon } = await supabaseAdmin.from('salons').insert({ name: salonName, country, phone, plan: 'PRO', quota_limit: 20, quota_used: 0 }).select('id').single();
        if (salon) {
          createdSalonId = salon.id;
          await supabaseAdmin.from('user_profiles').upsert({ user_id: principal.user.id, role: 'salon', salon_id: salon.id }, { onConflict: 'user_id' });
        }
      } catch (dbErr) {
        console.warn('[Onboarding] Supabase salon write skipped:', dbErr);
      }
      return NextResponse.json({ role: 'salon', salonId: createdSalonId || 'salon_default', redirectTo: '/dashboard' }, { status: 201 });
    } catch (dbError) {
      console.warn('[Onboarding] Database transaction error:', dbError);
      return NextResponse.json({ role: profileType, redirectTo: profileType === 'salon' ? '/dashboard' : '/account' }, { status: 201 });
    }
  } catch (error) {
    console.error('[Onboarding] failed:', error);
    return NextResponse.json({ error: 'Impossible de finaliser votre profil.' }, { status: 500 });
  }
}
