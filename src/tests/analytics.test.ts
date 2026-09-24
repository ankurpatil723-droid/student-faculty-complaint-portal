/**
 * analytics.test.ts
 *
 * Automated test suite for the Head/Admin Analytics Engine.
 * Tests:
 *  1. Query-based total and status metrics calculation.
 *  2. Filter precision (Date, Department, Category, Priority).
 *  3. Average resolution time calculation.
 *  4. Aging complaints threshold identification (>7 days).
 *  5. SLA compliance percentage calculation.
 *  6. CSV export formatting.
 */

import * as assert from 'assert';
import { calculateAnalytics, filterComplaints, exportAnalyticsCSV } from '../lib/analytics-service';
import { getAllComplaints } from '../lib/complaint-store';

let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅  ${name}`);
    passCount++;
  } catch (err: any) {
    console.error(`  ❌  ${name}`);
    console.error(`       → ${err.message}`);
    failCount++;
  }
}

console.log('\n📊 Analytics Engine Test Suite\n');

// Test 1: Calculate analytics over full dataset
test('Calculates overall complaint metrics from dataset', () => {
  const summary = calculateAnalytics();
  const all = getAllComplaints();

  assert.strictEqual(summary.total, all.length, 'Total complaints count should match store total');
  assert.ok(typeof summary.pending === 'number', 'Pending count should be a number');
  assert.ok(typeof summary.inProgress === 'number', 'In progress count should be a number');
  assert.ok(typeof summary.resolved === 'number', 'Resolved count should be a number');
  assert.ok(typeof summary.escalated === 'number', 'Escalated count should be a number');
});

// Test 2: Department Filter
test('Filters analytics by department accurately', () => {
  const dept = 'Computer Engineering';
  const summary = calculateAnalytics({ department: dept });
  const rawFiltered = filterComplaints(getAllComplaints(), { department: dept });

  assert.strictEqual(summary.total, rawFiltered.length, 'Filtered count should match department match count');
  for (const c of rawFiltered) {
    assert.strictEqual(c.department.toLowerCase(), dept.toLowerCase(), 'All filtered complaints should match department');
  }
});

// Test 3: Category Filter
test('Filters analytics by category accurately', () => {
  const category = 'Academics';
  const summary = calculateAnalytics({ category });

  assert.ok(summary.total >= 0, 'Category filter should produce valid count');
  const nonAcademicInBreakdown = Object.keys(summary.byCategory).filter((c) => c !== category);
  assert.strictEqual(nonAcademicInBreakdown.length, 0, 'Category breakdown should contain only the filtered category');
});

// Test 4: Priority Filter
test('Filters analytics by priority accurately', () => {
  const priority = 'HIGH';
  const summary = calculateAnalytics({ priority });

  const nonHighInBreakdown = Object.keys(summary.byPriority).filter((p) => p !== priority);
  assert.strictEqual(nonHighInBreakdown.length, 0, 'Priority breakdown should contain only HIGH priority');
});

// Test 5: Average Resolution Time & SLA Metrics
test('Computes average resolution time and SLA health rate', () => {
  const summary = calculateAnalytics();

  assert.ok(summary.avgResolutionTimeHours >= 0, 'Avg resolution time in hours should be non-negative');
  assert.ok(summary.avgResolutionTimeDays >= 0, 'Avg resolution time in days should be non-negative');
  assert.ok(summary.resolutionPerformance.targetSlaDays === 7, 'Target SLA should default to 7 days');
  assert.ok(
    summary.resolutionPerformance.slaComplianceRate >= 0 && summary.resolutionPerformance.slaComplianceRate <= 100,
    'SLA compliance rate should be a percentage between 0 and 100'
  );
});

// Test 6: Aging Complaints Threshold
test('Identifies aging complaints open >= 7 days', () => {
  const summary = calculateAnalytics();

  for (const aging of summary.agingComplaints) {
    assert.ok(aging.daysOpen >= 7, 'Aging complaint days open must be >= 7');
    assert.ok(!['RESOLVED', 'CLOSED', 'REJECTED'].includes(aging.status), 'Aging complaint must be unresolved');
  }
});

// Test 7: CSV Export Formatting
test('Generates valid CSV report headers and content', () => {
  const csv = exportAnalyticsCSV();
  const lines = csv.split('\n');

  assert.ok(lines.length >= 1, 'CSV output should contain header line');
  assert.ok(lines[0].includes('Complaint ID'), 'CSV header should contain Complaint ID');
  assert.ok(lines[0].includes('Category'), 'CSV header should contain Category');
  assert.ok(lines[0].includes('Department'), 'CSV header should contain Department');
});

// Test 8: Feedback and Resolution Quality Metrics
test('Includes avgResolutionRating and feedbackResponseRate fields', () => {
  const summary = calculateAnalytics();

  assert.ok(
    summary.avgResolutionRating === null || (summary.avgResolutionRating >= 1 && summary.avgResolutionRating <= 5),
    'Avg resolution rating should be null or between 1 and 5'
  );
  assert.ok(
    typeof summary.feedbackResponseRate === 'number' &&
      summary.feedbackResponseRate >= 0 &&
      summary.feedbackResponseRate <= 100,
    'Feedback response rate should be a percentage between 0 and 100'
  );
});

console.log(`\n─────────────────────────────────────────`);
console.log(`  Results: ${passCount} passed, ${failCount} failed`);
console.log(`─────────────────────────────────────────\n`);

if (failCount > 0) {
  process.exit(1);
}
