import {
  hashPassword,
  comparePassword,
  createSessionToken,
  verifySessionToken,
  isAccountLocked,
  recordFailedAttempt,
  resetFailedAttempts,
  generateRandomToken,
} from '../src/lib/auth/security';
import {
  findUserByEmail,
  registerUser,
  savePasswordResetToken,
  getPasswordResetToken,
  updateUserPassword,
  invalidateResetToken,
  getAllUsers,
} from '../src/lib/auth/user-store';
import { hasPermission, canAccessRoute } from '../src/lib/auth/permissions';
import { AuthSession } from '../src/lib/types';

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

async function runTests() {
  console.log('\n==================================================');
  console.log('  RSCOE Grievance Portal - Auth & RBAC Security Suite');
  console.log('==================================================\n');

  // TEST SUITE 1: Password Hashing Security
  console.log('--- TEST GROUP 1: Secure Password Hashing (bcrypt) ---');
  const password = 'SecurePassword@2026';
  const hashed = await hashPassword(password);
  assert(hashed !== password && hashed.startsWith('$2'), 'Password hashed with bcrypt salt');
  assert(await comparePassword(password, hashed), 'Correct password verifies successfully');
  assert(!(await comparePassword('WrongPassword', hashed)), 'Incorrect password rejected');

  // TEST SUITE 2: User Pre-seeding & Roles
  console.log('\n--- TEST GROUP 2: Pre-seeded Accounts for 4 Roles ---');
  const student = findUserByEmail('ganesh.patil.comp@jspm.edu.in');
  const teacher = findUserByEmail('anil.kadam.comp@jspm.org');
  const head = findUserByEmail('hod.computer@jspm.edu.in');
  const superAdmin = findUserByEmail('principal@jspm.edu.in'); 

  assert(student?.role === 'STUDENT', 'STUDENT account seeded correctly');
  assert(teacher?.role === 'TEACHER', 'TEACHER account seeded correctly');
  assert(head?.role === 'HEAD', 'HEAD (HOD) account seeded correctly');
  assert(superAdmin?.role === 'SUPER_ADMIN', 'SUPER_ADMIN account seeded correctly');

  assert(await comparePassword('Password@123', student!.passwordHash), 'STUDENT password hash verifies');
  assert(await comparePassword('Password@123', superAdmin!.passwordHash), 'SUPER_ADMIN password hash verifies');

  // TEST SUITE 3: Student Registration Flow
  console.log('\n--- TEST GROUP 3: Student Registration & Validation ---');
  const testEmail = `newstudent_${Date.now()}@jspm.edu.in`;
  const regUser = registerUser({
    name: 'New Student User',
    email: testEmail,
    role: 'STUDENT',                                                                                                                     
    department: 'Information Technology',
    passwordHash: await hashPassword('StudentPass@123'),
  });
  assert(regUser.id.startsWith('usr-'), 'New user assigned unique ID');
  assert(findUserByEmail(testEmail) !== undefined, 'New user retrieved from store');

  // TEST SUITE 4: Role-Based Access Control (RBAC) & Permissions
  console.log('\n--- TEST GROUP 4: Server-Side RBAC & Permissions ---');
  assert(hasPermission('STUDENT', 'complaint:create'), 'STUDENT has complaint:create permission');
  assert(!hasPermission('STUDENT', 'users:manage'), 'STUDENT does NOT have user s:manage permission');
  assert(!hasPermission('TEACHER', 'users:manage'), 'TEACHER does NOT have users:manage permission');
  assert(hasPermission('HEAD', 'users:manage'), 'HEAD has users:manage permission');
  assert(hasPermission('SUPER_ADMIN', 'system:override'), 'SUPER_ADMIN has system:override permission');

  // Route Access Checks
  assert(canAccessRoute('STUDENT', '/student/dashboard'), 'STUDENT allowed on /student/dashboard');
  assert(!canAccessRoute('STUDENT', '/admin/dashboard'), 'STUDENT blocked from /admin/dashboard');
  assert(!canAccessRoute('STUDENT', '/super-admin/settings'), 'STUDENT blocked from /super-admin');
  assert(!canAccessRoute('TEACHER', '/admin/dashboard'), 'TEACHER blocked from /admin/dashboard');
  assert(canAccessRoute('HEAD', '/admin/dashboard'), 'HEAD allowed on /admin/dashboard');
  assert(!canAccessRoute('HEAD', '/super-admin/settings'), 'HEAD blocked from /super-admin');
  assert(canAccessRoute('SUPER_ADMIN', '/admin/dashboard'), 'SUPER_ADMIN allowed everywhere');
  assert(canAccessRoute('SUPER_ADMIN', '/super-admin/settings'), 'SUPER_ADMIN allowed on /super-admin');

  // TEST SUITE 5: Role Escalation Prevention (Simulated Request Enforcement)
  console.log('\n--- TEST GROUP 5: Role Escalation & Unauthorized Access ---');
  const studentSession: AuthSession = {
    userId: student!.id,
    email: student!.email,
    role: 'STUDENT',
    name: student!.name,
    department: student!.department,
  };
  const studentToken = createSessionToken(studentSession);
  const verifiedSession = verifySessionToken(studentToken);

  assert(verifiedSession !== null && verifiedSession.role === 'STUDENT', 'Valid JWT token verified server-side');
  assert(!hasPermission(verifiedSession!.role, 'users:manage'), 'Role Escalation Attempt: STUDENT blocked from users:manage');

  const invalidToken = 'invalid.jwt.token.signature';
  assert(verifySessionToken(invalidToken) === null, 'Unauthorized Access: Invalid token rejected with null session');

  // TEST SUITE 6: Account Lockout Policy
  console.log('\n--- TEST GROUP 6: Account Lockout & Rate Limiting Policy ---');
  const targetEmail = `locktest_${Date.now()}@jspm.edu.in`;
  resetFailedAttempts(targetEmail);

  for (let i = 1; i <= 4; i++) {
    const res = recordFailedAttempt(targetEmail);
    assert(!res.isLocked && res.attemptsLeft === 5 - i, `Failed attempt ${i} recorded properly (${res.attemptsLeft} left)`);
  }

  const fifthAttempt = recordFailedAttempt(targetEmail);
  assert(fifthAttempt.isLocked && fifthAttempt.attemptsLeft === 0, '5th failed attempt locks account');

  const lockCheck = isAccountLocked(targetEmail);
  assert(lockCheck.isLocked && (lockCheck.remainingSeconds || 0) > 0, 'Account isLocked check returns true with remaining lock duration');

  resetFailedAttempts(targetEmail);
  assert(!isAccountLocked(targetEmail).isLocked, 'Successful login resets lockout status');

  // TEST SUITE 7: Password Reset Architecture
  console.log('\n--- TEST GROUP 7: Password Reset Architecture ---');
  const resetEmail = student!.email;
  const resetTokenStr = generateRandomToken();
  const resetTokenObj = savePasswordResetToken(resetEmail, resetTokenStr, 15);

  assert(resetTokenObj.token === resetTokenStr, 'Password reset token generated and saved');
  const retrievedToken = getPasswordResetToken(resetTokenStr);
  assert(retrievedToken !== undefined && retrievedToken.email === resetEmail, 'Reset token verified before expiration');

  const newPassHash = await hashPassword('NewPassword@2026');
  updateUserPassword(resetEmail, newPassHash);
  invalidateResetToken(resetTokenStr);

  assert(getPasswordResetToken(resetTokenStr) === undefined, 'Reset token invalidated after use');
  const updatedUser = findUserByEmail(resetEmail);
  assert(await comparePassword('NewPassword@2026', updatedUser!.passwordHash), 'User password successfully updated');

  // Restore original password for clean state
  updateUserPassword(resetEmail, await hashPassword('Password@123'));

  console.log('\n==================================================');
  console.log(`  TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed with error:', err);
  process.exit(1);
});
