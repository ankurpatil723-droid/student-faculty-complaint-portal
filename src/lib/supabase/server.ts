/**
 * src/lib/supabase/server.ts
 *
 * Server-side Supabase client.
 *
 * Safe to import in Server Components, Route Handlers, and Server Actions.
 * Do NOT import in Client Components — cookies() is server-only.
 *
 * Exports:
 *   createServerClient()  — anon key, RLS respected, session-aware
 *   createAdminClient()   — service-role key, bypasses RLS (use sparingly)
 */

import { createServerClient as _createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Standard server client — uses the anon key and respects Row Level Security.
 * The user's session is automatically read from the request cookies.
 *
 * Usage:
 *   const supabase = await createServerClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // v0.12+ setAll receives (cookiesToSet, headers)
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Intentionally swallowed: setAll is called from Server Components
            // where cookies are read-only. Middleware handles the actual refresh.
          }
        },
      },
    }
  );
}

/**
 * Admin / service-role client — bypasses RLS entirely.
 *
 * Use ONLY for:
 *   - Writing to audit_logs (immutable, must bypass user-facing RLS)
 *   - Admin registration that sets app_metadata
 *   - Health checks and seed scripts
 *
 * Never expose this in any client-facing code path or NEXT_PUBLIC_ var.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (
    !serviceRoleKey ||
    serviceRoleKey.trim() === '' ||
    serviceRoleKey.includes('<paste-your-service-role-key-here>') ||
    serviceRoleKey.startsWith('<')
  ) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. ' +
        'Add it to .env.local (server-only — never use NEXT_PUBLIC_*).'
    );
  }

  return _createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
