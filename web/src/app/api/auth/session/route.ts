import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getVerifiedPrincipal, verifyAccessToken } from '@/lib/server-auth';

const COOKIE_NAME = 'afrofade_session';

function publicPrincipal(principal: NonNullable<Awaited<ReturnType<typeof getVerifiedPrincipal>>>) {
  return {
    id: principal.user.id,
    email: principal.user.email ?? '',
    name:
      principal.user.user_metadata?.full_name ||
      principal.user.user_metadata?.name ||
      principal.user.email?.split('@')[0] ||
      'Utilisateur',
    role: principal.role,
    salonId: principal.salonId,
  };
}

export async function GET(request: NextRequest) {
  try {
    const principal = await getVerifiedPrincipal(request);
    if (!principal) return NextResponse.json({ authenticated: false }, { status: 401 });
    return NextResponse.json({ authenticated: true, user: publicPrincipal(principal) });
  } catch (error) {
    console.error('[Auth Session] GET failed:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accessToken = typeof body?.accessToken === 'string' ? body.accessToken.trim() : '';
    if (!accessToken) return NextResponse.json({ error: 'Access token required.' }, { status: 400 });

    const principal = await verifyAccessToken(accessToken);
    if (!principal) return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });

    const response = NextResponse.json({ authenticated: true, user: publicPrincipal(principal) });
    response.cookies.set(COOKIE_NAME, accessToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    console.error('[Auth Session] POST failed:', error);
    return NextResponse.json({ error: 'Unable to establish session.' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, '', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
  });
  return response;
}
