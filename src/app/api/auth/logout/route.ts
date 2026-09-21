/**
 * POST /api/auth/logout
 *
 * Signs out the current user via Supabase Auth and clears the session cookies.
 *
 * What changed from the original:
 *   - Replaced manual rscoe_session cookie deletion with supabase.auth.signOut(),
 *     which invalidates the server-side session and clears all Supabase cookies.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: NextRequest) {
  const response = NextResponse.json(
    { message: 'Signed out successfully.' },
    { status: 200 }
  );

  // Build SSR client wired to request/response cookies so signOut() can clear them.
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

  // Sign out on the Supabase Auth server and clear local cookies.
  // 'local' scope clears only this device's session (not all sessions).
  // Use 'global' if you want to invalidate all devices.
  await supabase.auth.signOut({ scope: 'local' });

  return response;
}
