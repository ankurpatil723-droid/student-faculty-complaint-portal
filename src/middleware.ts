import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';
import { canAccessRoute } from '@/lib/auth/permissions';
import type { Role } from '@/lib/types';
import { routing } from './i18n/routing';

// next-intl locale middleware (handles /en/... and /hi/... routing + Accept-Language negotiation)
const intlMiddleware = createIntlMiddleware(routing);

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 0. Skip API routes and Next.js internals ─────────────────────────────
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/_vercel/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // ── 1. Run next-intl locale middleware first ─────────────────────────────
  //   This handles: redirect / -> /en, rewrite /en/... -> /[locale]/...
  const intlResponse = intlMiddleware(request);
  // If intl middleware issued a redirect (e.g. / -> /en), return it immediately
  if (intlResponse.status !== 200 || intlResponse.headers.get('x-middleware-rewrite')) {
    return intlResponse;
  }

  // ── 2. Determine if this is a protected page ─────────────────────────────
  // Strip the locale prefix to get the effective pathname for auth checking
  // e.g. /en/student/dashboard -> /student/dashboard
  const localePrefix = routing.locales.find(l => 
    pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );
  const effectivePath = localePrefix
    ? pathname.slice(`/${localePrefix}`.length) || '/'
    : pathname;

  const isProtectedPage =
    effectivePath.startsWith('/student') ||
    effectivePath.startsWith('/teacher') ||
    effectivePath.startsWith('/admin') ||
    effectivePath.startsWith('/super-admin');

  let response = intlResponse;

  // ── 3. Supabase session client (middleware variant) ───────────────────────
  let user: any = null;
  let role: Role | undefined = undefined;

  if (isProtectedPage) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value)
              );
              response = NextResponse.next({
                request: { headers: request.headers },
              });
              cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, options)
              );
            },
          },
        }
      );

      const { data } = await supabase.auth.getUser();
      user = data.user;
      if (user?.user_metadata?.role) {
        role = user.user_metadata.role as Role;
      }
    } catch {
      // Ignore supabase auth lookup error
    }

    // ── 3b. Fallback: check rscoe_session cookie / JWT ───────────────────────
    if (!role) {
      const token = request.cookies.get('rscoe_session')?.value;
      if (token) {
        const decoded = parseJwt(token);
        if (decoded && decoded.role) {
          role = decoded.role as Role;
          user = { id: decoded.userId, email: decoded.email, role: decoded.role };
        }
      }
    }

    // ── 4. No session → redirect to locale-aware login ─────────────────────
    if (!user || !role) {
      const locale = localePrefix || routing.defaultLocale;
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set('error', 'unauthorized');
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // ── 5. Role-based route access ───────────────────────────────────────────
    const allowed = canAccessRoute(role, effectivePath);

    if (!allowed) {
      const locale = localePrefix || routing.defaultLocale;
      const dashboardPath =
        role === 'STUDENT'
          ? `/${locale}/student/dashboard`
          : role === 'TEACHER'
          ? `/${locale}/teacher/dashboard`
          : `/${locale}/admin/dashboard`;

      const redirectUrl = new URL(dashboardPath, request.url);
      redirectUrl.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
