import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { canAccessRoute } from '@/lib/auth/permissions';
import { verifySessionToken } from '@/lib/auth/security';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected route prefixes
  const isProtectedPage =
    pathname.startsWith('/student') ||
    pathname.startsWith('/teacher') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/super-admin');

  if (!isProtectedPage) {
    return NextResponse.next();
  }

  // Extract session token from cookie or header
  const token = request.cookies.get('rscoe_session')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'unauthorized');
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const session = verifySessionToken(token);

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'session_expired');
    return NextResponse.redirect(loginUrl);
  }

  // Check role-based route permissions server-side
  const allowed = canAccessRoute(session.role, pathname);

  if (!allowed) {
    // Role escalation / unauthorized path access attempt!
    const redirectUrl =
      session.role === 'STUDENT'
        ? new URL('/student/dashboard', request.url)
        : session.role === 'TEACHER'
        ? new URL('/teacher/dashboard', request.url)
        : new URL('/admin/dashboard', request.url);

    redirectUrl.searchParams.set('error', 'forbidden');
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/student/:path*',
    '/teacher/:path*',
    '/admin/:path*',
    '/super-admin/:path*',
  ],
};
