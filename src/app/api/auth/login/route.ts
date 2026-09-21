/**
 * POST /api/auth/login
 *
 * Authenticates a user via Supabase Auth (email + password).
 *
 * What changed from the original:
 *   - Replaced findUserByEmail + comparePassword + createSessionToken
 *     with supabase.auth.signInWithPassword().
 *   - Supabase sets its own HttpOnly session cookies automatically via the
 *     SSR client — we no longer manually set "rscoe_session".
 *   - The middleware now reads those Supabase cookies (supabase.auth.getUser()),
 *     so after a successful login the user will no longer be redirected to
 *     /login?error=unauthorized.
 *   - Rate limiting and role-mismatch checks are preserved exactly.
 *   - Account lockout (isAccountLocked / recordFailedAttempt) is preserved.
 *
 * Session cookie flow:
 *   supabase.auth.signInWithPassword() → Supabase Auth server validates
 *   credentials → returns access_token + refresh_token → @supabase/ssr
 *   writes them as chunked HttpOnly cookies on the response → middleware
 *   reads them on the next request via getUser().
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/server';
import {
  isAccountLocked,
  recordFailedAttempt,
  resetFailedAttempts,
  checkRateLimit,
} from '@/lib/auth/security';
import type { Role } from '@/lib/types';

export async function POST(req: NextRequest) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateCheck = checkRateLimit(`login:${ip}`, 15, 60 * 1000);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many authentication attempts. Please try again in 1 minute.' },
      { status: 429 }
    );
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: { email?: string; password?: string; selectedRole?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { email, password, selectedRole } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required.' },
      { status: 400 }
    );
  }

  // ── Account lockout ────────────────────────────────────────────────────────
  const lockStatus = isAccountLocked(email);
  if (lockStatus.isLocked) {
    return NextResponse.json(
      {
        error: `Account is temporarily locked due to 5 consecutive failed attempts. Please try again in ${lockStatus.remainingSeconds} seconds.`,
      },
      { status: 423 }
    );
  }

  // ── Build a response object that Supabase SSR can write cookies onto ───────
  // We start with a mutable response; the SSR client's setAll() will stamp the
  // Supabase session cookies (sb-* chunks) onto it.
  const response = NextResponse.json({ message: 'placeholder' }); // replaced below

  // We need a fresh SSR client that writes cookies to `response`.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ── Supabase sign-in ───────────────────────────────────────────────────────
  const { data, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !data.user) {
    // Record failed attempt for lockout tracking
    const { attemptsLeft, isLocked } = recordFailedAttempt(email);

    if (isLocked) {
      return NextResponse.json(
        {
          error:
            'Account locked! You have exceeded the maximum of 5 failed login attempts. Locked for 15 minutes.',
        },
        { status: 423 }
      );
    }

    return NextResponse.json(
      {
        error: `Invalid credentials provided. ${attemptsLeft} attempt(s) remaining before account lockout.`,
      },
      { status: 401 }
    );
  }

  // ── Auth success: reset lockout counter ───────────────────────────────────
  resetFailedAttempts(email);

  const user = data.user;
  const role = user.user_metadata?.role as Role | undefined;

  // ── Optional role-mismatch check (preserved from original) ────────────────
  if (
    selectedRole &&
    role !== selectedRole &&
    !(selectedRole === 'ADMIN' && role === 'HEAD')
  ) {
    // Sign the user back out so the session cookie isn't left dangling
    await supabase.auth.signOut();
    return NextResponse.json(
      {
        error: `This account is registered under the role ${role ?? 'UNKNOWN'}, not ${selectedRole}.`,
      },
      { status: 403 }
    );
  }

  // ── Fetch full profile from public.users via admin client ─────────────────
  // The anon client is session-scoped; use the admin client to read the profile
  // row created by the auth trigger in 001_initial_schema.sql.
  let userProfile: Record<string, unknown> | null = null;
  try {
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from('users')
      .select('id, email, full_name, role, department, designation, roll_number, year, division, phone, created_at')
      .eq('id', user.id)
      .maybeSingle();
    userProfile = profile;
  } catch {
    // Non-fatal — profile may not exist yet if DB migration hasn't run.
    // Return minimal data from Supabase Auth metadata instead.
  }

  // ── Build success response (cookies already stamped on `response`) ─────────
  // Re-use the same response object so the Set-Cookie headers are preserved.
  const body_out = {
    message: 'Authentication successful.',
    user: userProfile ?? {
      id: user.id,
      email: user.email,
      role,
      full_name: user.user_metadata?.full_name,
      department: user.user_metadata?.department,
    },
  };

  // Overwrite the placeholder JSON body on the existing response object.
  // We can't reassign `response` (cookies would be lost), so patch its body
  // by returning a new response that copies the cookies.
  const finalResponse = NextResponse.json(body_out, { status: 200 });
  response.cookies.getAll().forEach(({ name, value, ...opts }) => {
    finalResponse.cookies.set(name, value, opts);
  });

  return finalResponse;
}
