import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  // Determine external base URL strictly from environment or request headers
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const rawBaseUrl = process.env.NEXT_PUBLIC_APP_URL || (forwardedHost ? `${forwardedProto}://${forwardedHost}` : `${url.protocol}//${url.host}`);
  const baseUrl = rawBaseUrl.replace(/\/$/, '');

  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      const response = NextResponse.redirect(`${baseUrl}${safeNext}`);
      
      // Set session cookie for Next.js middleware recognition
      response.cookies.set('afrofade_session', data.session.access_token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: data.session.expires_in || 60 * 60 * 24 * 7,
      });

      return response;
    }
    if (error) {
      console.error('[Auth Callback] exchangeCodeForSession failed:', error.message);
    }
  }

  // Return user to login with error parameter if code exchange fails
  return NextResponse.redirect(`${baseUrl}/connexion?error=auth_callback_failed`);
}
