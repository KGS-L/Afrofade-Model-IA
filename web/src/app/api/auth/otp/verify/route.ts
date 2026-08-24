import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { createSessionJwt, AuthUser } from '@/lib/auth/auth-config';

const COOKIE_NAME = 'afrofade_session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const token = typeof body?.token === 'string' ? body.token.trim() : typeof body?.code === 'string' ? body.code.trim() : '';

    if (!email || !token) {
      return NextResponse.json({ error: 'E-mail et code OTP requis.' }, { status: 400 });
    }

    let isValid = process.env.NODE_ENV !== 'production' && token === '123456'; // Fallback dev code

    if (!isValid) {
      try {
        const result = await query(
          `SELECT id FROM public.auth_otps
           WHERE email = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()
           ORDER BY created_at DESC LIMIT 1`,
          [email, token]
        );

        if (result.rows.length > 0) {
          isValid = true;
          await query(`UPDATE public.auth_otps SET used = TRUE WHERE id = $1`, [result.rows[0].id]);
        }
      } catch (dbErr) {
        console.warn('[OTP Verify] DB OTP check failed:', dbErr);
        if (process.env.NODE_ENV !== 'production') {
          isValid = true;
        }
      }
    }

    if (!isValid) {
      return NextResponse.json({ error: 'Code de vérification invalide ou expiré.' }, { status: 401 });
    }

    // Retrieve or create user in Postgres
    let userId = 'usr_' + Math.random().toString(36).substring(2, 11);
    let role: 'customer' | 'salon' | 'admin' = 'customer';
    let salonId: string | null = null;
    let fullName = email.split('@')[0];

    try {
      await query(`CREATE SCHEMA IF NOT EXISTS auth;`);
      await query(
        `CREATE TABLE IF NOT EXISTS auth.users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`
      );

      await query(
        `CREATE TABLE IF NOT EXISTS public.user_profiles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL UNIQUE,
          email VARCHAR(255) NOT NULL,
          role VARCHAR(20) NOT NULL DEFAULT 'customer',
          salon_id UUID,
          full_name VARCHAR(255),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`
      );

      // Upsert into auth.users
      const userRes = await query(
        `INSERT INTO auth.users (email) VALUES ($1)
         ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
         RETURNING id`,
        [email]
      );
      if (userRes.rows[0]?.id) {
        userId = userRes.rows[0].id;
      }

      // Check profile
      const profileRes = await query(
        `SELECT role, salon_id, full_name FROM public.user_profiles WHERE user_id = $1 OR email = $2 LIMIT 1`,
        [userId, email]
      );

      const isTargetAdmin = email.toLowerCase() === 'sokevin7@gmail.com';

      if (profileRes.rows.length > 0) {
        role = isTargetAdmin ? 'admin' : ((profileRes.rows[0].role as any) || 'customer');
        salonId = profileRes.rows[0].salon_id || null;
        if (profileRes.rows[0].full_name) fullName = profileRes.rows[0].full_name;
        if (isTargetAdmin) {
          await query(`UPDATE public.user_profiles SET role = 'admin' WHERE user_id = $1 OR email = $2`, [userId, email]);
        }
      } else {
        role = isTargetAdmin ? 'admin' : 'customer';
        await query(
          `INSERT INTO public.user_profiles (user_id, email, role, full_name)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role`,
          [userId, email, role, fullName]
        );
      }
    } catch (dbErr) {
      console.warn('[OTP Verify] DB user resolution skipped:', dbErr);
    }

    const authUser: AuthUser = {
      id: userId,
      email,
      name: fullName,
      role,
      salonId,
    };

    const jwtToken = await createSessionJwt(authUser);

    const response = NextResponse.json({
      success: true,
      accessToken: jwtToken,
      user: {
        id: userId,
        email,
        name: fullName,
        role,
        salonId,
        needsOnboarding: !salonId && role === 'salon',
      },
    });

    response.cookies.set(COOKIE_NAME, jwtToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('[OTP Verify] Verification failed:', error);
    return NextResponse.json({ error: 'Échec de la vérification du code.' }, { status: 500 });
  }
}
