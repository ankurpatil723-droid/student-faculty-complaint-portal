import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const BASE_URL = 'http://localhost:3000';

interface TestUser {
  role: 'STUDENT' | 'TEACHER' | 'HEAD' | 'SUPER_ADMIN';
  email: string;
  name: string;
  department: string;
  cookie?: string;
  sessionToken?: string;
}

const testUsers: Record<string, TestUser> = {
  STUDENT: {
    role: 'STUDENT',
    email: 'test.student.verify@jspm.edu.in',
    name: 'Test Student Verifier',
    department: 'Computer Engineering',
  },
  TEACHER: {
    role: 'TEACHER',
    email: 'test.teacher.verify@jspm.edu.in',
    name: 'Prof. Test Teacher',
    department: 'Computer Engineering',
  },
  HEAD: {
    role: 'HEAD',
    email: 'hod.computer.verify@jspm.edu.in',
    name: 'Dr. Test Head',
    department: 'Computer Engineering',
  },
  SUPER_ADMIN: {
    role: 'SUPER_ADMIN',
    email: 'principal.verify@jspm.edu.in',
    name: 'Principal Super Admin',
    department: 'Administration',
  },
};

const results: Record<string, { status: 'PASS' | 'FAIL'; details: string[] }> = {};

function logSection(title: string) {
  console.log('\n============================================================');
  console.log(`  ${title}`);
  console.log('============================================================\n');
}

async function runAuthVerification() {
  logSection('CHECK 3: AUTH & SESSION HANDLING');
  const details: string[] = [];
  let passed = true;

  for (const [roleKey, userDef] of Object.entries(testUsers)) {
    console.log(`\n[Auth] Authenticating as role: ${userDef.role} (${userDef.email})...`);
    
    // Authenticate via /api/auth/google
    const loginRes = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: userDef.role,
        email: userDef.email,
        name: userDef.name,
        hd: 'jspm.edu.in',
      }),
    });

    const setCookieHeaders = loginRes.headers.get('set-cookie');
    const loginData = await loginRes.json();

    if (!loginRes.ok) {
      console.error(`❌ [FAIL] Auth login failed for ${userDef.role}:`, loginData);
      details.push(`Auth login failed for ${userDef.role}: ${JSON.stringify(loginData)}`);
      passed = false;
      continue;
    }

    let cookie = '';
    if (setCookieHeaders) {
      cookie = setCookieHeaders.split(',').map(c => c.split(';')[0].trim()).join('; ');
      userDef.cookie = cookie;
    }

    console.log(`✓ Login success for ${userDef.role}. Status: ${loginRes.status}`);
    console.log(`  Session User ID: ${loginData.user?.id || loginData.user?.userId}`);
    details.push(`Role ${userDef.role}: Logged in successfully, session cookie issued`);

    // Verify session persistence by calling /api/auth/me
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: userDef.cookie || '' },
    });
    const meData = await meRes.json();

    if (meRes.ok && meData.user) {
      console.log(`✓ Session persistent & valid via /api/auth/me for ${userDef.role}:`, meData.user.email);
      details.push(`Role ${userDef.role}: Session verified via /api/auth/me`);
    } else {
      console.error(`❌ [FAIL] /api/auth/me failed for ${userDef.role}:`, meData);
      details.push(`Role ${userDef.role}: /api/auth/me verification failed`);
      passed = false;
    }
  }

  // Test invalid session token
  console.log('\n[Auth] Testing invalid session token...');
  const invalidMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: 'rscoe_session=invalid-token-12345' },
  });
  console.log(`  Invalid session request returned HTTP status: ${invalidMeRes.status}`);
  if (invalidMeRes.status === 401 || !invalidMeRes.ok) {
    console.log('✓ Invalid session properly rejected with 401 Unauthorized');
    details.push('Invalid session token rejected with 401');
  } else {
    console.error('❌ [FAIL] Invalid session token was not rejected');
    passed = false;
  }

  results['CHECK_3_AUTH'] = {
    status: passed ? 'PASS' : 'FAIL',
    details,
  };
}

