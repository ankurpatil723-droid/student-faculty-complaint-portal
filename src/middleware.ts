import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { canAccessRoute } from '@/lib/auth/permissions';
import type { Role } from '@/lib/types';

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

  // ── 1. Protected route guard ──────────────────────────────────────────────
  const isProtectedPage =
    pathname.startsWith('/student') ||
    pathname.startsWith('/teacher') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/super-admin');

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  // ── 2. Supabase session client (middleware variant) ───────────────────────
  let user: any = null;
  let role: Role | undefined = undefined;

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

  // ── 2b. Fallback: check rscoe_session cookie / JWT ───────────────────────
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

  if (!isProtectedPage) {
    return response;
  }

  // ── 3. No session → unauthorized ─────────────────────────────────────────
  if (!user || !role) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'unauthorized');
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 4. Role-based route access ───────────────────────────────────────────
  const allowed = canAccessRoute(role, pathname);

  if (!allowed) {
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
