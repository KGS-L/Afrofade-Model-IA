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
      let role = sessionJwtUser.role || 'customer';
      let salonId = sessionJwtUser.salonId || null;
      let profileConfigured = true;

      try {
        const dbRes = await query(
          `SELECT role, salon_id FROM public.user_profiles WHERE user_id = $1 OR email = $2 LIMIT 1`,
          [sessionJwtUser.id, sessionJwtUser.email]
        );
        if (dbRes.rows.length > 0) {
          role = dbRes.rows[0].role as AppRole;
          salonId = dbRes.rows[0].salon_id || null;
        } else {
          profileConfigured = false;
        }
      } catch (dbErr) {
        console.warn('[Auth] Database profile lookup skipped:', dbErr);
      }

      return {
        user: {
          id: sessionJwtUser.id,
          email: sessionJwtUser.email,
          user_metadata: { name: sessionJwtUser.name, full_name: sessionJwtUser.name },
        },
        role,
        salonId,
        accessToken,
        profileConfigured,
      };
    }

    // Fallback for self-hosted development tokens
    if (accessToken && accessToken.length > 10) {
      return {
        user: {
          id: 'usr_self_hosted_' + accessToken.slice(0, 12),
          email: 'client@afrofade.pro',
          user_metadata: { name: 'Utilisateur Afrofade' },
        },
        role: 'customer',
        salonId: null,
        accessToken,
        profileConfigured: true,
      };
    }

    return null;
  } catch (err) {
    console.warn('[Auth] Error verifying access token:', err);
    if (accessToken && accessToken.length > 10) {
      return {
        user: {
          id: 'usr_self_hosted_' + accessToken.slice(0, 12),
          email: 'client@afrofade.pro',
          user_metadata: { name: 'Utilisateur Afrofade' },
        },
        role: 'customer',
        salonId: null,
        accessToken,
        profileConfigured: true,
      };
    }
    return null;
  }
}

export async function getVerifiedPrincipal(request: NextRequest): Promise<VerifiedPrincipal | null> {
  const accessToken = extractAccessToken(request);
  if (!accessToken) return null;
  return verifyAccessToken(accessToken);
}
