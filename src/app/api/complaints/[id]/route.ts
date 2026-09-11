import { NextRequest, NextResponse } from 'next/server';
import { getSession, unauthorized, forbidden, badRequest, notFound, serverError, sanitizeUser } from '@/lib/api-helpers';
import { getComplaintById, updateComplaintStatus, canTransition, getValidNextStatuses, deleteComplaint } from '@/lib/complaint-store';
import { sanitizeComplaint } from '@/lib/identity-service';
import type { ComplaintStatus, Priority, Role } from '@/lib/types';

export async function GET(req: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  const auth = getSession(req);
  if (!auth) return unauthorized();
  const { session, user } = auth;

  const resolvedParams = await params;
  const id = resolvedParams?.id;
  const complaint = getComplaintById(id);
  if (!complaint) return notFound('Complaint not found.');

  const isOwner = complaint.complainantId === session.userId || complaint.complainantName === session.name;
  const isAssigned = complaint.assignedTo === session.userId || complaint.assignedTo === session.name;
  const isDepartmentHead = (session.role === 'HEAD' || session.role === 'ADMIN') && (!session.department || complaint.department.toLowerCase() === session.department.toLowerCase());
  const canRead = isOwner || isAssigned || isDepartmentHead || session.role === 'SUPER_ADMIN' || session.role === 'ADMIN' || session.role === 'STUDENT' || session.role === 'TEACHER';

  if (!canRead) return forbidden('You do not have permission to view this complaint.');

  const sanitized = sanitizeComplaint(complaint, session.role, session.userId);
  return NextResponse.json({ complaint: sanitized, user: sanitizeUser(user) });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  const auth = getSession(req);
  if (!auth) return unauthorized();
  const { session } = auth;

  const resolvedParams = await params;
  const id = resolvedParams?.id;
  const complaint = getComplaintById(id);
  if (!complaint) return notFound('Complaint not found.');

  const body = await req.json();
  const { status, priority, title, description, notes } = body;

  if (status) {
    const validStatuses: ComplaintStatus[] = [
      'SUBMITTED',
      'UNDER_REVIEW',
      'ASSIGNED',
      'IN_PROGRESS',
      'RESOLVED',
      'CLOSED',
      'REJECTED',
      'ESCALATED',
      'REOPENED',
    ];
    if (!validStatuses.includes(status)) return badRequest('Invalid status.');

    if (!canTransition(complaint.status, status)) {
      return badRequest(`Cannot transition from ${complaint.status} to ${status}.`);
    }

    updateComplaintStatus(id, status, session.userId, session.name, notes || 'Status updated');
  }

  if (priority) {
    const validPriorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    if (!validPriorities.includes(priority)) return badRequest('Invalid priority.');
    complaint.priority = priority;
    complaint.updatedAt = new Date().toISOString();
  }

  if (title) {
    complaint.title = title.trim();
    complaint.updatedAt = new Date().toISOString();
  }

  if (description !== undefined) {
    complaint.description = description.trim();
    complaint.updatedAt = new Date().toISOString();
  }

  return NextResponse.json({ complaint });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  const auth = getSession(req);
  if (!auth) return unauthorized();

  const resolvedParams = await params;
  const id = resolvedParams?.id;
  const complaint = getComplaintById(id);
  if (!complaint) return notFound('Complaint not found.');

  if (complaint.complainantId !== auth.session.userId && auth.session.role !== 'SUPER_ADMIN') {
    return forbidden('Only the complainant or Super Admin can delete this complaint.');
  }

  const deleted = deleteComplaint(id);
  if (!deleted) return notFound('Complaint not found.');

  return NextResponse.json({ message: 'Complaint deleted.' });
}
