export type Role = 'STUDENT' | 'TEACHER' | 'HEAD' | 'SUPER_ADMIN' | 'ADMIN';

export interface AuthSession {
  userId: string;
  email: string;
  role: Role;
  name: string;
  department: string;
  iat?: number;
  exp?: number;
}

export interface PasswordResetToken {
  token: string;
  userId: string;
  email: string;
  expiresAt: number;
}

export type ComplaintStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REJECTED'
  | 'ESCALATED'
  | 'REOPENED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Subcategory {
  id: string;
  name: string;
  categoryId: number;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  subcategories: Subcategory[];
}

export type CategoryType =
  | 'Academics'
  | 'Infrastructure'
  | 'Finance & Fees'
  | 'Anti-Ragging & Harassment'
  | 'Administration'
  | 'Hostel & Canteen';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  content: string;
  isAnonymous: boolean;
  createdAt: string;
}

export interface Attachment {
  id: string;
  complaintId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ComplaintAssignment {
  id: string;
  complaintId: string;
  assignedBy: string;
  assignedTo: string;
  notes?: string;
  assignedAt: string;
}

export interface StatusHistoryEntry {
  id: string;
  complaintId: string;
  oldStatus?: ComplaintStatus;
  newStatus: ComplaintStatus;
  changedBy: string;
  changedByName: string;
  notes?: string;
  changedAt: string;
}

export interface AIIntelligenceMetadata {
  model: string;
  version: string;
  timestamp: string;
  processingTimeMs: number;
}

export interface DuplicateMatch {
  complaintId: string;
  title: string;
  similarityScore: number;
  status: ComplaintStatus;
  category: CategoryType;
}

export interface SentimentSignal {
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  sentimentScore: number;
  detectedEmotions: string[];
  riskFlags: string[];
}

export interface SuggestedResolutionAction {
  actionType: string;
  description: string;
  recommendedAssigneeRole?: string;
  estimatedResolutionDays: number;
}

export interface AIIntelligenceData {
  suggestedCategory: CategoryType;
  suggestedSubcategory?: string;
  suggestedPriority: Priority;
  suggestedDepartment: string;
  summary: string;
  duplicateMatches: DuplicateMatch[];
  sentimentSignal: SentimentSignal;
  suggestedResponse: string;
  suggestedResolutionAction: SuggestedResolutionAction;
  confidence: {
    categoryConfidence: number;
    priorityConfidence: number;
    departmentConfidence: number;
    overallConfidence: number;
  };
  metadata: AIIntelligenceMetadata;
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  category: CategoryType;
  subcategory?: string;
  priority: Priority;
  status: ComplaintStatus;
  isAnonymous: boolean;
  complainantId: string;
  complainantName: string;
  complainantRole: Role;
  assignedTo?: string;
  department: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  comments: Comment[];
  attachments: Attachment[];
  assignments: ComplaintAssignment[];
  statusHistory: StatusHistoryEntry[];
  aiIntelligence?: AIIntelligenceData;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  complaintId?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  designation?: string;
  rollNumber?: string;
  year?: string;
  division?: string;
  phone?: string;
  joinedAt: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  complaintId: string;
  complaintTitle: string;
  performedBy: string;
  timestamp: string;
}

export interface StatusMeta {
  label: string;
  color: string;
  bg: string;
  border: string;
}

/** Immutable record written every time an authorized actor reveals a complainant's identity. */
export interface IdentityDisclosureAuditLog {
  /** Unique audit log entry ID */
  id: string;
  /** ID of the actor who requested the disclosure (HEAD/SUPER_ADMIN) */
  actorId: string;
  /** Name of the actor for display purposes */
  actorName: string;
  /** Role of the actor */
  actorRole: Role;
  /** ID of the complaint whose identity was accessed */
  complaintId: string;
  /** ID of the complainant whose identity was disclosed */
  complainantId: string;
  /** The reason the actor provided for accessing the identity */
  disclosureReason: string;
  /** ISO timestamp of when identity was disclosed */
  disclosedAt: string;
}

/**
 * A complaint with identity fields stripped — safe to send to unauthorized viewers.
 * complainantId is removed. complainantName is masked for anonymous/non-owner requests.
 */
export type SanitizedComplaint = Omit<Complaint, 'complainantId'> & {
  complainantId?: never;
  /** Masked name like "Student #4821" or "Anonymous" unless the viewer is the owner */
  complainantName: string;
  /** True when the identity has been stripped from this response */
  identityProtected: boolean;
};

