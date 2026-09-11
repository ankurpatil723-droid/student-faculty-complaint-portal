/**
 * identity-service.ts
 *
 * Server-side identity access control module.
 * This is the ONLY module that may return real complainant identity data.
 * All authorization checks and audit logging live here.
 *
 * Rules enforced:
 *  - Only HEAD and SUPER_ADMIN roles may request identity disclosure.
 *  - A non-empty disclosure reason is mandatory.
 *  - Every disclosure creates an immutable IdentityDisclosureAuditLog entry.
 *  - sanitizeComplaint() is the single source-of-truth for stripping identity
 *    before sending complaints to non-authorized clients.
 */

import type { Role, IdentityDisclosureAuditLog } from './types';
import type { StoredComplaint } from './complaint-store';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Roles that are allowed to request identity disclosure. */
const AUTHORIZED_ROLES: Role[] = ['HEAD', 'SUPER_ADMIN'];

// ─── In-memory audit log ─────────────────────────────────────────────────────
// In a production system this would be written to a database.
// Entries are append-only and never mutated after creation.

const auditLogs: IdentityDisclosureAuditLog[] = [];

function generateAuditId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Authorization ────────────────────────────────────────────────────────────

/**
 * Returns true if the given role is permitted to request identity disclosure.
 * This check must always be performed server-side before any identity data is returned.
 */
export function canRequestIdentity(role: Role): boolean {
  return AUTHORIZED_ROLES.includes(role);
}

// ─── Sanitization ─────────────────────────────────────────────────────────────

/**
 * Produces a stable 4-digit number from a complaint ID string.
 * Used to create consistent pseudonyms (e.g., "Student #4821") without exposing real data.
 */
function hashComplaintId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  }
  return String(1000 + (h % 9000)); // Always 4 digits: 1000-9999
}

export type SanitizedForClient = Omit<StoredComplaint, 'complainantId'> & {
  complainantName: string;
  identityProtected: boolean;
};

/**
 * Masks the identity fields of a complaint for a viewer who is NOT the complaint owner
 * and is NOT an authorized HEAD/SUPER_ADMIN.
 *
 * - `complainantId` is completely removed from the returned object.
 * - `complainantName` is replaced with a stable pseudonym derived from the complaint ID.
 * - `identityProtected: true` signals to clients that identity has been stripped.
 *
 * If `viewerUserId` matches `complaint.complainantId`, the original object is returned
 * untouched (owner sees their own data). HEAD/SUPER_ADMIN also receive the name, but
 * complainantId is still stripped - they must call the disclosure endpoint to get the ID.
 */
export function sanitizeComplaint(
  complaint: StoredComplaint,
  viewerRole: Role,
  viewerUserId: string
): SanitizedForClient {
  const isOwner = complaint.complainantId === viewerUserId;

  if (isOwner) {
    // Owner always sees their own identity
    const { complainantId, ...rest } = complaint;
    return { ...rest, identityProtected: false };
  }

  if (AUTHORIZED_ROLES.includes(viewerRole)) {
    // Authorized heads see the name but NOT the raw complainantId in list/detail responses.
    // They must explicitly call the disclosure endpoint (which creates an audit log).
    const { complainantId, ...rest } = complaint;
    return {
      ...rest,
      complainantName: complaint.isAnonymous ? 'Anonymous' : rest.complainantName,
      identityProtected: complaint.isAnonymous,
    };
  }

  // All other viewers (STUDENT, TEACHER) get a masked pseudonym
  const { complainantId, ...rest } = complaint;
  const pseudoSuffix = hashComplaintId(complaint.id);
  const maskedName = complaint.isAnonymous ? 'Anonymous' : `Student #${pseudoSuffix}`;

  return {
    ...rest,
    complainantName: maskedName,
    identityProtected: true,
  };
}

// ─── Identity Disclosure ──────────────────────────────────────────────────────

export interface DisclosureResult {
  complainantId: string;
  complainantName: string;
  auditId: string;
  disclosedAt: string;
}

/**
 * Discloses the real identity of a complainant to an authorized actor.
 *
 * This function:
 *  1. Validates the actor's role (throws if not HEAD/SUPER_ADMIN).
 *  2. Validates that a non-empty reason was provided (throws if missing/too short).
 *  3. Resolves the complainant identity from the stored complaint.
 *  4. Creates an immutable IdentityDisclosureAuditLog entry.
 *  5. Returns { complainantId, complainantName, auditId, disclosedAt }.
 *
 * @throws Error with descriptive message on any authorization or validation failure.
 */
export function disclosedIdentity(
  actorId: string,
  actorName: string,
  actorRole: Role,
  complaint: StoredComplaint,
  disclosureReason: string
): DisclosureResult {
  // 1. Authorization check
  if (!canRequestIdentity(actorRole)) {
    throw new Error(`FORBIDDEN: Role '${actorRole}' is not authorized to request identity disclosure.`);
  }

  // 2. Reason validation
  const reason = disclosureReason?.trim();
  if (!reason || reason.length < 5) {
    throw new Error('INVALID_REASON: A disclosure reason of at least 5 characters is required.');
  }

  // 3. Resolve identity from the stored complaint
  const complainantId = complaint.complainantId;
  const complainantName = complaint.isAnonymous
    ? `[Anonymous — ID: ${complainantId}]`
    : complaint.complainantName;

  // 4. Create immutable audit log entry
  const entry: IdentityDisclosureAuditLog = {
    id: generateAuditId(),
    actorId,
    actorName,
    actorRole,
    complaintId: complaint.id,
    complainantId,
    disclosureReason: reason,
    disclosedAt: new Date().toISOString(),
  };
  auditLogs.push(Object.freeze(entry) as IdentityDisclosureAuditLog);

  // 5. Return identity data
  return {
    complainantId,
    complainantName,
    auditId: entry.id,
    disclosedAt: entry.disclosedAt,
  };
}

// ─── Audit Log Queries ────────────────────────────────────────────────────────

/**
 * Returns all audit log entries.
 * Only callable by SUPER_ADMIN (enforced by the API route, not here).
 */
export function getAllAuditLogs(): Readonly<IdentityDisclosureAuditLog>[] {
  return [...auditLogs];
}

/**
 * Returns audit log entries for a specific actor.
 * Allows a HEAD to see their own disclosure history.
 */
export function getAuditLogsByActor(actorId: string): Readonly<IdentityDisclosureAuditLog>[] {
  return auditLogs.filter((log) => log.actorId === actorId);
}

/**
 * Returns audit log entries for a specific complaint.
 */
export function getAuditLogsByComplaint(complaintId: string): Readonly<IdentityDisclosureAuditLog>[] {
  return auditLogs.filter((log) => log.complaintId === complaintId);
}

/**
 * Returns the total count of audit log entries. Useful for tests.
 */
export function getAuditLogCount(): number {
  return auditLogs.length;
}
