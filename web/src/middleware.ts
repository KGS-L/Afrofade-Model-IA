import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protected routes requiring active salon authentication
const PROTECTED_ROUTES = ['/dashboard', '/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute) {
    // Check for auth session cookie or authorization header
    const sessionCookie = request.cookies.get('afrofade_session')?.value || request.cookies.get('sb-access-token')?.value;
    const authHeader = request.headers.get('authorization');

    const isAuthenticated = Boolean(sessionCookie || authHeader);

    if (!isAuthenticated) {
      const loginUrl = new URL('/connexion', request.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
