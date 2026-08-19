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

export async function POST(req: NextRequest) {
  let createdSalonId: string | null = null;

  try {
    const principal = await getVerifiedPrincipal(req);
    if (!principal) return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    if (principal.role === 'admin') {
      return NextResponse.json({ error: 'Un administrateur ne peut pas être converti en salon.' }, { status: 403 });
    }
    if (principal.role === 'salon' && principal.salonId) {
      return NextResponse.json({ salonId: principal.salonId, alreadyConfigured: true });
    }

    const body = await req.json();
    const name = cleanString(body?.name, 255);
    const country = cleanString(body?.country, 100);
    const phone = cleanPhone(body?.phone);

    if (!name || !country || !phone) {
      return NextResponse.json(
        { error: 'Nom du salon, pays et numéro de téléphone valide sont requis.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getServiceSupabase();

    const { data: salon, error: salonError } = await supabaseAdmin
      .from('salons')
      .insert({
        name,
        country,
        phone,
        plan: 'PRO',
        quota_limit: 20,
        quota_used: 0,
      })
      .select('id')
      .single();

    if (salonError || !salon) throw new Error(salonError?.message || 'Unable to create salon.');
    createdSalonId = salon.id;

    const { error: roleError } = await supabaseAdmin
      .from('user_profiles')
      .upsert(
        {
          user_id: principal.user.id,
          role: 'salon',
          salon_id: salon.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (roleError) throw new Error(roleError.message);

    return NextResponse.json({ salonId: salon.id, role: 'salon' }, { status: 201 });
  } catch (error) {
    console.error('[Salon Onboarding] failed:', error);

    if (createdSalonId) {
      try {
        const supabaseAdmin = getServiceSupabase();
        await supabaseAdmin.from('salons').delete().eq('id', createdSalonId);
      } catch (cleanupError) {
        console.error('[Salon Onboarding] rollback failed:', cleanupError);
      }
    }

    return NextResponse.json({ error: 'Impossible de créer votre espace salon.' }, { status: 500 });
  }
}
