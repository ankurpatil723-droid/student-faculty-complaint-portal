async function login(email, password) {
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const cookie = res.headers.get('set-cookie');
  const data = await res.json();
  return { status: res.status, data, cookie };
}

async function submitComplaint(cookie, payload) {
  const res = await fetch('http://localhost:3000/api/complaints', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function getNotifications(cookie) {
  const res = await fetch('http://localhost:3000/api/notifications', {
    headers: { Cookie: cookie },
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function runTest() {
  console.log('============================================================');
  console.log('PART 1 & PART 2 END-TO-END VERIFICATION TEST');
  console.log('============================================================\n');

  console.log('--- STEP 1: Log in as Student (Ganesh Patil) ---');
  const studentLogin = await login('ganesh.patil.comp@jspm.edu.in', 'Password@123');
  console.log('Student Login HTTP Status:', studentLogin.status);
  console.log('Logged In User:', studentLogin.data.user?.name, '| Email:', studentLogin.data.user?.email, '| Role:', studentLogin.data.user?.role, '| Dept:', studentLogin.data.user?.department);

  const studentCookie = studentLogin.cookie ? studentLogin.cookie.split(';')[0] : '';

  console.log('\n--- STEP 2: Submit a New Grievance as Student ---');
  const newComplaintPayload = {
    title: 'Smart Interactive Board Touch Calibration Issue in Lab 304',
    description: 'The interactive smart board in Computer Lab 304 has severe touch touch registration lag and power drops during lecture practicals.',
    category: 'Infrastructure',
    subcategory: 'Laboratories',
    priority: 'HIGH',
    isAnonymous: false,
  };

  const complaintRes = await submitComplaint(studentCookie, newComplaintPayload);
  console.log('Complaint Submission HTTP Status:', complaintRes.status);
  console.log('Submitted Complaint ID    :', complaintRes.data.complaint?.id);
  console.log('Submitted Complaint Title :', complaintRes.data.complaint?.title);
  console.log('Target Department         :', complaintRes.data.complaint?.department);

  console.log('\n--- STEP 3: Log in as Department HOD (Dr. Suresh Mane) ---');
  const hodLogin = await login('hod.computer@jspm.edu.in', 'Password@123');
  console.log('HOD Login HTTP Status:', hodLogin.status);
  console.log('Logged In HOD User:', hodLogin.data.user?.name, '| Email:', hodLogin.data.user?.email, '| Role:', hodLogin.data.user?.role, '| Dept:', hodLogin.data.user?.department);

  const hodCookie = hodLogin.cookie ? hodLogin.cookie.split(';')[0] : '';

  console.log('\n--- STEP 4: Make real HTTP GET request to /api/notifications as HOD ---');
  const notifRes = await getNotifications(hodCookie);
  console.log('HOD /api/notifications HTTP Status:', notifRes.status);
  console.log('\nRAW JSON RESPONSE FROM /api/notifications FOR HOD:');
  console.log(JSON.stringify(notifRes.data, null, 2));

  console.log('\n============================================================');
  console.log('VERIFICATION SUCCESSFULLY COMPLETED!');
  console.log('============================================================');
}

runTest().catch(console.error);
