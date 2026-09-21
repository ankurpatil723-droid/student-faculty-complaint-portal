/**
 * POST /api/auth/reset-password
 *
 * Completes a Supabase password reset using the token from the email link.
 *
 * What changed from the original:
 *   - Replaced custom token validation + updateUserPassword (JSON file) with
 *     supabase.auth.updateUser({ password }) called within an active
 *     password-reset session.
 *
 * Flow:
 *   1. User clicks the reset link in their email.
 *   2. Supabase redirects to /auth/reset-password?token_hash=...&type=recovery.
 *   3. The reset-password PAGE calls supabase.auth.verifyOtp() to exchange the
 *      token for a recovery session (this sets the session cookies).
 *   4. The page then POSTs the new password to this route.
 *   5. This route calls updateUser({ password: newPassword }) inside that session.
 *
 * IMPORTANT: This route must be called while the user has an active recovery
 * session. If the session is missing, it returns 401.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { resetFailedAttempts } from '@/lib/auth/security';

export async function POST(req: NextRequest) {
  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: { newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { newPassword } = body;

  if (!newPassword) {
    return NextResponse.json(
      { error: 'New password is required.' },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: 'New password must be at least 8 characters long.' },
      { status: 400 }
    );
  }

  // ── Build SSR client from recovery session cookies ─────────────────────────
  const response = NextResponse.json({ placeholder: true });
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

  // ── Verify there is an active recovery session ────────────────────────────
  const {
    data: { user },
    error: sessionError,
  } = await supabase.auth.getUser();

  if (sessionError || !user) {
    return NextResponse.json(
      {
        error:
          'Invalid or expired password reset session. Please request a new reset link.',
      },
      { status: 401 }
    );
  }

  // ── Update password ────────────────────────────────────────────────────────
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message || 'Password reset failed.' },
      { status: 400 }
    );
  }

  // Reset in-memory lockout counter for this user's email
  if (user.email) {
    resetFailedAttempts(user.email);
  }

  const finalResponse = NextResponse.json(
    {
      message:
        'Password reset successfully. You can now log in with your new password.',
    },
    { status: 200 }
  );

  // Carry over any updated session cookies
  response.cookies.getAll().forEach(({ name, value, ...opts }) => {
    finalResponse.cookies.set(name, value, opts);
  });

  return finalResponse;
}
