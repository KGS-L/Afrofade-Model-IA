import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      const response = NextResponse.redirect(`${origin}${next}`);
      
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
  }

  // Return user to login with error parameter if code exchange fails
  return NextResponse.redirect(`${origin}/connexion?error=auth_callback_failed`);
}
