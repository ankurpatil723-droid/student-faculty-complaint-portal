import { NextRequest, NextResponse } from 'next/server';
import { getSession, unauthorized, forbidden, badRequest, serverError, sanitizeUser } from '@/lib/api-helpers';
import { createComplaint, searchComplaints, getStats, canTransition } from '@/lib/complaint-store';
import { sanitizeComplaint } from '@/lib/identity-service';
import { getAllUsers } from '@/lib/auth/user-store';
import { sendHodNotificationEmail, sendStudentConfirmationEmail } from '@/lib/email-service';
import type { ComplaintStatus, Priority, CategoryType, Role } from '@/lib/types';

export async function GET(req: NextRequest) {
  const auth = getSession(req);
  if (!auth) return unauthorized();
  const { session, user } = auth;

  const url = new URL(req.url);
  const query = url.searchParams.get('q') || '';
  const status = (url.searchParams.get('status') as ComplaintStatus | 'ALL') || 'ALL';
  const priority = (url.searchParams.get('priority') as Priority | 'ALL') || 'ALL';
  const category = (url.searchParams.get('category') as CategoryType | 'ALL') || 'ALL';
  const departmentParam = url.searchParams.get('department') || '';
  const assignedTo = url.searchParams.get('assignedTo') || '';
  const sortBy = (url.searchParams.get('sortBy') as any) || 'createdAt';
  const sortOrder = (url.searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '10', 10);

  let complainantId: string | undefined = undefined;
  let assignedOrComplainant: string | undefined = undefined;
  let filterDepartment: string | undefined = departmentParam || undefined;

  if (session.role === 'STUDENT') {
    complainantId = session.userId;
  } else if (session.role === 'TEACHER') {
    assignedOrComplainant = session.userId;
  } else if (session.role === 'HEAD') {
    if (!filterDepartment) {
      filterDepartment = session.department;
    }
  }

  const { complaints, total } = searchComplaints({
    query: query || undefined,
    status,
    priority,
    category,
    department: filterDepartment,
    assignedTo: assignedTo || undefined,
    complainantId,
    assignedOrComplainant,
    sortBy,
    sortOrder,
    page,
    limit,
  });

  const sanitized = complaints.map((c) =>
    sanitizeComplaint(c, session.role, session.userId)
  );

  return NextResponse.json({
    role: session.role,
    user: sanitizeUser(user),
    complaints: sanitized,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    stats: getStats(),
  });
}

export async function POST(req: NextRequest) {
  const auth = getSession(req);
  if (!auth) return unauthorized();
  const { session } = auth;

  const body = await req.json();
  const { title, description, category, subcategory, priority, isAnonymous } = body;

  if (!title?.trim()) return badRequest('Title is required.');
  if (!description?.trim() || description.trim().length < 30) return badRequest('Description must be at least 30 characters.');
  if (!category) return badRequest('Category is required.');
  if (!priority) return badRequest('Priority is required.');

  const validPriorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  if (!validPriorities.includes(priority)) return badRequest('Invalid priority.');

  const validCategories: CategoryType[] = [
    'Academics',
    'Infrastructure',
    'Finance & Fees',
    'Anti-Ragging & Harassment',
    'Administration',
    'Hostel & Canteen',
  ];
  if (!validCategories.includes(category)) return badRequest('Invalid category.');

  const complaint = createComplaint({
    title: title.trim(),
    description: description.trim(),
    category,
    subcategory: subcategory?.trim(),
    priority,
    isAnonymous: Boolean(isAnonymous),
    complainantId: session.userId,
    complainantName: session.name,
    complainantRole: session.role as Role,
    department: session.department || 'General',
  });

  // ── Fire email notifications (non-blocking — errors never fail the request) ──
  const emailPayload = {
    id: complaint.id,
    title: complaint.title,
    description: complaint.description,
    category: complaint.category,
    subcategory: complaint.subcategory,
    priority: complaint.priority,
    department: complaint.department,
    createdAt: complaint.createdAt,
  };

  // Find HOD for this department
  const allUsers = getAllUsers();
  const hod = allUsers.find(
    (u) =>
      u.role === 'HEAD' &&
      u.department.toLowerCase() === complaint.department.toLowerCase()
  );

  // Find the student (complainant) user record
  const student = allUsers.find((u) => u.id === session.userId);
  const complainantDisplayName = complaint.isAnonymous ? 'Anonymous Student' : session.name;

  // Send HOD email
  if (hod) {
    sendHodNotificationEmail(hod.email, hod.name, emailPayload, complainantDisplayName).catch((err) =>
      console.error('[EMAIL] HOD notification failed:', err)
    );
  } else {
    console.warn(`[EMAIL] No HOD found for department: "${complaint.department}" — HOD email skipped.`);
  }

  // Send student confirmation (skip if anonymous or no user record)
  if (!complaint.isAnonymous && student?.email) {
    sendStudentConfirmationEmail(student.email, student.name, emailPayload).catch((err) =>
      console.error('[EMAIL] Student confirmation failed:', err)
    );
  }

  return NextResponse.json({ complaint }, { status: 201 });
}

