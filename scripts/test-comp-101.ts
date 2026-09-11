async function testComp101() {
  console.log('=== STEP 6: REAL HTTP GET REQUEST TO /api/complaints/COMP-101 ===\n');

  // 1. Authenticate to get session cookie
  const loginRes = await fetch('http://localhost:3000/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'ganesh.patil.comp@jspm.edu.in',
      role: 'STUDENT',
      name: 'Ganesh Patil',
    }),
  });

  const cookie = loginRes.headers.get('set-cookie') || '';
  console.log('HTTP Login Status:', loginRes.status);
  console.log('Session Cookie Header:', cookie.split(';')[0]);

  // 2. Make real HTTP GET request to /api/complaints/COMP-101
  const response = await fetch('http://localhost:3000/api/complaints/COMP-101', {
    headers: {
      'Cookie': cookie,
    },
    cache: 'no-store',
  });

  console.log('HTTP GET Status Code:', response.status);

  const rawJson = await response.text();
  console.log('\n--- RAW JSON RESPONSE FROM SERVER ---');
  console.log(rawJson);
  console.log('-------------------------------------\n');
}

testComp101().catch(console.error);
