import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';
import { query } from '@/lib/db';
import { isSupportedCountry } from '@/lib/countries';

function cleanString(value: unknown, max = 120): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanPhone(value: unknown): string {
  const phone = cleanString(value, 50).replace(/[\s()-]/g, '');
  return !phone ? '' : /^\+?[0-9]{8,20}$/.test(phone) ? phone : '';
}

async function requireCustomer(req: NextRequest) {
  const principal = await getVerifiedPrincipal(req);
  if (!principal)
    return {
      response: NextResponse.json(
        { error: 'Authentification requise.' },
        { status: 401 }
      ),
    };
  if (!principal.profileConfigured)
    return {
      response: NextResponse.json(
        { error: 'Finalisez d’abord votre profil.', needsOnboarding: true },
        { status: 409 }
      ),
    };
  if (principal.role !== 'customer' || principal.salonId)
    return {
      response: NextResponse.json(
        { error: 'Espace réservé aux particuliers.' },
        { status: 403 }
      ),
    };
  return { principal };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireCustomer(req);
    if ('response' in auth) return auth.response;
    const { principal } = auth;

    let profileData = {
      displayName: principal.user.user_metadata?.full_name || principal.user.email?.split('@')[0] || 'Utilisateur Afrofade',
      phone: '',
      country: 'Burkina Faso',
      nationality: 'Burkinabè',
    };

    let walletBalance = 0;
    let walletUpdatedAt: string | null = null;
    let ledger: any[] = [];
    let payments: any[] = [];
    let heads: any[] = [];

    try {
      // Ensure columns exist on public.user_profiles
      await query(
        `ALTER TABLE public.user_profiles 
         ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
         ADD COLUMN IF NOT EXISTS country VARCHAR(100),
         ADD COLUMN IF NOT EXISTS nationality VARCHAR(100)`
      );

      const profileRes = await query(
        `SELECT full_name, phone, country, nationality FROM public.user_profiles 
         WHERE user_id = $1 OR email = $2 LIMIT 1`,
        [principal.user.id, principal.user.email]
      );

      if (profileRes.rows.length > 0) {
        const row = profileRes.rows[0];
        if (row.full_name) profileData.displayName = row.full_name;
        if (row.phone) profileData.phone = row.phone;
        if (row.country) profileData.country = row.country;
        if (row.nationality) profileData.nationality = row.nationality;
      }
    } catch (dbErr) {
      console.warn('[Customer Account GET] DB query warning:', dbErr);
    }

    return NextResponse.json({
      profile: profileData,
      wallet: { balance: walletBalance, updatedAt: walletUpdatedAt },
      ledger,
      payments,
      heads,
    });
  } catch (error) {
    console.error('[Customer Account] GET failed:', error);
    return NextResponse.json({
      profile: {
        displayName: 'Utilisateur Afrofade',
        phone: '',
        country: 'Burkina Faso',
        nationality: 'Burkinabè',
      },
      wallet: { balance: 0, updatedAt: null },
      ledger: [],
      payments: [],
      heads: [],
    });
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
    const nationality = cleanString(body?.nationality, 100);
    const phone = cleanPhone(body?.phone);

    if (!displayName)
      return NextResponse.json({ error: 'Le nom est requis.' }, { status: 400 });
    if (!isSupportedCountry(country))
      return NextResponse.json(
        { error: 'Sélectionnez un pays dans la liste.' },
        { status: 400 }
      );
    if (body?.phone && !phone)
      return NextResponse.json(
        { error: 'Numéro de téléphone invalide.' },
        { status: 400 }
      );

    try {
      await query(
        `ALTER TABLE public.user_profiles 
         ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
         ADD COLUMN IF NOT EXISTS country VARCHAR(100),
         ADD COLUMN IF NOT EXISTS nationality VARCHAR(100)`
      );

      await query(
        `UPDATE public.user_profiles 
         SET full_name = $1, phone = $2, country = $3, nationality = $4, updated_at = NOW()
         WHERE user_id = $1 OR email = $5`,
        [displayName, phone || null, country, nationality || null, principal.user.email]
      );
    } catch (dbErr) {
      console.warn('[Customer Account PATCH] DB update warning:', dbErr);
    }

    return NextResponse.json({
      profile: {
        displayName,
        phone: phone || '',
        country,
        nationality: nationality || '',
      },
    });
  } catch (error) {
    console.error('[Customer Account] PATCH failed:', error);
    return NextResponse.json(
      { error: 'Impossible d’enregistrer votre profil.' },
      { status: 500 }
    );
  }
}
