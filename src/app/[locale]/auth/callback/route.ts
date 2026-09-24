/**
 * GET /auth/callback
 *
 * Supabase Auth callback handler.
 *
 * Handles two scenarios:
 *   1. OAuth callback (e.g. Google sign-in) — exchanges the `code` param for a session.
 *   2. Password-recovery callback — exchanges the `token_hash` for a recovery session,
 *      then redirects to the reset-password page.
 *
 * Supabase redirects the user here after:
 *   - Email confirmation
 *   - Password reset link click
 *   - OAuth provider sign-in
 *
 * The `redirectTo` you pass to resetPasswordForEmail() / signInWithOAuth() should
 * point to this route (e.g. http://localhost:3000/auth/callback).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/';

  const response = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  if (token_hash && type) {
    // Password recovery / email confirmation via token_hash
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as Parameters<typeof supabase.auth.verifyOtp>[0]['type'],
    });

    if (!error) {
      // For password recovery, redirect to the reset-password page.
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/auth/reset-password`, {
          headers: response.headers,
        });
      }
      // For email confirmation, redirect to the intended next page or dashboard.
      return response;
    }

    // Verification failed — redirect to error page
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  if (code) {
    // OAuth PKCE exchange
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
  }

  // Fallback — something unexpected
  return NextResponse.redirect(`${origin}/login?error=unauthorized`);
}
