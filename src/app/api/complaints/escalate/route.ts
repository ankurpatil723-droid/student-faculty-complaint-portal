import { NextRequest, NextResponse } from 'next/server';
import { getSession, unauthorized, forbidden } from '@/lib/api-helpers';
import { checkAndEscalateOverdueComplaints } from '@/lib/complaint-store';

/**
 * POST /api/complaints/escalate
 * Trigger SLA evaluation and auto-escalate breached complaints.
 * Accessible to ADMIN and SUPER_ADMIN (or cron job).
 */
export async function POST(req: NextRequest) {
  const auth = getSession(req);
  if (!auth) return unauthorized();
  const { session } = auth;

  if (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN' && session.role !== 'HEAD') {
    return forbidden('Only administrators and department heads can trigger SLA auto-escalation evaluation.');
  }

  const result = checkAndEscalateOverdueComplaints();

  return NextResponse.json({
    success: true,
    message: `SLA check evaluated. ${result.escalatedCount} grievance(s) auto-escalated to executive level.`,
    escalatedCount: result.escalatedCount,
    escalatedComplaints: result.escalatedComplaints,
  });
}
