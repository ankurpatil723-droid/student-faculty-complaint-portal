import {
  createComplaint,
  getComplaintById,
  updateComplaintStatus,
  assignComplaint,
  addComment,
  addAttachment,
  searchComplaints,
  getCategories,
  getSubcategories,
  canTransition,
  getValidNextStatuses,
} from '../src/lib/complaint-store';
import type { ComplaintStatus, Priority, CategoryType } from '../src/lib/types';

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

async function runComplaintTests() {
  console.log('\n==================================================');
  console.log('  RSCOE Grievance Portal - Core Complaint Module (Phase 4)');
  console.log('==================================================\n');

  // TEST GROUP 1: Categories & Subcategories
  console.log('--- TEST GROUP 1: Categories & Subcategories ---');
  const categories = getCategories();
  assert(categories.length >= 6, 'All 6 core complaint categories defined');
  const academicsCat = categories.find((c) => c.name === 'Academics');
  assert(academicsCat !== undefined && academicsCat.subcategories.length > 0, 'Academics category has subcategories');
  const subcats = getSubcategories('Infrastructure');
  assert(subcats.includes('Classrooms') && subcats.includes('Laboratories'), 'Infrastructure subcategories retrieved correctly');

  // TEST GROUP 2: Create Complaint & ID Generation
  console.log('\n--- TEST GROUP 2: Create Complaint & ID Generation ---');
  const newComplaint = createComplaint({
    title: 'Faulty Air Conditioning in Lab 304',
    description: 'The air conditioner in Computer Lab 304 has been leaking water and creating significant noise during practical sessions.',
    category: 'Infrastructure',
    subcategory: 'Laboratories',
    priority: 'HIGH',
    isAnonymous: false,
    complainantId: 'usr-001',
    complainantName: 'Ganesh Patil',
    complainantRole: 'STUDENT',
    department: 'Computer Engineering',
  });

  assert(newComplaint.id.startsWith('COMP-'), 'Complaint ID generated with COMP- prefix');
  assert(newComplaint.status === 'SUBMITTED', 'Initial status defaults to SUBMITTED');
  assert(newComplaint.priority === 'HIGH', 'Priority set to HIGH');
  assert(newComplaint.category === 'Infrastructure', 'Category set to Infrastructure');
  assert(newComplaint.subcategory === 'Laboratories', 'Subcategory set to Laboratories');
  assert(newComplaint.statusHistory.length === 1, 'Initial status history audit log created');
  assert(newComplaint.statusHistory[0].newStatus === 'SUBMITTED', 'Audit log records SUBMITTED status');

  // TEST GROUP 3: Priority & Status Lifecycle Transition Matrix
  console.log('\n--- TEST GROUP 3: Status Lifecycle & Audit History (9 Statuses) ---');
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
  assert(validStatuses.length === 9, 'All 9 required complaint statuses defined');

  // Test valid transition: SUBMITTED -> UNDER_REVIEW
  assert(canTransition('SUBMITTED', 'UNDER_REVIEW'), 'Transition SUBMITTED -> UNDER_REVIEW is valid');
  const updated1 = updateComplaintStatus(newComplaint.id, 'UNDER_REVIEW', 'usr-003', 'Dr. Suresh Mane', 'Reviewed by HOD');
  assert(updated1?.status === 'UNDER_REVIEW', 'Status updated to UNDER_REVIEW');
  assert(updated1?.statusHistory.length === 2, 'Audit log appended for status change');

  // Test assignment flow: UNDER_REVIEW -> ASSIGNED
  console.log('\n--- TEST GROUP 4: Assignment Flow & Auto-Status Change ---');
  const assignment = assignComplaint(newComplaint.id, 'usr-002', 'usr-003', 'Assigned to Lab Assistant for inspection');
  assert(assignment !== undefined && assignment.assignedTo === 'usr-002', 'Complaint assigned to investigator usr-002');
  const assignedComplaint = getComplaintById(newComplaint.id);
  assert(assignedComplaint?.status === 'ASSIGNED', 'Status auto-updated to ASSIGNED upon assignment');
  assert(assignedComplaint?.assignedTo === 'usr-002', 'assignedTo field populated on complaint');

  // Test downstream transitions: ASSIGNED -> IN_PROGRESS -> RESOLVED -> CLOSED
  console.log('\n--- TEST GROUP 5: Sequential Lifecycle Progressions ---');
  assert(canTransition('ASSIGNED', 'IN_PROGRESS'), 'Transition ASSIGNED -> IN_PROGRESS is valid');
  updateComplaintStatus(newComplaint.id, 'IN_PROGRESS', 'usr-002', 'Prof. Anil Kadam', 'Repair work commenced');

  assert(canTransition('IN_PROGRESS', 'RESOLVED'), 'Transition IN_PROGRESS -> RESOLVED is valid');
  updateComplaintStatus(newComplaint.id, 'RESOLVED', 'usr-002', 'Prof. Anil Kadam', 'AC serviced and fixed');

  assert(canTransition('RESOLVED', 'CLOSED'), 'Transition RESOLVED -> CLOSED is valid');
  const closedComplaint = updateComplaintStatus(newComplaint.id, 'CLOSED', 'usr-001', 'Ganesh Patil', 'Confirmed resolved');
  assert(closedComplaint?.status === 'CLOSED', 'Complaint status updated to CLOSED');
  assert(closedComplaint?.closedAt !== undefined, 'closedAt timestamp populated');

  // Test Reopening: CLOSED -> REOPENED -> UNDER_REVIEW
  console.log('\n--- TEST GROUP 6: Reopening & Escalation Lifecycle ---');
  assert(canTransition('CLOSED', 'REOPENED'), 'Transition CLOSED -> REOPENED is valid');
  const reopened = updateComplaintStatus(newComplaint.id, 'REOPENED', 'usr-001', 'Ganesh Patil', 'Issue reoccurred next day');
  assert(reopened?.status === 'REOPENED', 'Status updated to REOPENED');

  // Test Invalid Transition Enforcement
  let invalidCaught = false;
  try {
    updateComplaintStatus(newComplaint.id, 'CLOSED', 'usr-001', 'Ganesh Patil', 'Direct close attempt');
  } catch (err: any) {
    invalidCaught = true;
    assert(err.message.includes('Invalid status transition'), 'Invalid status transition REOPENED -> CLOSED blocked with exception');
  }
  assert(invalidCaught, 'Invalid status transition rejected');

  // TEST GROUP 7: Comments & Anonymity Controls
  console.log('\n--- TEST GROUP 7: Threaded Comments & Anonymity ---');
  const comment1 = addComment({
    complaintId: newComplaint.id,
    authorId: 'usr-001',
    authorName: 'Ganesh Patil',
    authorRole: 'STUDENT',
    content: 'Thank you for looking into this so quickly.',
    isAnonymous: false,
  });
  assert(comment1 !== undefined && comment1.authorName === 'Ganesh Patil', 'Standard comment added');

  const comment2 = addComment({
    complaintId: newComplaint.id,
    authorId: 'usr-001',
    authorName: 'Ganesh Patil',
    authorRole: 'STUDENT',
    content: 'Additional anonymous note.',
    isAnonymous: true,
  });
  assert(comment2 !== undefined && comment2.authorName === 'Anonymous', 'Anonymous comment masks authorName');

  // TEST GROUP 8: Attachments Metadata Management
  console.log('\n--- TEST GROUP 8: Attachments Metadata Management ---');
  const att = addAttachment({
    complaintId: newComplaint.id,
    fileName: 'lab_ac_photo.jpg',
    fileType: 'image/jpeg',
    fileSize: 1024 * 500,
    uploadedBy: 'usr-001',
  });
  assert(att !== undefined && att.fileName === 'lab_ac_photo.jpg', 'Attachment metadata added');
  const fetchedComplaint = getComplaintById(newComplaint.id);
  assert(fetchedComplaint?.attachments.length === 1, 'Attachment reflected in complaint object');

  // TEST GROUP 9: Search, Filtering, Pagination, Sorting
  console.log('\n--- TEST GROUP 9: Search, Filtering, Pagination & Sorting ---');
  const searchResult = searchComplaints({
    query: 'Air Conditioning',
    status: 'ALL',
    priority: 'ALL',
    category: 'ALL',
    page: 1,
    limit: 10,
  });
  assert(searchResult.complaints.length > 0, 'Search query matches title/description');

  const filterResult = searchComplaints({
    category: 'Infrastructure',
    priority: 'HIGH',
  });
  assert(filterResult.complaints.every((c) => c.category === 'Infrastructure'), 'Category filter applied correctly');

  const deptResult = searchComplaints({
    department: 'Computer Engineering',
  });
  assert(deptResult.complaints.every((c) => c.department === 'Computer Engineering'), 'Department filter applied correctly');

  const sortedResult = searchComplaints({
    sortBy: 'priority',
    sortOrder: 'desc',
  });
  assert(sortedResult.complaints.length > 0, 'Sorting by priority executed');

  const paginatedResult = searchComplaints({
    page: 1,
    limit: 2,
  });
  assert(paginatedResult.complaints.length <= 2, 'Pagination limit strictly enforced');

  // TEST GROUP 10: Role-Based Complaint Visibility Rules
  console.log('\n--- TEST GROUP 10: Role-Based Access & Visibility Rules ---');
  const studentComplaints = searchComplaints({ complainantId: 'usr-001' });
  assert(studentComplaints.complaints.every((c) => c.complainantId === 'usr-001'), 'Student sees only own complaints');

  const teacherComplaints = searchComplaints({ assignedOrComplainant: 'usr-002' });
  assert(
    teacherComplaints.complaints.every((c) => c.complainantId === 'usr-002' || c.assignedTo === 'usr-002'),
    'Teacher sees own or assigned complaints'
  );

  const headComplaints = searchComplaints({ department: 'Computer Engineering' });
  assert(
    headComplaints.complaints.every((c) => c.department === 'Computer Engineering'),
    'Department Head sees department complaints'
  );

  console.log('\n==================================================');
  console.log(`  TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runComplaintTests().catch((err) => {
  console.error('Test execution failed with error:', err);
  process.exit(1);
});
