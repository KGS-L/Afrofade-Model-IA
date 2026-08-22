import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSessionJwt, AuthUser } from '@/lib/auth/auth-config';
import { query } from '@/lib/db';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const code = searchParams.get('code');
  const rawState = searchParams.get('state');

  let next = searchParams.get('next') || '/account';
  if (rawState) {
    try {
      const decoded = decodeURIComponent(rawState);
      if (decoded.startsWith('/')) next = decoded;
    } catch {}
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'http';
  const requestOrigin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : url.origin;
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  const baseUrl =
    envUrl && !envUrl.includes('afrofade.pro')
      ? envUrl.replace(/\/$/, '')
      : requestOrigin;

  const safeNext =
    next.startsWith('/') && !next.startsWith('//') ? next : '/account';

  if (code) {
    let email = 'client.google@afrofade.pro';
    let fullName = 'Utilisateur Google';
    // Toujours générer un UUID valide pour la compatibilité PostgreSQL
    let userId = crypto.randomUUID();
    let role: 'customer' | 'salon' | 'admin' = 'customer';
    let salonId: string | null = null;

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

      const userRes = await query(
        `INSERT INTO auth.users (email) VALUES ($1)
         ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
         RETURNING id`,
        [email]
      );
      if (userRes.rows[0]?.id) userId = userRes.rows[0].id;

      const profileRes = await query(
        `SELECT role, salon_id, full_name FROM public.user_profiles WHERE user_id = $1 OR email = $2 LIMIT 1`,
        [userId, email]
      );

      if (profileRes.rows.length > 0) {
        role = (profileRes.rows[0].role as any) || 'customer';
        salonId = profileRes.rows[0].salon_id || null;
        if (profileRes.rows[0].full_name)
          fullName = profileRes.rows[0].full_name;
      } else {
        await query(
          `INSERT INTO public.user_profiles (user_id, email, role, full_name)
           VALUES ($1, $2, 'customer', $3)
           ON CONFLICT (user_id) DO NOTHING`,
          [userId, email, fullName]
        );
      }
    } catch (dbErr) {
      console.warn('[OAuth Callback] DB sync skipped:', dbErr);
    }

    const authUser: AuthUser = {
      id: userId,
      email,
      name: fullName,
      role,
      salonId,
    };

    const token = await createSessionJwt(authUser);
    const response = NextResponse.redirect(`${baseUrl}${safeNext}`);

    response.cookies.set('afrofade_session', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  }

  return NextResponse.redirect(
    `${baseUrl}/connexion?next=${encodeURIComponent(safeNext)}`
  );
}
