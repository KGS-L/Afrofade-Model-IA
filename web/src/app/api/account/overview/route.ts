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

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
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

async function ensureTableSchema() {
  await query(
    `ALTER TABLE public.user_profiles 
     ADD COLUMN IF NOT EXISTS full_name VARCHAR(255),
     ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
     ADD COLUMN IF NOT EXISTS email VARCHAR(255),
     ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
     ADD COLUMN IF NOT EXISTS country VARCHAR(100),
     ADD COLUMN IF NOT EXISTS nationality VARCHAR(100)`
  );
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireCustomer(req);
    if ('response' in auth) return auth.response;
    const { principal } = auth;

    let profileData = {
      displayName:
        principal.user.user_metadata?.full_name ||
        principal.user.email?.split('@')[0] ||
        'Utilisateur Afrofade',
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
      await ensureTableSchema();

      const userIdStr = String(principal.user.id);
      const emailStr = principal.user.email || '';

      const profileRes = isUUID(userIdStr)
        ? await query(
            `SELECT COALESCE(full_name, display_name) AS name, phone, country, nationality 
             FROM public.user_profiles 
             WHERE user_id = $1 OR (email IS NOT NULL AND email != '' AND email = $2) LIMIT 1`,
            [userIdStr, emailStr]
          )
        : await query(
            `SELECT COALESCE(full_name, display_name) AS name, phone, country, nationality 
             FROM public.user_profiles 
             WHERE email = $1 LIMIT 1`,
            [emailStr]
          );

      if (profileRes.rows.length > 0) {
        const row = profileRes.rows[0];
        if (row.name) profileData.displayName = row.name;
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
      await ensureTableSchema();

      let userIdStr = String(principal.user.id);
      const emailStr = principal.user.email || '';

      // Tenter la mise à jour par email ou par UUID
      const updateRes = isUUID(userIdStr)
        ? await query(
            `UPDATE public.user_profiles 
             SET full_name = $1, display_name = $1, phone = $2, country = $3, nationality = $4, updated_at = NOW()
             WHERE user_id = $5 OR (email IS NOT NULL AND email != '' AND email = $6)`,
            [displayName, phone || null, country, nationality || null, userIdStr, emailStr]
          )
        : await query(
            `UPDATE public.user_profiles 
             SET full_name = $1, display_name = $1, phone = $2, country = $3, nationality = $4, updated_at = NOW()
             WHERE email = $5`,
            [displayName, phone || null, country, nationality || null, emailStr]
          );

      if ((updateRes.rowCount ?? 0) === 0) {
        // Si la ligne n'existe pas, récupérer ou créer un utilisateur auth.users valide
        if (!isUUID(userIdStr)) {
          const authUserRes = await query(
            `INSERT INTO auth.users (email) VALUES ($1)
             ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
             RETURNING id`,
            [emailStr]
          );
          if (authUserRes.rows[0]?.id) {
            userIdStr = authUserRes.rows[0].id;
          }
        }

        if (isUUID(userIdStr)) {
          await query(
            `INSERT INTO public.user_profiles (user_id, email, full_name, display_name, phone, country, nationality, updated_at)
             VALUES ($1, $2, $3, $3, $4, $5, $6, NOW())`,
            [userIdStr, emailStr, displayName, phone || null, country, nationality || null]
          );
        }
      }
    } catch (dbErr) {
      console.error('[Customer Account PATCH] DB update error:', dbErr);
      return NextResponse.json(
        { error: 'Erreur lors de l’enregistrement en base de données.' },
        { status: 500 }
      );
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
