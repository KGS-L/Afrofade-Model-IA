import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getVerifiedPrincipal } from '@/lib/server-auth';

const PROTECTED_ROUTES = ['/dashboard', '/admin', '/account', '/onboarding'];

function homeForPrincipal(
  principal: NonNullable<Awaited<ReturnType<typeof getVerifiedPrincipal>>>,
  request: NextRequest,
) {
  if (!principal.profileConfigured) return new URL('/onboarding', request.url);
  if (principal.role === 'admin') return new URL('/admin', request.url);
  if (principal.role === 'salon' && principal.salonId) return new URL('/dashboard', request.url);
  if (principal.role === 'customer') return new URL('/account', request.url);
  return new URL('/connexion?error=salon_profile_missing', request.url);
}

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

  if (!principal.profileConfigured) {
    if (!pathname.startsWith('/onboarding')) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/onboarding')) {
    return NextResponse.redirect(homeForPrincipal(principal, request));
  }

  if (pathname.startsWith('/admin') && principal.role !== 'admin') {
    return NextResponse.redirect(homeForPrincipal(principal, request));
  }

  if (pathname.startsWith('/dashboard') && (principal.role !== 'salon' || !principal.salonId)) {
    return NextResponse.redirect(homeForPrincipal(principal, request));
  }

  if (pathname.startsWith('/account') && principal.role !== 'customer') {
    return NextResponse.redirect(homeForPrincipal(principal, request));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/account/:path*', '/onboarding/:path*'],
};
