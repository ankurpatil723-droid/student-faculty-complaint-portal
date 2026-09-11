/**
 * run-identity-tests.ts
 * Runner for identity protection test suite.
 * Usage: npx ts-node --project tsconfig.json scripts/run-identity-tests.ts
 */

// Simply require the test file — it runs all tests on import and exits with code 1 on failure
require('../src/tests/identity-protection.test');
