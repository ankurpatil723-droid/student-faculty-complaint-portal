import { NextRequest, NextResponse } from 'next/server';
import { getSession, unauthorized, badRequest, notFound, sanitizeUser } from '@/lib/api-helpers';
import { getComplaintById, addComment } from '@/lib/complaint-store';
import type { Role } from '@/lib/types';

export async function GET(req: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  const auth = getSession(req);
  if (!auth) return unauthorized();

  const resolvedParams = await params;
  const id = resolvedParams?.id;
  const complaint = getComplaintById(id);
  if (!complaint) return notFound('Complaint not found.');

  return NextResponse.json({ comments: complaint.comments });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  const auth = getSession(req);
  if (!auth) return unauthorized();
  const { session } = auth;

  const resolvedParams = await params;
  const id = resolvedParams?.id;
  const complaint = getComplaintById(id);
  if (!complaint) return notFound('Complaint not found.');

  const body = await req.json();
  const { content, isAnonymous } = body;

  if (!content?.trim()) return badRequest('Comment content is required.');

  const comment = addComment({
    complaintId: id,
    authorId: session.userId,
    authorName: session.name,
    authorRole: session.role as Role,
    content: content.trim(),
    isAnonymous: Boolean(isAnonymous),
  });

  if (!comment) return notFound('Failed to add comment.');

  return NextResponse.json({ comment }, { status: 201 });
}