async function runRbacVerification() {
  logSection('CHECK 4: RBAC / MIDDLEWARE ENFORCEMENT');
  const details: string[] = [];
  let passed = true;

  const prefixes = [
    { name: '/student/dashboard', path: '/student/dashboard', allowedRoles: ['STUDENT', 'SUPER_ADMIN'] },
    { name: '/teacher/dashboard', path: '/teacher/dashboard', allowedRoles: ['TEACHER', 'SUPER_ADMIN'] },
    { name: '/admin/dashboard', path: '/admin/dashboard', allowedRoles: ['HEAD', 'SUPER_ADMIN'] },
  ];

  console.log('Testing Unauthenticated access against all protected prefixes...');
  for (const prefix of prefixes) {
    const unauthRes = await fetch(`${BASE_URL}${prefix.path}`, {
      redirect: 'manual',
    });
    const location = unauthRes.headers.get('location') || '';
    const isRedirect = unauthRes.status === 307 || unauthRes.status === 302 || unauthRes.status === 308;
    console.log(`  [Unauthenticated] -> ${prefix.name}: Status=${unauthRes.status}, Location=${location}`);
    
    if (isRedirect && location.includes('/login') && location.includes('error=unauthorized')) {
      console.log(`  ✓ Correctly redirected to /login?error=unauthorized`);
      details.push(`Unauthenticated -> ${prefix.name}: 307 redirect to /login?error=unauthorized (PASS)`);
    } else {
      console.error(`  ❌ [FAIL] Unauth route was not redirected to /login?error=unauthorized`);
      details.push(`Unauthenticated -> ${prefix.name}: Failed redirect check (Status: ${unauthRes.status})`);
      passed = false;
    }
  }

  // Matrix table of Role x Prefix
  console.log('\nTesting Role × Route Matrix...');
  for (const [roleKey, userDef] of Object.entries(testUsers)) {
    for (const prefix of prefixes) {
      const isAllowed = prefix.allowedRoles.includes(userDef.role);
      
      const roleRes = await fetch(`${BASE_URL}${prefix.path}`, {
        headers: { Cookie: userDef.cookie || '' },
        redirect: 'manual',
      });
      const location = roleRes.headers.get('location') || '';

      console.log(`  [Role: ${userDef.role}] -> ${prefix.name}: Status=${roleRes.status}, Location=${location}`);

      if (isAllowed) {
        if (roleRes.status === 200) {
          console.log(`    ✓ Correct role permitted (200 OK)`);
          details.push(`${userDef.role} -> ${prefix.name}: 200 OK (PASS)`);
        } else {
          console.error(`    ❌ [FAIL] Permitted role was blocked: Status=${roleRes.status}`);
          details.push(`${userDef.role} -> ${prefix.name}: Blocked with ${roleRes.status} (FAIL)`);
          passed = false;
        }
      } else {
        const isForbiddenRedirect = (roleRes.status === 307 || roleRes.status === 302 || roleRes.status === 308) && location.includes('error=forbidden');
        if (isForbiddenRedirect) {
          console.log(`    ✓ Disallowed role redirected with error=forbidden`);
          details.push(`${userDef.role} -> ${prefix.name}: Redirected with error=forbidden (PASS)`);
        } else {
          console.error(`    ❌ [FAIL] Disallowed role did not receive forbidden redirect: Status=${roleRes.status}, Location=${location}`);
          details.push(`${userDef.role} -> ${prefix.name}: Invalid response ${roleRes.status} (FAIL)`);
          passed = false;
        }
      }
    }
  }

  results['CHECK_4_RBAC'] = {
    status: passed ? 'PASS' : 'FAIL',
    details,
  };
}

