import type {
  Complaint,
  Comment,
  Attachment,
  ComplaintAssignment,
  StatusHistoryEntry,
  ComplaintStatus,
  Priority,
  CategoryType,
  Role,
} from './types';
import { DEMO_COMPLAINTS } from './demo-data';
import { analyzeComplaintIntelligence } from './ai-intelligence-service';
import { createNotification } from './notification-store';

const COMPLAINT_PREFIX = 'COMP';

let complaintIdCounter = 100;
function nextId() {
  complaintIdCounter += 1;
  return `${COMPLAINT_PREFIX}-${complaintIdCounter}`;
}

function now() {
  return new Date().toISOString();
}

function historyId() {
  return `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function commentId() {
  return `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function attachmentId() {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function assignmentId() {
  return `asgn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface StoredComplaint extends Omit<Complaint, 'statusHistory'> {
  statusHistory: StatusHistoryEntry[];
}

const CATEGORIES: CategoryType[] = [
  'Academics',
  'Infrastructure',
  'Finance & Fees',
  'Anti-Ragging & Harassment',
  'Administration',
  'Hostel & Canteen',
];

const SUBCATEGORIES: Record<CategoryType, string[]> = {
  Academics: ['Examinations', 'Marks/Results', 'Syllabus', 'Faculty', 'Library'],
  Infrastructure: ['Classrooms', 'Laboratories', 'Hostel', 'Campus', 'Electricity/Water'],
  'Finance & Fees': ['Fee Payment', 'Scholarship', 'Refund', 'Invoice'],
  'Anti-Ragging & Harassment': ['Ragging', 'Harassment', 'Discrimination', 'Safety'],
  Administration: ['Admission', 'Records', 'Certificates', 'General'],
  'Hostel & Canteen': ['Food Quality', 'Accommodation', 'Mess', 'Maintenance'],
};

import { readJson, writeJson } from './persist';

const COMPLAINTS_FILE = 'complaints.json';

const STATUS_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED'],
  UNDER_REVIEW: ['ASSIGNED', 'RESOLVED', 'REJECTED', 'ESCALATED'],
  ASSIGNED: ['IN_PROGRESS', 'UNDER_REVIEW', 'ESCALATED'],
  IN_PROGRESS: ['RESOLVED', 'ESCALATED', 'UNDER_REVIEW'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
  REJECTED: ['REOPENED'],
  ESCALATED: ['ASSIGNED', 'UNDER_REVIEW'],
  REOPENED: ['UNDER_REVIEW', 'ASSIGNED'],
};

function loadComplaints(): StoredComplaint[] {
  return readJson<StoredComplaint[]>(COMPLAINTS_FILE, []);
}

function saveComplaints(data: StoredComplaint[]): void {
  writeJson(COMPLAINTS_FILE, data);
}

let complaints: StoredComplaint[] = [];

function seedComplaints() {
  const stored = loadComplaints();
  if (stored.length > 0) {
    complaints = stored;
    return;
  }
  const seeded = DEMO_COMPLAINTS.map((c) => {
    const statusHistory: StatusHistoryEntry[] = [];
    const created = new Date(c.createdAt).toISOString();
    statusHistory.push({
      id: historyId(),
      complaintId: c.id,
      oldStatus: undefined,
      newStatus: c.status,
      changedBy: c.complainantId,
      changedByName: c.complainantName,
      changedAt: created,
      notes: 'Complaint submitted',
    });
    if (c.status !== 'SUBMITTED') {
      const updated = new Date(c.updatedAt).toISOString();
      statusHistory.push({
        id: historyId(),
        complaintId: c.id,
        oldStatus: 'SUBMITTED',
        newStatus: c.status,
        changedBy: 'usr-003',
        changedByName: 'Dr. Suresh Mane',
        changedAt: updated,
        notes: 'Status updated by HOD',
      });
    }
    const aiIntelligence = analyzeComplaintIntelligence(c.title, c.description, DEMO_COMPLAINTS.filter(other => other.id !== c.id));
    return {
      ...c,
      comments: c.comments.map((cmt) => ({
        ...cmt,
        authorId: cmt.authorRole === 'STUDENT' ? 'usr-001' : 'usr-003',
        isAnonymous: false,
      })),
      attachments: [],
      assignments: [],
      statusHistory,
      aiIntelligence,
    } as StoredComplaint;
  });
  saveComplaints(seeded);
  complaints = seeded;
}

seedComplaints();

export function getCategories() {
  return CATEGORIES.map((name) => ({
    id: CATEGORIES.indexOf(name) + 1,
    name,
    description: '',
    subcategories: SUBCATEGORIES[name].map((sub) => ({ id: `${name}:${sub}`, name: sub, categoryId: CATEGORIES.indexOf(name) + 1 })),
  }));
}

export function getSubcategories(category: CategoryType) {
  return SUBCATEGORIES[category] || [];
}

export function getAllComplaints(): StoredComplaint[] {
  complaints = loadComplaints();
  return [...complaints];
}

export function getComplaintById(id: string): StoredComplaint | undefined {
  if (!id) return undefined;
  const clean = id.trim().toLowerCase();
  complaints = loadComplaints();
  return complaints.find((c) => c.id.toLowerCase() === clean);
}


export function createComplaint(input: {
  title: string;
  description: string;
  category: CategoryType;
  subcategory?: string;
  priority: Priority;
  isAnonymous: boolean;
  complainantId: string;
  complainantName: string;
  complainantRole: Role;
  department: string;
}): StoredComplaint {
  const id = nextId();
  const nowIso = now();
  const aiIntelligence = analyzeComplaintIntelligence(input.title, input.description, complaints);

  const complaint: StoredComplaint = {
    id,
    title: input.title,
    description: input.description,
    category: input.category,
    subcategory: input.subcategory,
    priority: input.priority,
    status: 'SUBMITTED',
    isAnonymous: input.isAnonymous,
    complainantId: input.complainantId,
    complainantName: input.isAnonymous ? 'Anonymous' : input.complainantName,
    complainantRole: input.complainantRole,
    department: input.department,
    createdAt: nowIso,
    updatedAt: nowIso,
    comments: [],
    attachments: [],
    assignments: [],
    statusHistory: [
      {
        id: historyId(),
        complaintId: id,
        oldStatus: undefined,
        newStatus: 'SUBMITTED',
        changedBy: input.complainantId,
        changedByName: input.isAnonymous ? 'Anonymous' : input.complainantName,
        notes: 'Complaint submitted',
        changedAt: nowIso,
      },
    ],
    aiIntelligence,
  };
  complaints.push(complaint);
  saveComplaints(complaints);

  // Trigger notification for the Department Head (HOD)
  createNotification({
    title: `New Grievance Filed (${id})`,
    message: `${input.isAnonymous ? 'Anonymous Student' : input.complainantName} filed a new ${input.priority} priority grievance on ${input.category}: "${input.title}"`,
    type: input.priority === 'URGENT' ? 'error' : input.priority === 'HIGH' ? 'warning' : 'info',
    complaintId: id,
    recipientRole: 'HEAD',
    department: input.department,
  });

  return complaint;
}

export function updateComplaintStatus(
  id: string,
  newStatus: ComplaintStatus,
  changedBy: string,
  changedByName: string,
  notes?: string
): StoredComplaint | undefined {
  const complaint = complaints.find((c) => c.id === id);
  if (!complaint) return undefined;

  const current = complaint.status;
  if (current === newStatus) return complaint;

  const allowed = STATUS_TRANSITIONS[current] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Invalid status transition from ${current} to ${newStatus}`);
  }

  const nowIso = now();
  complaint.status = newStatus;
  complaint.updatedAt = nowIso;
  if (newStatus === 'RESOLVED') complaint.resolvedAt = nowIso;
  if (newStatus === 'CLOSED') complaint.closedAt = nowIso;

  complaint.statusHistory.push({
    id: historyId(),
    complaintId: id,
    oldStatus: current,
    newStatus,
    changedBy,
    changedByName,
    notes,
    changedAt: nowIso,
  });

  return complaint;
}

