import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSessionJwt } from '@/lib/auth/auth-config';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/account';

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const rawBaseUrl = process.env.NEXT_PUBLIC_APP_URL || (forwardedHost ? `${forwardedProto}://${forwardedHost}` : `${url.protocol}//${url.host}`);
  const baseUrl = rawBaseUrl.replace(/\/$/, '');

  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/account';

  if (code) {
    const mockUser = {
      id: 'usr_oauth_' + Math.random().toString(36).substring(2, 10),
      email: 'oauth.user@afrofade.pro',
      name: 'Utilisateur OAuth',
      role: 'customer' as const,
    };

    const token = await createSessionJwt(mockUser);
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

  return NextResponse.redirect(`${baseUrl}/connexion?next=${encodeURIComponent(safeNext)}`);
}
