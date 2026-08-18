import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';

const PROTECTED_ROUTES = ['/dashboard', '/admin'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  if (!isProtectedRoute) return NextResponse.next();

  let principal = null;
  try {
    principal = await getVerifiedPrincipal(request);
  } catch (error) {
    console.error('[Middleware] Authentication verification failed:', error);
  }

  if (!principal) {
    const loginUrl = new URL('/connexion', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith('/admin') && principal.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
