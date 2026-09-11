const APP_BASE_URL = 'http://localhost:3000';

async function testNewGrievanceAndFetch() {
  console.log('\n============================================================');
  console.log('  TESTING REAL NEW GRIEVANCE SUBMISSION & MY GRIEVANCES FETCH');
  console.log('============================================================\n');

  // Step 1: Login as Student to obtain real session cookie
  console.log('Step 1: Logging in as Student over HTTP...');
  const loginRes = await fetch(`${APP_BASE_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'STUDENT',
      email: 'ganesh.patil.comp@jspm.edu.in',
      name: 'Ganesh Patil',
      hd: 'jspm.edu.in',
    }),
  });

  const setCookieHeader = loginRes.headers.get('set-cookie');
  let studentCookie = '';
  if (setCookieHeader) {
    studentCookie = setCookieHeader.split(';')[0];
  }
  console.log(`[HTTP Login Status]: ${loginRes.status}`);
  console.log(`[Session Cookie Obtained]: ${studentCookie.slice(0, 40)}...`);

  // Step 2: Submit a brand new grievance through the real endpoint
  const newGrievanceTitle = `Broken Classroom Door in Room 405 (${Date.now().toString().slice(-4)})`;
  console.log(`\nStep 2: Submitting brand new grievance: "${newGrievanceTitle}"...`);

  const submitRes = await fetch(`${APP_BASE_URL}/api/complaints`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: studentCookie,
    },
    body: JSON.stringify({
      title: newGrievanceTitle,
      description: 'The door handle in Room 405 is broken and cannot be closed properly during lectures.',
      category: 'Infrastructure',
      priority: 'MEDIUM',
      isAnonymous: false,
    }),
  });

  const submitData = await submitRes.json();
  console.log(`[HTTP Submit Status]: ${submitRes.status}`);
  console.log(`[Submitted Complaint ID]: ${submitData.complaint?.id}`);

  // Step 3: Fetch "My Grievances" list via GET /api/complaints
  console.log('\nStep 3: Fetching "My Grievances" list over HTTP GET /api/complaints...');
  const fetchRes = await fetch(`${APP_BASE_URL}/api/complaints`, {
    headers: { Cookie: studentCookie },
  });

  const fetchData = await fetchRes.json();
  console.log(`[HTTP Fetch Status]: ${fetchRes.status}`);
  console.log(`[Total Complaints Returned]: ${fetchData.complaints?.length}`);

  const newlyCreated = fetchData.complaints.find((c: any) => c.id === submitData.complaint.id);

  console.log('\n============================================================');
  console.log('  VERIFICATION RESULT');
  console.log('============================================================');
  console.log(`- Newly Created Complaint ID : ${submitData.complaint?.id}`);
  console.log(`- Title                      : "${newlyCreated?.title}"`);
  console.log(`- Found in My Grievances List: ${Boolean(newlyCreated)}`);
  console.log('============================================================\n');

  if (!newlyCreated) {
    console.error('FAILED: Newly submitted complaint was not found in My Grievances list!');
    process.exit(1);
  } else {
    console.log('SUCCESS: Brand new complaint appeared in "My Grievances" list dynamically!');
  }
}

testNewGrievanceAndFetch().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
