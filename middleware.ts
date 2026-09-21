/**
 * middleware.ts
 *
 * Session enforcement and role-based route guarding.
 *
 * What changed from the original:
 *   - Session is now verified via supabase.auth.getUser() (Supabase Auth)
 *     instead of verifySessionToken() (custom JWT / rscoe_session cookie).
 *   - The Supabase session cookie is refreshed on every request (required by
 *     @supabase/ssr to keep the session alive without explicit re-login).
 *   - Role is read from user.user_metadata.role (set at registration time).
 *
 * What is completely unchanged:
 *   - canAccessRoute() from @/lib/auth/permissions — identical call site.
 *   - All redirect targets and ?error= query-param values.
 *   - The protected route prefix list.
 *   - The config.matcher array.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { canAccessRoute } from '@/lib/auth/permissions';
import type { Role } from '@/lib/types';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Protected route guard ──────────────────────────────────────────────
  const isProtectedPage =
    pathname.startsWith('/student') ||
    pathname.startsWith('/teacher') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/super-admin');

  // Build a mutable response so @supabase/ssr can set refreshed session cookies.
  // We start with NextResponse.next() and mutate its headers below.
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  // ── 2. Supabase session client (middleware variant) ───────────────────────
  // Must use the raw createServerClient from @supabase/ssr (not our server.ts
  // wrapper) so we can pass the request/response cookie helpers that middleware
  // requires for cookie mutation.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write cookies onto the request first (so server components can read
          // the refreshed session in the same request cycle).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Rebuild the response with the updated request headers.
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          // Write the cookies onto the outgoing response so the browser stores them.
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ── 3. Verify session ─────────────────────────────────────────────────────
  // IMPORTANT: always use getUser() (not getSession()) in middleware.
  // getSession() only reads the local cookie without a server-side verification
  // round-trip, making it spoofable. getUser() validates with the Supabase
  // Auth server on every protected request.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isProtectedPage) {
    // Still refresh the session cookie for public pages (keeps login state alive).
    return response;
  }

  // ── 4. No session → unauthorized ─────────────────────────────────────────
  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'unauthorized');
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 5. Extract role from user metadata ───────────────────────────────────
  // Role is stored in user_metadata.role at sign-up time.
  // If you later move to app_metadata (admin-only), change this to:
  //   const role = user.app_metadata?.role as Role | undefined;
  const role = user.user_metadata?.role as Role | undefined;

  if (!role) {
    // User exists in Supabase Auth but has no role — treat as session error.
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'session_expired');
    return NextResponse.redirect(loginUrl);
  }

  // ── 6. Role-based route access — UNCHANGED from original ─────────────────
  const allowed = canAccessRoute(role, pathname);

  if (!allowed) {
    // Role escalation / unauthorized path access attempt!
    const redirectUrl =
      role === 'STUDENT'
        ? new URL('/student/dashboard', request.url)
        : role === 'TEACHER'
        ? new URL('/teacher/dashboard', request.url)
        : new URL('/admin/dashboard', request.url);

    redirectUrl.searchParams.set('error', 'forbidden');
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/student/:path*',
    '/teacher/:path*',
    '/admin/:path*',
    '/super-admin/:path*',
  ],
};
