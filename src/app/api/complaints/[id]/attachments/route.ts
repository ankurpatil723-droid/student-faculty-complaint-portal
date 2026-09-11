import { NextRequest, NextResponse } from 'next/server';
import { getSession, unauthorized, badRequest, notFound } from '@/lib/api-helpers';
import { getComplaintById, addAttachment } from '@/lib/complaint-store';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getSession(req);
  if (!auth) return unauthorized();

  const complaint = getComplaintById(params.id);
  if (!complaint) return notFound('Complaint not found.');

  return NextResponse.json({ attachments: complaint.attachments });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = getSession(req);
  if (!auth) return unauthorized();
  const { session } = auth;

  const complaint = getComplaintById(params.id);
  if (!complaint) return notFound('Complaint not found.');

  const body = await req.json();
  const { fileName, fileType, fileSize } = body;

  if (!fileName?.trim()) return badRequest('File name is required.');
  if (!fileType?.trim()) return badRequest('File type is required.');
  if (!fileSize || fileSize <= 0) return badRequest('Invalid file size.');
  if (fileSize > 5 * 1024 * 1024) return badRequest('File size exceeds 5MB limit.');

  const attachment = addAttachment({
    complaintId: params.id,
    fileName: fileName.trim(),
    fileType: fileType.trim(),
    fileSize,
    uploadedBy: session.userId,
  });

  if (!attachment) return notFound('Failed to add attachment.');

  return NextResponse.json({ attachment }, { status: 201 });
}
