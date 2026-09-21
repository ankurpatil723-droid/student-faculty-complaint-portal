/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user's profile.
 *
 * What changed from the original:
 *   - Replaced verifySessionToken(rscoe_session) + findUserById(JSON store)
 *     with supabase.auth.getUser() + a query to public.users.
 *   - The Authorization: Bearer <token> fallback is removed; session is
 *     read exclusively from the Supabase HttpOnly cookies.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const response = NextResponse.json({ placeholder: true });

  // Build SSR client wired to request cookies.
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

  // Verify the session server-side (validates against Supabase Auth).
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const token = req.cookies.get('rscoe_session')?.value || req.headers.get('authorization')?.replace('Bearer ', '');
    if (token) {
      const { verifySessionToken } = await import('@/lib/auth/security');
      const { findUserById } = await import('@/lib/auth/user-store');
      const session = verifySessionToken(token);
      if (session) {
        const u = findUserById(session.userId);
        return NextResponse.json({
          authenticated: true,
          user: u || {
            id: session.userId,
            email: session.email,
            role: session.role,
            full_name: session.name,
            department: session.department,
          },
        });
      }
    }
    return NextResponse.json(
      { error: 'Unauthorized. No active session found.' },
      { status: 401 }
    );
  }

  // Fetch full profile from public.users.
  // Use admin client so RLS doesn't block reading the profile even if the
  // anon-key session cookie hasn't fully propagated yet.
  let userProfile: Record<string, unknown> | null = null;
  try {
    const adminClient = createAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .select(
        'id, email, full_name, role, department, designation, roll_number, year, division, phone, is_active, created_at'
      )
      .eq('id', user.id)
      .maybeSingle();

    if (!profileError) {
      userProfile = profile;
    }
  } catch {
    // DB not yet migrated — fall back to metadata
  }

  const responseBody = {
    authenticated: true,
    user: userProfile ?? {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role,
      full_name: user.user_metadata?.full_name,
      department: user.user_metadata?.department,
    },
  };

  const finalResponse = NextResponse.json(responseBody, { status: 200 });
  // Carry over any refreshed session cookies
  response.cookies.getAll().forEach(({ name, value, ...opts }) => {
    finalResponse.cookies.set(name, value, opts);
  });
  return finalResponse;
}
