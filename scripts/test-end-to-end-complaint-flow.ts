import { createComplaint, getComplaintById, searchComplaints } from '../src/lib/complaint-store';

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

async function testCompleteFlow() {
  console.log('\n==================================================');
  console.log('  Testing End-to-End Complaint Creation & Detail Flow');
  console.log('==================================================\n');

  // STEP 1: Submit a new complaint
  console.log('--- Step 1: Submit Complaint ---');
  const title = 'Library AC Leaking Water near Study Tables';
  const description = 'The air conditioning unit in the central library near section B is leaking water profusely onto study tables.';
  const category = 'Infrastructure';
  const priority = 'URGENT';

  const newComp = createComplaint({
    title,
    description,
    category,
    priority,
    isAnonymous: false,
    complainantId: 'usr-001',
    complainantName: 'Ganesh Patil',
    complainantRole: 'STUDENT',
    department: 'Computer Engineering',
  });

  assert(newComp !== undefined && newComp.id.startsWith('COMP-'), 'Step 1 Passed: Unique complaint ID generated');
  const generatedId = newComp.id;
  console.log(`  -> Generated Complaint ID: ${generatedId}`);

  // STEP 2: Save and verify in store / list
  console.log('\n--- Step 2 & 3: Save & Display in Recent Complaints ---');
  const listResult = searchComplaints({ query: generatedId });
  assert(listResult.complaints.length === 1, 'Step 2 & 3 Passed: Complaint saved and found in search/recent list');
  assert(listResult.complaints[0].id === generatedId, 'Step 2 & 3 Passed: Saved ID in list matches generated ID');

  // STEP 4 & 5: Open details using SAME generated ID
  console.log('\n--- Step 4 & 5: Fetch Complaint Details with SAME ID ---');
  const fetchedDetail = getComplaintById(generatedId);
  assert(fetchedDetail !== undefined, 'Step 4 & 5 Passed: Complaint details retrieved successfully without 404');
  assert(fetchedDetail?.id === generatedId, 'Step 4 & 5 Passed: Details page uses exact same ID');
  assert(fetchedDetail?.title === title, 'Step 4 & 5 Passed: Title matches submitted data');
  assert(fetchedDetail?.status === 'SUBMITTED', 'Step 4 & 5 Passed: Status is SUBMITTED');
  assert(fetchedDetail?.statusHistory.length! >= 1, 'Step 4 & 5 Passed: Initial status history record present');

  // STEP 6: Non-existent ID handling
  console.log('\n--- Step 6: Non-existent ID 404 Handling ---');
  const nonExistent = getComplaintById('COMP-INVALID-9999');
  assert(nonExistent === undefined, 'Step 6 Passed: Non-existent ID returns undefined (truly 404)');

  console.log('\n==================================================');
  console.log(`  E2E FLOW TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

testCompleteFlow().catch((err) => {
  console.error('E2E Flow test failed:', err);
  process.exit(1);
});