export function assignComplaint(
  id: string,
  assignedTo: string,
  assignedBy: string,
  notes?: string
): ComplaintAssignment | undefined {
  const complaint = complaints.find((c) => c.id === id);
  if (!complaint) return undefined;

  const assignment: ComplaintAssignment = {
    id: assignmentId(),
    complaintId: id,
    assignedBy,
    assignedTo,
    notes,
    assignedAt: now(),
  };

  complaint.assignedTo = assignedTo;
  complaint.updatedAt = now();
  complaint.assignments.push(assignment);

  if (complaint.status === 'SUBMITTED' || complaint.status === 'UNDER_REVIEW') {
    complaint.statusHistory.push({
      id: historyId(),
      complaintId: id,
      oldStatus: complaint.status,
      newStatus: 'ASSIGNED',
      changedBy: assignedBy,
      changedByName: assignedBy,
      notes: notes || 'Complaint assigned',
      changedAt: now(),
    });
    complaint.status = 'ASSIGNED';
  }

  return assignment;
}

export function addComment(input: {
  complaintId: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  content: string;
  isAnonymous: boolean;
}): Comment | undefined {
  const complaint = complaints.find((c) => c.id === input.complaintId);
  if (!complaint) return undefined;

  const comment: Comment = {
    id: commentId(),
    authorId: input.authorId,
    authorName: input.isAnonymous ? 'Anonymous' : input.authorName,
    authorRole: input.authorRole,
    content: input.content,
    isAnonymous: input.isAnonymous,
    createdAt: now(),
  };

  complaint.comments.push(comment);
  complaint.updatedAt = now();
  return comment;
}