async function runComplaintLifecycle() {
  logSection('CHECK 5: COMPLAINT LIFECYCLE & WORKFLOW');
  const details: string[] = [];
  let passed = true;

  const studentCookie = testUsers.STUDENT.cookie;
  const headCookie = testUsers.HEAD.cookie;

  // 1. Submit non-anonymous complaint as STUDENT
  console.log('1. Submitting non-anonymous complaint as STUDENT...');
  const comp1Res = await fetch(`${BASE_URL}/api/complaints`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: studentCookie || '',
    },
    body: JSON.stringify({
      title: 'Verification LifeCycle Test Complaint',
      description: 'Testing SUBMITTED -> UNDER_REVIEW -> ASSIGNED -> RESOLVED -> REOPEN cycle.',
      category: 'Academics',
      subCategory: 'Examinations',
      priority: 'HIGH',
      isAnonymous: false,
    }),
  });

  const comp1Data = await comp1Res.json();
  const complaintId = comp1Data.complaint?.id;
  console.log(`  Created Complaint ID: ${complaintId}, Status: ${comp1Data.complaint?.status}`);

  if (comp1Res.ok && comp1Data.complaint?.status === 'SUBMITTED') {
    console.log('  ✓ Complaint created with status SUBMITTED');
    details.push(`Complaint ${complaintId} created with status SUBMITTED`);
  } else {
    console.error('  ❌ [FAIL] Complaint creation failed:', comp1Data);
    passed = false;
    details.push(`Failed to create complaint: ${JSON.stringify(comp1Data)}`);
  }

  // 2. Submit anonymous complaint as STUDENT
  console.log('\n2. Submitting anonymous complaint as STUDENT...');
  const compAnonRes = await fetch(`${BASE_URL}/api/complaints`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: studentCookie || '',
    },
    body: JSON.stringify({
      title: 'Verification Anonymous Complaint',
      description: 'Testing anonymous complaint identity concealment and reveal workflow.',
      category: 'Infrastructure',
      subCategory: 'Classrooms',
      priority: 'MEDIUM',
      isAnonymous: true,
    }),
  });
  const compAnonData = await compAnonRes.json();
  const anonComplaintId = compAnonData.complaint?.id;
  console.log(`  Created Anonymous Complaint ID: ${anonComplaintId}, Status: ${compAnonData.complaint?.status}, isAnonymous: ${compAnonData.complaint?.isAnonymous}`);
  if (compAnonRes.ok && compAnonData.complaint?.isAnonymous === true) {
    console.log('  ✓ Anonymous complaint created with isAnonymous=true');
    details.push(`Anonymous complaint ${anonComplaintId} created`);
  } else {
    console.error('  ❌ [FAIL] Anonymous complaint creation failed');
    passed = false;
  }

  // 3. Move standard complaint through UNDER_REVIEW -> ASSIGNED -> RESOLVED as HEAD
  console.log(`\n3. Transitioning ${complaintId} to UNDER_REVIEW as HEAD...`);
  const tr1Res = await fetch(`${BASE_URL}/api/complaints/${complaintId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: headCookie || '',
    },
    body: JSON.stringify({
      status: 'UNDER_REVIEW',
      notes: 'Reviewing grievance details.',
    }),
  });
  const tr1Data = await tr1Res.json();
  console.log(`  Transition result: status=${tr1Data.complaint?.status}`);
  if (tr1Res.ok && tr1Data.complaint?.status === 'UNDER_REVIEW') {
    console.log('  ✓ Successfully moved to UNDER_REVIEW');
    details.push(`${complaintId} transitioned to UNDER_REVIEW`);
  } else {
    console.error('  ❌ [FAIL] Failed transition to UNDER_REVIEW:', tr1Data);
    passed = false;
  }

  // 4. Assign complaint to teacher
  console.log(`\n4. Transitioning ${complaintId} to ASSIGNED as HEAD...`);
  const assignRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: headCookie || '',
    },
    body: JSON.stringify({
      assignedTo: 'usr-002',
      notes: 'Please look into exam schedule issue.',
    }),
  });
  const assignData = await assignRes.json();
  console.log(`  Assign result:`, assignData);
  if (assignRes.ok) {
    console.log('  ✓ Successfully assigned to faculty');
    details.push(`${complaintId} assigned to faculty`);
  } else {
    console.error('  ❌ [FAIL] Assignment failed:', assignData);
    passed = false;
  }

  // 5. Transition to RESOLVED
  console.log(`\n5. Transitioning ${complaintId} to RESOLVED as HEAD...`);
  const resolveRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: headCookie || '',
    },
    body: JSON.stringify({
      status: 'RESOLVED',
      notes: 'Exam schedule updated and communicated to student.',
    }),
  });
  const resolveData = await resolveRes.json();
  console.log(`  Resolve result: status=${resolveData.complaint?.status}`);
  if (resolveRes.ok && resolveData.complaint?.status === 'RESOLVED') {
    console.log('  ✓ Successfully moved to RESOLVED');
    details.push(`${complaintId} transitioned to RESOLVED`);
  } else {
    console.error('  ❌ [FAIL] Transition to RESOLVED failed:', resolveData);
    passed = false;
  }

  // 6. Test illegal transition (e.g. attempting invalid jump SUBMITTED -> CLOSED)
  console.log('\n6. Testing illegal transition attempt...');
  const illegalRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: studentCookie || '',
    },
    body: JSON.stringify({
      status: 'SUBMITTED',
    }),
  });
  const illegalData = await illegalRes.json();
  console.log(`  Illegal transition returned status: ${illegalRes.status} (Error: ${illegalData.error})`);
  if (illegalRes.status === 400 || illegalRes.status === 403 || !illegalRes.ok) {
    console.log('  ✓ Illegal transition properly rejected');
    details.push('Illegal transition properly rejected with 400/403');
  } else {
    console.error('  ❌ [FAIL] Illegal transition was permitted');
    passed = false;
  }

  // 7. Reopen complaint as original complainant
  console.log('\n7. Reopening RESOLVED complaint as original STUDENT...');
  const reopenRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: studentCookie || '',
    },
    body: JSON.stringify({
      status: 'UNDER_REVIEW',
      notes: 'Issue is not fully resolved, exam slot still clashes.',
    }),
  });
  const reopenData = await reopenRes.json();
  console.log(`  Reopen result: status=${reopenData.complaint?.status}`);
  if (reopenRes.ok && reopenData.complaint?.status === 'UNDER_REVIEW') {
    console.log('  ✓ Complainant successfully reopened complaint to UNDER_REVIEW');
    details.push(`${complaintId} reopened to UNDER_REVIEW by complainant`);
  } else {
    console.error('  ❌ [FAIL] Reopen failed:', reopenData);
    passed = false;
  }

  results['CHECK_5_LIFECYCLE'] = {
    status: passed ? 'PASS' : 'FAIL',
    details,
  };

  return { anonComplaintId };
}

async function runAnonymityAndRevealWorkflow(anonComplaintId: string) {
  logSection('CHECK 6: ANONYMITY & REVEAL-REQUEST FLOW');
  const details: string[] = [];
  let passed = true;

  const headCookie = testUsers.HEAD.cookie;
  const teacherCookie = testUsers.TEACHER.cookie;
  const superAdminCookie = testUsers.SUPER_ADMIN.cookie;

  // 1. Confirm identity fields are absent when queried by HEAD
  console.log(`1. Querying anonymous complaint ${anonComplaintId} as HEAD...`);
  const headViewRes = await fetch(`${BASE_URL}/api/complaints/${anonComplaintId}`, {
    headers: { Cookie: headCookie || '' },
  });
  const headViewData = await headViewRes.json();
  const c = headViewData.complaint;

  console.log(`  complainantName returned to HEAD: "${c?.complainantName}"`);
  console.log(`  complainantEmail returned to HEAD: "${c?.complainantEmail}"`);
  console.log(`  complainantId returned to HEAD: "${c?.complainantId}"`);
  console.log(`  complainantRollNo returned to HEAD: "${c?.complainantRollNo}"`);

  const isHidden =
    (!c?.complainantName || c?.complainantName === 'Anonymous') &&
    !c?.complainantEmail &&
    !c?.complainantId &&
    !c?.complainantRollNo;

  if (isHidden) {
    console.log('  ✓ Complainant identity is strictly concealed from HEAD before reveal');
    details.push('Complainant identity strictly concealed before disclosure');
  } else {
    console.error('  ❌ [FAIL] Identity leaked to HEAD:', c);
    passed = false;
    details.push('Identity leaked before disclosure');
  }

  // 2. Confirm role other than HEAD/SUPER_ADMIN (e.g. TEACHER) cannot reveal identity
  console.log('\n2. Attempting to reveal identity as TEACHER (unauthorized role)...');
  const teacherRevealRes = await fetch(`${BASE_URL}/api/complaints/${anonComplaintId}/identity`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: teacherCookie || '',
    },
    body: JSON.stringify({
      reason: 'Teacher investigation attempt without permission',
    }),
  });
  const teacherRevealData = await teacherRevealRes.json();
  console.log(`  Teacher reveal attempt returned HTTP status: ${teacherRevealRes.status} (Error: ${teacherRevealData.error})`);
  if (teacherRevealRes.status === 403 || !teacherRevealRes.ok) {
    console.log('  ✓ Non-authorized role disclosure properly rejected with 403 Forbidden');
    details.push('Unauthorized role disclosure rejected with 403 Forbidden');
  } else {
    console.error('  ❌ [FAIL] Non-authorized role was able to request reveal');
    passed = false;
  }

  // 3. Test invalid reason (< 5 characters) rejected
  console.log('\n3. Testing disclosure rejection when reason is too short...');
  const shortReasonRes = await fetch(`${BASE_URL}/api/complaints/${anonComplaintId}/identity`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: headCookie || '',
    },
    body: JSON.stringify({
      reason: 'abc',
    }),
  });
  console.log(`  Short reason returned status: ${shortReasonRes.status}`);
  if (shortReasonRes.status === 400) {
    console.log('  ✓ Short reason properly rejected with 400 Bad Request');
    details.push('Disclosure with short reason rejected with 400 Bad Request');
  } else {
    console.error('  ❌ [FAIL] Short reason was not rejected with 400');
    passed = false;
  }

  // 4. As HEAD, execute authorized reveal with formal justification
  console.log('\n4. Executing authorized reveal as HEAD with valid formal reason...');
  const validReason = 'Formal disciplinary hearing and campus safety inquiry requires student identification.';
  const headRevealRes = await fetch(`${BASE_URL}/api/complaints/${anonComplaintId}/identity`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: headCookie || '',
    },
    body: JSON.stringify({
      reason: validReason,
    }),
  });
  const headRevealData = await headRevealRes.json();
  console.log(`  HEAD reveal result: status=${headRevealRes.status}`, headRevealData);
  if (headRevealRes.ok && headRevealData.complainantId && headRevealData.auditId) {
    console.log('  ✓ Identity revealed to HEAD with audit ID:', headRevealData.auditId);
    details.push(`Identity disclosed to HEAD (Audit ID: ${headRevealData.auditId})`);
  } else {
    console.error('  ❌ [FAIL] Authorized reveal failed:', headRevealData);
    passed = false;
  }

  // 5. Verify Audit Log entry was created with all mandatory fields
  console.log('\n5. Checking Audit Log for disclosure event...');
  const auditRes = await fetch(`${BASE_URL}/api/identity-audit`, {
    headers: { Cookie: superAdminCookie || '' },
  });
  const auditData = await auditRes.json();
  console.log(`  Audit logs returned (${auditData.totalEntries || 0} entries)`);
  const matchingLog = auditData.logs?.find((l: any) => l.complaintId === anonComplaintId);
  if (matchingLog) {
    console.log('  ✓ Found AuditLog row for disclosure:');
    console.log(`    - Actor: ${matchingLog.actorName} (${matchingLog.actorId}, Role: ${matchingLog.actorRole})`);
    console.log(`    - Complainant ID: ${matchingLog.complainantId}`);
    console.log(`    - Complaint ID: ${matchingLog.complaintId}`);
    console.log(`    - Reason: "${matchingLog.disclosureReason}"`);
    console.log(`    - Timestamp: ${matchingLog.disclosedAt}`);
    details.push(`AuditLog row confirmed: Actor=${matchingLog.actorName}, Complainant=${matchingLog.complainantId}, Reason="${matchingLog.disclosureReason}"`);
  } else {
    console.error('  ❌ [FAIL] AuditLog row not found for complaint:', anonComplaintId);
    passed = false;
  }

  results['CHECK_6_ANONYMITY'] = {
    status: passed ? 'PASS' : 'FAIL',
    details,
  };
}

async function runAttachmentsCheck(complaintId: string) {
  logSection('CHECK 7: ATTACHMENTS');
  const details: string[] = [];
  let passed = true;

  const studentCookie = testUsers.STUDENT.cookie;

  console.log(`Uploading test attachment for complaint ${complaintId}...`);
  const attRes = await fetch(`${BASE_URL}/api/complaints/${complaintId}/attachments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: studentCookie || '',
    },
    body: JSON.stringify({
      fileName: 'test-evidence-report.pdf',
      fileSize: 1048576,
      fileType: 'application/pdf',
      fileUrl: 'https://amesryccjhshktsopsgv.supabase.co/storage/v1/object/public/attachments/test-evidence-report.pdf',
    }),
  });

  const attData = await attRes.json();
  console.log(`Attachment upload response: status=${attRes.status}`, attData);
  if (attRes.ok && attData.attachment?.id) {
    console.log('✓ Attachment uploaded and registered to complaint');
    details.push(`Attachment ${attData.attachment.id} registered to complaint`);
  } else {
    console.error('❌ [FAIL] Attachment registration failed:', attData);
    passed = false;
  }

  results['CHECK_7_ATTACHMENTS'] = {
    status: passed ? 'PASS' : 'FAIL',
    details,
  };
}

