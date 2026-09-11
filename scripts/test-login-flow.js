async function testLoginFlow() {
  console.log('============================================================');
  console.log('LOGIN FLOW DIAGNOSTIC & VERIFICATION TEST');
  console.log('============================================================\n');

  console.log('--- 1. Making POST Request to /api/auth/login ---');
  console.log('Payload: { email: "ganesh.patil.comp@jspm.edu.in", password: "Password@123", selectedRole: "STUDENT" }\n');

  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'ganesh.patil.comp@jspm.edu.in',
      password: 'Password@123',
      selectedRole: 'STUDENT',
    }),
  });

  console.log('HTTP Response Status:', loginRes.status);
  const cookieHeader = loginRes.headers.get('set-cookie');
  console.log('Set-Cookie Header   :', cookieHeader);

  const loginData = await loginRes.json();
  console.log('\nRAW LOGIN API RESPONSE BODY:');
  console.log(JSON.stringify(loginData, null, 2));

  console.log('\n--- 2. Verifying Protected Route /student/dashboard with Session Cookie ---');
  const sessionCookie = cookieHeader ? cookieHeader.split(';')[0] : '';
  const dashRes = await fetch('http://localhost:3000/student/dashboard', {
    headers: { Cookie: sessionCookie },
    redirect: 'manual', // do not auto-follow to check if 200 vs 302
  });

  console.log('Protected Dashboard HTTP Status:', dashRes.status);
  if (dashRes.status === 200) {
    console.log('SUCCESS: Server returned 200 OK! Middleware verified valid session token. User redirected to /student/dashboard successfully!');
  } else {
    console.log('Redirect Header:', dashRes.headers.get('location'));
  }
}

testLoginFlow().catch(console.error);
