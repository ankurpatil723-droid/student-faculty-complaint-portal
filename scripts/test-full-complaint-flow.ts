import { createComplaint, searchComplaints, getComplaintById } from '../src/lib/complaint-store';
import { getNotificationsForUser } from '../src/lib/notification-store';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    failed++;
  }
}

async function runFullFlowTest() {
  console.log('\n============================================================');
  console.log('  TESTING COMPLAINT FLOW: SUBMIT -> MY GRIEVANCES -> HOD NOTIF');
  console.log('============================================================\n');

  // Student details
  const studentUser = {
    id: 'usr-ganesh-patil-comp-jspm-edu-in',
    name: 'Ganesh Patil',
    role: 'STUDENT' as const,
    department: 'Computer Engineering',
  };

  // HOD details
  const hodUser = {
    id: 'usr-003',
    name: 'Dr. Suresh Mane',
    role: 'HEAD' as const,
    department: 'Computer Engineering',
  };

  // Step 1: Student submits a new grievance
  console.log('--- Step 1: Student Submits New Grievance ---');
  const complaintTitle = 'Canteen Water Filter Damaged in B-Block';
  const complaintDesc = 'The water filter in B-Block canteen is leaking water and discolored. Please replace urgent.';

  console.log(`Submitting complaint for Student: ${studentUser.name} (${studentUser.id})...`);
  const newComplaint = createComplaint({
    title: complaintTitle,
    description: complaintDesc,
    category: 'Hostel & Canteen',
    priority: 'HIGH',
    isAnonymous: false,
    complainantId: studentUser.id,
    complainantName: studentUser.name,
    complainantRole: studentUser.role,
    department: studentUser.department,
  });

  console.log(`[LOG] Created Complaint ID: ${newComplaint.id}`);

  // (a) Verify Persistence under the correct student
  console.log('\n--- Requirement (a): Confirm Persistence Under Correct Student ---');
  const fetchedComplaint = getComplaintById(newComplaint.id);
  assert(fetchedComplaint !== undefined, '(a.1) Complaint exists in database/store');
  assert(fetchedComplaint?.complainantId === studentUser.id, `(a.2) Complaint complainantId matches student ID (${studentUser.id})`);
  assert(fetchedComplaint?.department === studentUser.department, '(a.3) Complaint department matches student department');

  // (b) Verify Visibility on Re-login
  console.log('\n--- Requirement (b): Confirm Visibility in "My Grievances" on Re-login ---');
  console.log(`Simulating re-login for Student (${studentUser.id})...`);
  const studentQueryResult = searchComplaints({
    complainantId: studentUser.id,
    page: 1,
    limit: 10,
  });

  const foundInMyGrievances = studentQueryResult.complaints.some((c) => c.id === newComplaint.id);
  assert(foundInMyGrievances, '(b.1) Submitted complaint is visible in Student "My Grievances" list after re-login');
  assert(studentQueryResult.total >= 1, `(b.2) Student complaints count is ${studentQueryResult.total}`);

  // (c) Verify HOD Notification Creation
  console.log('\n--- Requirement (c): Confirm Notification Created for Assigned Head ---');
  console.log(`Simulating HOD login/fetch for ${hodUser.name} (Role: ${hodUser.role}, Department: ${hodUser.department})...`);
  const hodNotifications = getNotificationsForUser(hodUser.role, hodUser.id, hodUser.department);

  const matchedNotif = hodNotifications.find((n) => n.complaintId === newComplaint.id);
  assert(matchedNotif !== undefined, '(c.1) Notification for new complaint exists in HOD inbox');
  assert(matchedNotif?.recipientRole === 'HEAD', '(c.2) Notification recipientRole is HEAD');
  assert(matchedNotif?.department === studentUser.department, `(c.3) Notification targeted to ${studentUser.department}`);
  console.log(`[LOG] Matched Notification Title: "${matchedNotif?.title}"`);
  console.log(`[LOG] Matched Notification Message: "${matchedNotif?.message}"`);

  console.log('\n============================================================');
  console.log(`  FLOW TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('============================================================\n');

  if (failed > 0) process.exit(1);
}

runFullFlowTest().catch((err) => {
  console.error('Flow Test Error:', err);
  process.exit(1);
});
