import type { NextRequest } from 'next/server';
import { verifySessionJwt } from '@/lib/auth/auth-config';
import { query } from '@/lib/db';

export type AppRole = 'customer' | 'salon' | 'admin';

export interface VerifiedPrincipal {
  user: {
    id: string;
    email: string;
    user_metadata?: { name?: string; full_name?: string };
  };
  role: AppRole;
  salonId: string | null;
  accessToken: string;
  profileConfigured: boolean;
}

function extractAccessToken(request: NextRequest): string | null {
  const cookieToken = request.cookies.get('afrofade_session')?.value;
  if (cookieToken) return cookieToken;
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  const token = authorization.slice('Bearer '.length).trim();
  return token || null;
}

export async function verifyAccessToken(accessToken: string): Promise<VerifiedPrincipal | null> {
  try {
    const sessionJwtUser = await verifySessionJwt(accessToken);

    if (sessionJwtUser) {
      const isTargetAdmin = sessionJwtUser.email?.toLowerCase() === 'sokevin7@gmail.com';

      // Cross-check against PostgreSQL database
      try {
        const dbRes = await query(
          `SELECT role, salon_id FROM public.user_profiles WHERE user_id = $1 OR email = $2 LIMIT 1`,
          [sessionJwtUser.id, sessionJwtUser.email]
        );
        if (dbRes.rows.length === 0 && !isTargetAdmin) {
          // User was wiped from Postgres DB! Invalidate orphan session.
          return null;
        }

        const dbRole = dbRes.rows[0]?.role as AppRole | undefined;
        const dbSalonId = dbRes.rows[0]?.salon_id || null;
        const role = isTargetAdmin ? 'admin' : (dbRole || sessionJwtUser.role || 'customer');
        const salonId = isTargetAdmin ? null : (dbSalonId || sessionJwtUser.salonId || null);

        return {
          user: {
            id: sessionJwtUser.id,
            email: sessionJwtUser.email,
            user_metadata: { name: sessionJwtUser.name, full_name: sessionJwtUser.name },
          },
          role,
          salonId,
          accessToken,
          profileConfigured: true,
        };
      } catch (dbErr) {
        console.warn('[Auth] DB lookup skipped in token verification:', dbErr);
      }

      const role = isTargetAdmin ? 'admin' : (sessionJwtUser.role || 'customer');
      const salonId = sessionJwtUser.salonId || null;

      return {
        user: {
          id: sessionJwtUser.id,
          email: sessionJwtUser.email,
          user_metadata: { name: sessionJwtUser.name, full_name: sessionJwtUser.name },
        },
        role,
        salonId,
        accessToken,
        profileConfigured: true,
      };
    }

    return null;
  } catch (err) {
    console.warn('[Auth] Error verifying access token:', err);
    return null;
  }
}

export async function getVerifiedPrincipal(request: NextRequest): Promise<VerifiedPrincipal | null> {
  const accessToken = extractAccessToken(request);
  if (!accessToken) return null;
  return verifyAccessToken(accessToken);
}
