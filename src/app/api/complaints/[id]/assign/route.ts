import { NextRequest, NextResponse } from 'next/server';
import { getSession, unauthorized, forbidden, notFound } from '@/lib/api-helpers';
import { getComplaintById, assignComplaint } from '@/lib/complaint-store';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getSession(req);
  if (!auth) return unauthorized();
  const { session } = auth;

  const complaint = getComplaintById(params.id);
  if (!complaint) return notFound('Complaint not found.');

  const body = await req.json();
  const { assignedTo, notes } = body;

  if (!assignedTo?.trim()) return NextResponse.json({ error: 'Assignee is required.' }, { status: 400 });

  const assignment = assignComplaint(params.id, assignedTo.trim(), session.userId, notes?.trim());

  if (!assignment) return notFound('Failed to assign complaint.');

  return NextResponse.json({ assignment, message: 'Complaint assigned successfully.' });
}
