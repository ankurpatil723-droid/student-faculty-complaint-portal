async function run() {
  console.log('--- TESTING COMPLAINT DETAIL API ROUTES ---');
  
  const loginRes = await fetch('http://localhost:3000/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ganesh.patil.comp@jspm.edu.in', role: 'STUDENT', name: 'Ganesh Patil' })
  });
  const cookie = loginRes.headers.get('set-cookie') || '';
  console.log('Login Status:', loginRes.status);

  const testIds = ['COMP-104', 'COMP-098', 'COMP-081', 'comp-104'];
  for (const id of testIds) {
    const res = await fetch(`http://localhost:3000/api/complaints/${id}`, {
      headers: { 'Cookie': cookie }
    });
    const data: any = await res.json();
    console.log(`Fetch ID [${id}] -> Status: ${res.status} | Title: "${data.complaint?.title || data.error}"`);
  }
}

run().catch(console.error);
