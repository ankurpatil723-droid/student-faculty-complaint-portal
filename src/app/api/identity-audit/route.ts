import { NextRequest, NextResponse } from 'next/server';
import { getSession, unauthorized, forbidden } from '@/lib/api-helpers';
import { getAllAuditLogs, getAuditLogsByActor, canRequestIdentity } from '@/lib/identity-service';

/**
 * GET /api/identity-audit
 *
 * Returns identity disclosure audit logs.
 *
 * - SUPER_ADMIN: sees ALL entries across all actors and complaints.
 * - HEAD: sees ONLY their own disclosure history.
 * - All other roles: 403 Forbidden.
 */
export async function GET(req: NextRequest) {
  const auth = getSession(req);
  if (!auth) return unauthorized();
  const { session } = auth;

  // Only HEAD / SUPER_ADMIN can view audit logs
  if (!canRequestIdentity(session.role)) {
    return forbidden('Access to identity audit logs is restricted to authorized department heads.');
  }

  const logs =
    session.role === 'SUPER_ADMIN'
      ? getAllAuditLogs()
      : getAuditLogsByActor(session.userId);

  return NextResponse.json({
    role: session.role,
    totalEntries: logs.length,
    logs,
  });
}
