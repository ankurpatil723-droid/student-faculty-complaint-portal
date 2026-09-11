import { NextRequest, NextResponse } from 'next/server';
import { getSession, unauthorized, forbidden, badRequest, notFound } from '@/lib/api-helpers';
import { getComplaintById } from '@/lib/complaint-store';
import { canRequestIdentity, disclosedIdentity } from '@/lib/identity-service';

/**
 * POST /api/complaints/[id]/identity
 *
 * Authorized identity disclosure endpoint.
 * Only HEAD and SUPER_ADMIN roles may call this.
 *
 * Request body: { reason: string }
 *
 * Response: { complainantId, complainantName, auditId, disclosedAt }
 *
 * Every call creates an immutable audit log entry regardless of outcome.
 * Identity is NEVER returned through any other endpoint.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // 1. Authenticate
  const auth = getSession(req);
  if (!auth) return unauthorized();
  const { session } = auth;

  // 2. Authorize — only HEAD/SUPER_ADMIN may disclose identity
  if (!canRequestIdentity(session.role)) {
    return forbidden(
      `Identity disclosure is restricted to authorized department heads. ` +
        `Your role '${session.role}' is not permitted.`
    );
  }

  // 3. Locate the complaint
  const complaint = getComplaintById(params.id);
  if (!complaint) return notFound('Complaint not found.');

  // 4. Parse and validate request body
  let body: { reason?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest('Request body must be valid JSON with a "reason" field.');
  }

  const reason = body.reason?.trim();
  if (!reason || reason.length < 5) {
    return badRequest('A disclosure reason of at least 5 characters is required.');
  }

  // 5. Perform disclosure (service handles audit log creation)
  try {
    const result = disclosedIdentity(
      session.userId,
      session.name,
      session.role,
      complaint,
      reason
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    if (err.message?.startsWith('FORBIDDEN')) {
      return forbidden(err.message);
    }
    if (err.message?.startsWith('INVALID_REASON')) {
      return badRequest(err.message);
    }
    return NextResponse.json({ error: 'Identity disclosure failed.' }, { status: 500 });
  }
}