export function addAttachment(input: {
  complaintId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
}): Attachment | undefined {
  const complaint = complaints.find((c) => c.id === input.complaintId);
  if (!complaint) return undefined;

  const attachment: Attachment = {
    id: attachmentId(),
    complaintId: input.complaintId,
    fileName: input.fileName,
    fileType: input.fileType,
    fileSize: input.fileSize,
    uploadedBy: input.uploadedBy,
    uploadedAt: now(),
  };

  complaint.attachments.push(attachment);
  complaint.updatedAt = now();
  return attachment;
}

export function canTransition(current: ComplaintStatus, next: ComplaintStatus): boolean {
  return (STATUS_TRANSITIONS[current] || []).includes(next);
}

export function getValidNextStatuses(current: ComplaintStatus): ComplaintStatus[] {
  return STATUS_TRANSITIONS[current] || [];
}

export function searchComplaints(params: {
  query?: string;
  status?: ComplaintStatus | 'ALL';
  priority?: Priority | 'ALL';
  category?: CategoryType | 'ALL';
  department?: string;
  assignedTo?: string;
  complainantId?: string;
  assignedOrComplainant?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}): { complaints: StoredComplaint[]; total: number } {
  let result = [...complaints];

  if (params.query) {
    const q = params.query.toLowerCase();
    result = result.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.complainantName.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.subcategory && c.subcategory.toLowerCase().includes(q))
    );
  }

  if (params.status && params.status !== 'ALL') {
    result = result.filter((c) => c.status === params.status);
  }

  if (params.priority && params.priority !== 'ALL') {
    result = result.filter((c) => c.priority === params.priority);
  }

  if (params.category && params.category !== 'ALL') {
    result = result.filter((c) => c.category === params.category);
  }

  if (params.department && params.department !== 'ALL') {
    result = result.filter((c) => c.department.toLowerCase() === params.department!.toLowerCase());
  }

  if (params.assignedTo) {
    result = result.filter((c) => c.assignedTo === params.assignedTo);
  }

  if (params.complainantId) {
    result = result.filter((c) => c.complainantId === params.complainantId);
  }

  if (params.assignedOrComplainant) {
    const id = params.assignedOrComplainant;
    result = result.filter((c) => c.complainantId === id || c.assignedTo === id);
  }

  const sortBy = params.sortBy || 'createdAt';
  const sortOrder = params.sortOrder || 'desc';

  result.sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'priority') {
      const order = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      cmp = (order[a.priority] || 0) - (order[b.priority] || 0);
    } else if (sortBy === 'status') {
      cmp = a.status.localeCompare(b.status);
    } else {
      const aVal = new Date(a[sortBy as keyof StoredComplaint] as string).getTime();
      const bVal = new Date(b[sortBy as keyof StoredComplaint] as string).getTime();
      cmp = aVal - bVal;
    }
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  const total = result.length;
  const page = params.page || 1;
  const limit = params.limit || 10;
  const start = (page - 1) * limit;
  const paginated = result.slice(start, start + limit);

  return { complaints: paginated, total };
}

export function getStats() {
  const total = complaints.length;
  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byCategory: Record<string, number> = {};

  for (const c of complaints) {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    byPriority[c.priority] = (byPriority[c.priority] || 0) + 1;
    byCategory[c.category] = (byCategory[c.category] || 0) + 1;
  }

  return {
    total,
    byStatus,
    byPriority,
    byCategory,
    open: complaints.filter((c) => !['CLOSED', 'REJECTED'].includes(c.status)).length,
    resolved: complaints.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length,
  };
}

export function deleteComplaint(id: string): boolean {
  const idx = complaints.findIndex((c) => c.id === id);
  if (idx >= 0) {
    complaints.splice(idx, 1);
    return true;
  }
  return false;
}
