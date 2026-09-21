/**
 * app/api/health/route.ts
 *
 * Health check endpoint. The "database" check now pings Supabase instead of a
 * local Postgres connection.
 *
 * Uses the service-role client (createAdminClient) so RLS does not interfere
 * with the simple probe query. Falls back gracefully if the service-role key
 * is not yet configured (returns "UNCONFIGURED" rather than crashing).
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const memoryUsage = process.memoryUsage();

  // ── Database health probe ──────────────────────────────────────────────────
  let databaseStatus: string = 'OK';

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (error) {
      // Supabase returned a DB-level error
      databaseStatus = `ERROR: ${error.message}`;
    }
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.message.includes('SUPABASE_SERVICE_ROLE_KEY is not set')
    ) {
      // Key is not yet configured — don't crash, just report it
      databaseStatus = 'UNCONFIGURED (set SUPABASE_SERVICE_ROLE_KEY in .env.local)';
    } else {
      databaseStatus = `ERROR: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  // ── Assemble response ──────────────────────────────────────────────────────
  const overallStatus = databaseStatus === 'OK' ? 'UP' : 'DEGRADED';

  const healthData = {
    status: overallStatus,
    service: 'rscoe-grievance-portal',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
      heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    },
    checks: {
      database: databaseStatus,
      storage: 'OK',
      aiModule: 'OK',
    },
  };

  const httpStatus = overallStatus === 'UP' ? 200 : 503;
  return NextResponse.json(healthData, { status: httpStatus });
}