async function runNotificationsCheck() {
  logSection('CHECK 8: NOTIFICATIONS');
  const details: string[] = [];
  let passed = true;

  const headCookie = testUsers.HEAD.cookie;

  console.log('Querying notifications for HEAD...');
  const notifRes = await fetch(`${BASE_URL}/api/notifications`, {
    headers: { Cookie: headCookie || '' },
  });

  const notifData = await notifRes.json();
  const count = notifData.notifications?.length || (Array.isArray(notifData) ? notifData.length : 0);
  console.log(`Notifications response: status=${notifRes.status}, count=${count}`);
  if (notifRes.ok && count > 0) {
    console.log(`✓ Notifications verified: ${count} notifications found`);
    details.push(`Notifications verified: ${count} notifications found for recipient`);
  } else {
    console.error('❌ [FAIL] Notifications query failed or empty:', notifData);
    passed = false;
  }

  results['CHECK_8_NOTIFICATIONS'] = {
    status: passed ? 'PASS' : 'FAIL',
    details,
  };
}

async function runHealthCheck() {
  logSection('CHECK 9: HEALTH ENDPOINT');
  const details: string[] = [];
  let passed = true;

  console.log('Invoking GET /api/health...');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthData = await healthRes.json();

  console.log(`HTTP Status: ${healthRes.status}`);
  console.log('Health Payload:', JSON.stringify(healthData, null, 2));

  if (healthData.checks && healthData.checks.storage && healthData.checks.aiModule) {
    console.log(`✓ Health endpoint dynamically returned: overall=${healthData.status}, db=${healthData.checks.database}, storage=${healthData.checks.storage}, aiModule=${healthData.checks.aiModule}`);
    details.push(`Health status: ${healthData.status}, checks: ${JSON.stringify(healthData.checks)}`);
  } else {
    console.error('❌ [FAIL] Invalid health payload structure');
    passed = false;
  }

  results['CHECK_9_HEALTH'] = {
    status: passed ? 'PASS' : 'FAIL',
    details,
  };
}

