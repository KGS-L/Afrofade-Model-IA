import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { query } from '@/lib/db';
import { isSupportedCountry } from '@/lib/countries';

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
    if (!principal)
      return NextResponse.json(
        { error: 'Authentification requise.' },
        { status: 401 }
      );
    if (!principal.profileConfigured) {
      return NextResponse.json(
        { error: 'Finalisez d’abord votre profil.' },
        { status: 409 }
      );
    }
    if (principal.role === 'admin') {
      return NextResponse.json(
        { error: 'Un administrateur ne peut pas être converti en salon.' },
        { status: 403 }
      );
    }
    if (principal.role === 'salon' && principal.salonId) {
      return NextResponse.json({
        salonId: principal.salonId,
        alreadyConfigured: true,
      });
    }
    if (principal.role !== 'customer') {
      return NextResponse.json(
        { error: 'Seul un compte particulier peut créer un espace salon.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const name = cleanString(body?.name, 255);
    const country = cleanString(body?.country, 100);
    const phone = cleanPhone(body?.phone);

    if (!name) {
      return NextResponse.json(
        { error: 'Le nom du salon est requis.' },
        { status: 400 }
      );
    }
    if (!isSupportedCountry(country)) {
      return NextResponse.json(
        { error: 'Sélectionnez un pays dans la liste.' },
        { status: 400 }
      );
    }
    if (!phone) {
      return NextResponse.json(
        { error: 'Ajoutez un numéro de téléphone valide.' },
        { status: 400 }
      );
    }

    // 1. Insertion directe du Salon dans PostgreSQL
    const salonRes = await query<{ id: string }>(
      `INSERT INTO public.salons (name, country, phone, plan, quota_limit, quota_used, created_at, updated_at)
       VALUES ($1, $2, $3, 'PRO', 20, 0, NOW(), NOW())
       RETURNING id`,
      [name, country, phone]
    );

    if (!salonRes.rows[0]?.id) {
      throw new Error('Impossible d’insérer le salon en base.');
    }
    createdSalonId = salonRes.rows[0].id;

    // 2. Mettre à jour le rôle de l'utilisateur dans public.user_profiles
    const userIdStr = String(principal.user.id);
    const emailStr = principal.user.email || '';

    await query(
      `UPDATE public.user_profiles
       SET role = 'salon', salon_id = $1, updated_at = NOW()
       WHERE user_id::text = $2 OR email = $3`,
      [createdSalonId, userIdStr, emailStr]
    );

    return NextResponse.json(
      { salonId: createdSalonId, role: 'salon' },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Salon Onboarding] failed:', error);

    if (createdSalonId) {
      try {
        await query(`DELETE FROM public.salons WHERE id = $1`, [createdSalonId]);
      } catch (cleanupError) {
        console.error('[Salon Onboarding] rollback failed:', cleanupError);
      }
    }

    return NextResponse.json(
      { error: 'Impossible de créer votre espace salon.' },
      { status: 500 }
    );
  }
}
