import {
  getComplaintSlaInfo,
  checkAndEscalateOverdueComplaints,
  PRIORITY_SLA_DAYS,
  updateComplaintStatus,
} from '../src/lib/complaint-store';
import type { Complaint } from '../src/lib/types';

function runSlaTests() {
  console.log('--- Testing SLA Escalation Timer Logic ---');

  // Test 1: SLA Target Days per Priority
  console.log('Test 1: Verify SLA targets per priority');
  if (
    PRIORITY_SLA_DAYS.URGENT === 1 &&
    PRIORITY_SLA_DAYS.HIGH === 3 &&
    PRIORITY_SLA_DAYS.MEDIUM === 5 &&
    PRIORITY_SLA_DAYS.LOW === 7
  ) {
    console.log('✓ Priority SLA targets configured correctly.');
  } else {
    throw new Error('Priority SLA targets mismatch');
  }

  // Test 2: Calculate SLA for fresh complaint
  console.log('Test 2: Calculate SLA info for fresh complaint');
  const freshComplaint: Partial<Complaint> = {
    id: 'COMP-TEST-1',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    createdAt: new Date().toISOString(),
  };

  const freshSla = getComplaintSlaInfo(freshComplaint as Complaint);
  if (!freshSla.isBreached && freshSla.remainingHours > 70 && freshSla.slaTargetDays === 3) {
    console.log(`✓ Fresh complaint within SLA: ${freshSla.remainingHours}h remaining.`);
  } else {
    throw new Error(`Fresh SLA calculation failed: ${JSON.stringify(freshSla)}`);
  }

  // Test 3: Calculate SLA for overdue complaint
  console.log('Test 3: Calculate SLA info for overdue complaint (4 days old on HIGH priority - 3d SLA)');
  const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
  const overdueComplaint: Partial<Complaint> = {
    id: 'COMP-TEST-2',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    createdAt: fourDaysAgo,
  };

  const overdueSla = getComplaintSlaInfo(overdueComplaint as Complaint);
  if (overdueSla.isBreached && overdueSla.remainingHours < 0) {
    console.log(`✓ Overdue complaint flagged breached: remainingHours = ${overdueSla.remainingHours}h.`);
  } else {
    throw new Error(`Overdue SLA calculation failed: ${JSON.stringify(overdueSla)}`);
  }

  console.log('\nAll SLA unit tests passed successfully!');
}

runSlaTests();
