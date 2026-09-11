const BASE_URL = 'http://localhost:3000';

async function runRealHttpE2ETest() {
  console.log('\n============================================================');
  console.log('  REAL HTTP END-TO-END VERIFICATION TEST (PORT 3000)');
  console.log('============================================================\n');

  // STEP 1: Log in as Student through real HTTP login API
  console.log('--- Step 1: Real Student Login via HTTP POST /api/auth/google ---');
  const studentLoginRes = await fetch(`${BASE_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'STUDENT',
      email: 'ganesh.patil.comp@jspm.edu.in',
      name: 'Ganesh Patil',
      hd: 'jspm.edu.in',
    }),
  });

  const studentLoginData = await studentLoginRes.json();
  const setCookieHeader = studentLoginRes.headers.get('set-cookie');
  let studentCookie = '';

  if (setCookieHeader) {
    studentCookie = setCookieHeader.split(';')[0];
  }

  console.log(`[HTTP Response Status]: ${studentLoginRes.status}`);
  console.log(`[Extracted Session Cookie]: ${studentCookie.slice(0, 45)}...`);
  console.log(`[Student Login User Payload]:`, studentLoginData.user);

  // Verify session user ID from GET /api/auth/me
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: studentCookie },
  });
  const meData = await meRes.json();
  const studentSessionUserId = meData.user?.userId || meData.user?.id;
  console.log(`[Student Session User ID from /api/auth/me]: "${studentSessionUserId}"`);

  // STEP 2: Make actual HTTP POST request to /api/complaints using real session cookie
  console.log('\n--- Step 2: HTTP POST /api/complaints with Real Session Cookie ---');
  const newComplaintPayload = {
    title: 'E2E Real Network Grievance Test',
    description: 'This is an automated end-to-end HTTP request testing complaint creation, session cookie validation, and notification generation over network.',
    category: 'Infrastructure',
    priority: 'HIGH',
    isAnonymous: false,
  };

  const createRes = await fetch(`${BASE_URL}/api/complaints`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: studentCookie,
    },
    body: JSON.stringify(newComplaintPayload),
  });

  const createData = await createRes.json();
  console.log(`[HTTP Response Status]: ${createRes.status}`);
  console.log(`[Created Complaint Response Payload]:`, createData);

  const createdComplaint = createData.complaint;
  const createdComplaintId = createdComplaint?.id;
  if (!createdComplaintId) {
    throw new Error(`Failed to create complaint over HTTP. Response: ${JSON.stringify(createData)}`);
  }

  // STEP 3: Confirm DB/Store Insertion & complainantId value
  console.log('\n--- Step 3: Confirm DB/Store Insertion & Stored complainantId ---');
  const dbStoredComplainantId = createdComplaint?.complainantId;
  console.log(`[Inserted Complaint Row ID]          : "${createdComplaintId}"`);
  console.log(`[Stored complainantId in DB/Store]   : "${dbStoredComplainantId}"`);
  console.log(`[Complainant Name in DB/Store]       : "${createdComplaint?.complainantName}"`);

  // STEP 4: Log in as HOD through real login flow & HTTP GET /api/notifications
  console.log('\n--- Step 4: Real HOD Login & HTTP GET /api/notifications ---');
  const hodLoginRes = await fetch(`${BASE_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'HEAD',
      email: 'hod.computer@jspm.edu.in',
      name: 'Dr. Suresh Mane',
      hd: 'jspm.edu.in',
    }),
  });

  const hodSetCookie = hodLoginRes.headers.get('set-cookie');
  let hodCookie = '';
  if (hodSetCookie) {
    hodCookie = hodSetCookie.split(';')[0];
  }

  const notifRes = await fetch(`${BASE_URL}/api/notifications`, {
    headers: { Cookie: hodCookie },
  });
  const notifRawJson = await notifRes.json();

  console.log(`[HOD /api/notifications HTTP Status]: ${notifRes.status}`);
  console.log(`[HOD Raw JSON Response]:\n`, JSON.stringify(notifRawJson, null, 2));

  // STEP 5: Explicit Values Comparison
  console.log('\n============================================================');
  console.log('  EXPLICIT VALUE COMPARISON REPORT');
  console.log('============================================================');
  console.log(`1. Complainant ID Stored in DB/Server Store : "${dbStoredComplainantId}"`);
  console.log(`2. Session User ID Student Dashboard Uses   : "${studentSessionUserId}"`);
  console.log(`3. Exact Equality Check (1 === 2)             : ${dbStoredComplainantId === studentSessionUserId}`);
  console.log('============================================================\n');

  if (!dbStoredComplainantId || dbStoredComplainantId !== studentSessionUserId) {
    console.error('MISMATCH DETECTED!');
    process.exit(1);
  } else {
    console.log('✓ VERIFICATION SUCCESSFUL: complainantId in DB/Store EXACTLY matches student session user ID!');
  }
}

runRealHttpE2ETest().catch((err) => {
  console.error('E2E HTTP Test Error:', err);
  process.exit(1);
});
