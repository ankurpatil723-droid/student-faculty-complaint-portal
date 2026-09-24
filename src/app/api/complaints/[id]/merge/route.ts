import { NextRequest, NextResponse } from 'next/server';
import { getSession, unauthorized, forbidden, badRequest, notFound } from '@/lib/api-helpers';
import { mergeComplaints, getComplaintById } from '@/lib/complaint-store';

/**
 * POST /api/complaints/[id]/merge
 * Merges the current complaint ([id]) as a duplicate into targetId, or vice versa.
 * Body: { targetId: string, note?: string }
 * Restricted to HEAD, ADMIN, and SUPER_ADMIN roles.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const auth = getSession(req);
  if (!auth) return unauthorized();
  const { session } = auth;

  // Authorization check: HEAD, ADMIN, SUPER_ADMIN
  const allowedRoles = ['HEAD', 'ADMIN', 'SUPER_ADMIN'];
  if (!allowedRoles.includes(session.role)) {
    return forbidden('Only Department Heads and Administrators can merge duplicate grievances.');
  }

  const resolvedParams = await params;
  const currentId = resolvedParams?.id;

  const body = await req.json().catch(() => ({}));
  const { targetId, note, asTarget } = body;

  if (!targetId || typeof targetId !== 'string') {
    return badRequest('targetId is required.');
  }

  // If asTarget is true, currentId is the primary target and body.targetId is the source to merge into this one
  const sourceId = asTarget ? targetId : currentId;
  const destinationTargetId = asTarget ? currentId : targetId;

  const source = getComplaintById(sourceId);
  if (!source) {
    return notFound(`Complaint ${sourceId} not found.`);
  }

  const target = getComplaintById(destinationTargetId);
  if (!target) {
    return notFound(`Target complaint ${destinationTargetId} not found.`);
  }

  try {
    const actor = session.name || session.userId;
    const mergedComplaint = mergeComplaints(sourceId, destinationTargetId, actor, note);

    return NextResponse.json({
      success: true,
      message: `Grievance ${sourceId} successfully merged into ${destinationTargetId}.`,
      sourceComplaint: mergedComplaint,
      targetComplaint: getComplaintById(destinationTargetId),
    });
  } catch (err: any) {
    return badRequest(err.message || 'Failed to merge complaints.');
  }
}
