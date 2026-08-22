import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = url.searchParams.get('next') ?? '/account';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/account';

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'http';
  const requestOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : url.origin;

  // Utiliser l'origine réelle de la requête (ex: http://localhost:3005)
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  const baseUrl = (envUrl && !envUrl.includes('afrofade.pro')) ? envUrl.replace(/\/$/, '') : requestOrigin;

  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (clientId && clientId.trim() !== '') {
    const redirectUri = `${baseUrl}/api/auth/callback`;
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', clientId);
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('state', encodeURIComponent(safeNext));
    googleAuthUrl.searchParams.set('prompt', 'select_account');

    return NextResponse.redirect(googleAuthUrl.toString());
  }

  // Fallback dev local
  const devCallbackUrl = new URL('/api/auth/callback', baseUrl);
  devCallbackUrl.searchParams.set('code', 'dev_mock_google_code');
  devCallbackUrl.searchParams.set('next', safeNext);

  return NextResponse.redirect(devCallbackUrl.toString());
}
