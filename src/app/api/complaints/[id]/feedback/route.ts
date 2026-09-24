import { NextRequest, NextResponse } from 'next/server';
import { getSession, unauthorized, forbidden, notFound, badRequest } from '@/lib/api-helpers';
import { getComplaintById } from '@/lib/complaint-store';
import { submitFeedback, getFeedbackForComplaint } from '@/lib/feedback-store';

/**
 * GET /api/complaints/[id]/feedback
 * Fetch feedback for a complaint if available.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const id = resolvedParams?.id;

  const complaint = getComplaintById(id);
  if (!complaint) {
    return notFound('Complaint not found.');
  }

  const feedback = await getFeedbackForComplaint(id);
  return NextResponse.json({ success: true, feedback: feedback || null });
}

/**
 * POST /api/complaints/[id]/feedback
 * Submit 1-5 star rating and optional comments.
 * Restricted to the complaint's complainant.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const auth = getSession(req);
  if (!auth) return unauthorized();
  const { session } = auth;

  const resolvedParams = await params;
  const id = resolvedParams?.id;

  const complaint = getComplaintById(id);
  if (!complaint) {
    return notFound('Complaint not found.');
  }

  // Verify that only the original complainant can submit feedback
  const isComplainant =
    complaint.complainantId === session.userId ||
    complaint.complainantName === session.name;

  if (!isComplainant && session.role !== 'SUPER_ADMIN') {
    return forbidden('Only the complainant who filed this grievance can submit resolution feedback.');
  }

  const body = await req.json().catch(() => ({}));
  const { rating, comments } = body;

  if (rating === undefined || rating === null) {
    return badRequest('Rating is required (integer 1-5).');
  }

  try {
    const feedback = await submitFeedback({
      complaintId: id,
      rating: Number(rating),
      comments: typeof comments === 'string' ? comments : undefined,
    });

    return NextResponse.json({ success: true, feedback }, { status: 201 });
  } catch (err: any) {
    return badRequest(err.message || 'Failed to submit feedback.');
  }
}
