/**
 * identity-protection.test.ts
 *
 * Automated tests for the complainant identity protection system.
 * Runs with: npx ts-node scripts/run-identity-tests.ts
 *
 * Tests:
 *  1. Student cannot reveal another student's identity (canRequestIdentity returns false)
 *  2. Teacher cannot access identity API (canRequestIdentity returns false)
 *  3. Normal users get sanitized complaint — complainantId stripped, name masked
 *  4. Authorized HEAD can successfully disclose identity
 *  5. Every identity access creates an audit log entry
 *  6. Reason is required — empty/short reason throws INVALID_REASON
 */

import * as assert from 'assert';
import {
  canRequestIdentity,
  sanitizeComplaint,
  disclosedIdentity,
  getAuditLogCount,
  getAllAuditLogs,
} from '../lib/identity-service';
import type { StoredComplaint } from '../lib/complaint-store';
import type { Role } from '../lib/types';

// ─── Shared Fixtures ──────────────────────────────────────────────────────────

const MOCK_COMPLAINT: StoredComplaint = {
  id: 'COMP-TEST-001',
  title: 'Lab Equipment Missing',
  description: 'Several oscilloscopes have been missing from the electronics lab for two weeks.',
  category: 'Infrastructure',
  subcategory: 'Laboratories',
  priority: 'HIGH',
  status: 'SUBMITTED',
  isAnonymous: false,
  complainantId: 'usr-student-42',
  complainantName: 'Rahul Sharma',
  complainantRole: 'STUDENT',
  department: 'Computer Engineering',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  comments: [],
  attachments: [],
  assignments: [],
  statusHistory: [],
};

const MOCK_ANON_COMPLAINT: StoredComplaint = {
  ...MOCK_COMPLAINT,
  id: 'COMP-TEST-002',
  isAnonymous: true,
  complainantName: 'Anonymous',
};

