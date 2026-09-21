/**
 * src/lib/supabase/client.ts
 *
 * Browser-side Supabase client.
 *
 * ✅ Safe to import inside Client Components ("use client").
 * ❌ Do NOT import the server client (server.ts) in client components —
 *    it calls cookies() which is a server-only API.
 *
 * Usage:
 *   import { createClient } from '@/lib/supabase/client';
 *   const supabase = createClient();
 *   const { data } = await supabase.from('complaints').select('*');
 */

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
