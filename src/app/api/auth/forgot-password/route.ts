/**
 * POST /api/auth/forgot-password
 *
 * Sends a Supabase password reset email to the given address.
 *
 * What changed from the original:
 *   - Replaced custom token generation + JSON file store with
 *     supabase.auth.resetPasswordForEmail(), which sends an email with a
 *     secure reset link via the Supabase Auth email provider.
 *   - The resetToken is no longer returned in the response body (it was a
 *     demo-only pattern). Supabase sends the token in the email link.
 *   - Rate limiting is preserved.
 *   - The response is always 200 regardless of whether the email exists
 *     (anti-enumeration, same as the original).
 *
 * Supabase email setup:
 *   Configure the reset email template and SMTP provider in:
 *   Supabase Dashboard → Project Settings → Auth → Email Templates & SMTP.
 *   The reset link will point to: <redirectTo>/auth/callback?token_hash=...
 *   Set redirectTo below to match your deployment URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { checkRateLimit } from '@/lib/auth/security';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateCheck = checkRateLimit(`forgot-pass:${ip}`, 5, 60 * 1000);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many password reset requests. Please try again later.' },
      { status: 429 }
    );
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { email } = body;

  if (!email) {
    return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
  }

  // ── Send password reset email via Supabase Auth ────────────────────────────
  // We use the anon SSR client here (no session cookies needed for this call).
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

  // Anti-enumeration: always return 200. Supabase itself already does this
  // (it returns success even for unknown emails).
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${APP_URL}/auth/reset-password`,
  });

  return NextResponse.json(
    {
      message:
        'If an account exists with that email, a password reset link has been sent. Please check your inbox.',
    },
    { status: 200 }
  );
}