let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅  ${name}`);
    passCount++;
  } catch (err: any) {
    console.error(`  ❌  ${name}`);
    console.error(`       → ${err.message}`);
    failCount++;
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

console.log('\n🔒 Identity Protection Test Suite\n');

// Test 1: Student cannot reveal identity
test('Student cannot request identity disclosure', () => {
  const result = canRequestIdentity('STUDENT');
  assert.strictEqual(result, false, 'STUDENT should not be authorized for identity disclosure');
});

// Test 2: Teacher cannot reveal identity
test('Teacher cannot request identity disclosure', () => {
  const result = canRequestIdentity('TEACHER');
  assert.strictEqual(result, false, 'TEACHER should not be authorized for identity disclosure');
});

// Test 3: Normal users get sanitized complaint — no complainantId, name is masked
test('STUDENT viewer gets sanitized complaint (no complainantId, masked name)', () => {
  const sanitized = sanitizeComplaint(MOCK_COMPLAINT, 'STUDENT', 'usr-different-student');

  // complainantId must not exist in the returned object
  assert.ok(
    !('complainantId' in sanitized),
    'complainantId should be stripped from sanitized complaint'
  );

  // Name must be masked to a pseudonym (not the real name)
  assert.notStrictEqual(
    sanitized.complainantName,
    'Rahul Sharma',
    'Real complainant name should not be visible to other students'
  );
  assert.ok(
    sanitized.complainantName.startsWith('Student #'),
    `Masked name should start with "Student #" but got: "${sanitized.complainantName}"`
  );

  // identityProtected flag must be true
  assert.strictEqual(sanitized.identityProtected, true, 'identityProtected should be true for student viewer');
});

// Test 3b: Complaint owner sees their own unmasked identity
test('Complaint owner sees their own unmasked name and identityProtected=false', () => {
  const sanitized = sanitizeComplaint(MOCK_COMPLAINT, 'STUDENT', 'usr-student-42');

  assert.strictEqual(
    sanitized.complainantName,
    'Rahul Sharma',
    'Owner should see their own real name'
  );
  assert.strictEqual(sanitized.identityProtected, false, 'identityProtected should be false for owner');
});

// Test 4: Authorized HEAD can successfully disclose identity
test('Authorized HEAD can disclose complainant identity', () => {
  const countBefore = getAuditLogCount();

  const result = disclosedIdentity(
    'usr-003',
    'Dr. Suresh Mane',
    'HEAD',
    MOCK_COMPLAINT,
    'Investigating potential disciplinary issue related to missing lab equipment'
  );

  assert.strictEqual(result.complainantId, 'usr-student-42', 'Disclosed complainantId should match stored value');
  assert.strictEqual(result.complainantName, 'Rahul Sharma', 'Disclosed name should match stored value');
  assert.ok(result.auditId.startsWith('audit-'), 'Audit ID should be generated');
  assert.ok(result.disclosedAt, 'Disclosure timestamp should be present');

  const countAfter = getAuditLogCount();
  assert.strictEqual(countAfter, countBefore + 1, 'Audit log count should increase by 1 after disclosure');
});

// Test 5: Every access creates an audit log entry
test('Every identity access is logged with actor, complaint, and reason', () => {
  const countBefore = getAuditLogCount();

  disclosedIdentity(
    'usr-003',
    'Dr. Suresh Mane',
    'SUPER_ADMIN',
    MOCK_ANON_COMPLAINT,
    'Checking anonymous complaint for anti-ragging investigation'
  );

  const allLogs = getAllAuditLogs();
  assert.strictEqual(allLogs.length, countBefore + 1, 'New log entry should be created');

  const latestLog = allLogs[allLogs.length - 1];
  assert.strictEqual(latestLog.actorId, 'usr-003', 'Audit log should record actor ID');
  assert.strictEqual(latestLog.complaintId, 'COMP-TEST-002', 'Audit log should record complaint ID');
  assert.ok(latestLog.complainantId, 'Audit log should record complainant ID');
  assert.ok(latestLog.disclosureReason.length >= 5, 'Audit log should record the reason');
  assert.ok(latestLog.disclosedAt, 'Audit log should record timestamp');
});

// Test 6: Reason is required — empty or short reason throws
test('Empty disclosure reason throws INVALID_REASON error', () => {
  assert.throws(
    () => disclosedIdentity('usr-003', 'Dr. Suresh Mane', 'HEAD', MOCK_COMPLAINT, ''),
    (err: Error) => err.message.includes('INVALID_REASON'),
    'Empty reason should throw INVALID_REASON'
  );
});

test('Too-short disclosure reason (< 5 chars) throws INVALID_REASON error', () => {
  assert.throws(
    () => disclosedIdentity('usr-003', 'Dr. Suresh Mane', 'HEAD', MOCK_COMPLAINT, 'inv'),
    (err: Error) => err.message.includes('INVALID_REASON'),
    'Short reason should throw INVALID_REASON'
  );
});

test('Unauthorized role (STUDENT) attempting disclosure throws FORBIDDEN error', () => {
  assert.throws(
    () => disclosedIdentity('usr-student-99', 'Another Student', 'STUDENT', MOCK_COMPLAINT, 'I want to know who filed this'),
    (err: Error) => err.message.includes('FORBIDDEN'),
    'STUDENT role should throw FORBIDDEN'
  );
});

test('Unauthorized role (TEACHER) attempting disclosure throws FORBIDDEN error', () => {
  assert.throws(
    () => disclosedIdentity('usr-teacher-01', 'Prof. Someone', 'TEACHER', MOCK_COMPLAINT, 'I want to know who filed this'),
    (err: Error) => err.message.includes('FORBIDDEN'),
    'TEACHER role should throw FORBIDDEN'
  );
});

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n─────────────────────────────────────────`);
console.log(`  Results: ${passCount} passed, ${failCount} failed`);
console.log(`─────────────────────────────────────────\n`);

if (failCount > 0) {
  process.exit(1);
}
