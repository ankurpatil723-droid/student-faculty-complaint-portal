import { NextRequest, NextResponse } from 'next/server';
import { getSession, unauthorized, forbidden, notFound } from '@/lib/api-helpers';
import { getComplaintById } from '@/lib/complaint-store';

export async function GET(req: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  const auth = getSession(req);
  if (!auth) return unauthorized();

  const resolvedParams = await params;
  const id = resolvedParams?.id;
  const complaint = getComplaintById(id);
  if (!complaint) return notFound('Complaint not found.');

  const isOwner = complaint.complainantId === auth.session.userId;
  const canRead = isOwner || auth.session.role === 'SUPER_ADMIN' || auth.session.role === 'HEAD' || auth.session.role === 'ADMIN';

  if (!canRead) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

  return NextResponse.json({ history: complaint.statusHistory });
}