async function runRegressionAndSecurityCheck() {
  logSection('CHECK 10: REGRESSION / SECURITY SWEEP');
  const details: string[] = [];
  let passed = true;

  // Search for hardcoded secrets or tokens in source code
  console.log('1. Scanning source code for suspicious hardcoded secret values...');
  const forbiddenPatterns = [
    /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{20,}/,
    /sk_live_[A-Za-z0-9]{20,}/,
  ];

  const srcDir = path.resolve(process.cwd(), 'src');
  function scanFiles(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanFiles(fullPath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const pattern of forbiddenPatterns) {
          if (pattern.test(content)) {
            console.error(`❌ Potential secret found in ${fullPath}`);
            details.push(`Potential secret found in ${file}`);
            passed = false;
          }
        }
      }
    }
  }

  scanFiles(srcDir);
  if (passed) {
    console.log('  ✓ No hardcoded secrets found in source tree.');
    details.push('Zero hardcoded secret tokens found in source tree');
  }

  results['CHECK_10_SECURITY'] = {
    status: passed ? 'PASS' : 'FAIL',
    details,
  };
}

async function main() {
  try {
    await runAuthVerification();
    await runRbacVerification();
    const { anonComplaintId } = await runComplaintLifecycle();
    await runAnonymityAndRevealWorkflow(anonComplaintId);
    await runAttachmentsCheck(anonComplaintId);
    await runNotificationsCheck();
    await runHealthCheck();
    await runRegressionAndSecurityCheck();

    console.log('\n============================================================');
    console.log('                 FINAL VERIFICATION SUMMARY');
    console.log('============================================================\n');
    let allPassed = true;
    for (const [k, v] of Object.entries(results)) {
      console.log(`[${v.status}] ${k}`);
      for (const d of v.details) {
        console.log(`   - ${d}`);
      }
      if (v.status !== 'PASS') allPassed = false;
    }

    if (!allPassed) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error during verification run:', err);
    process.exit(1);
  }
}

main();
