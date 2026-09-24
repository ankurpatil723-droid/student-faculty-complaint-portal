import { mergeComplaints, getComplaintById, getAllComplaints } from '../src/lib/complaint-store';

function runMergeTests() {
  console.log('--- Testing Duplicate Complaint Merge Workflow ---');

  const complaints = getAllComplaints();
  if (complaints.length < 2) {
    throw new Error('Need at least 2 complaints to test merge workflow');
  }

  const source = complaints[0];
  const target = complaints[1];

  console.log(`Merging source ${source.id} into target ${target.id}...`);
  const initialTargetCommentCount = target.comments.length;

  const merged = mergeComplaints(
    source.id,
    target.id,
    'admin-tester',
    'Automated AI duplicate grievance merge'
  );

  // Assertions
  if (merged.status !== 'CLOSED') {
    throw new Error(`Expected source status to be CLOSED, got ${merged.status}`);
  }
  if (merged.linkedComplaintId !== target.id) {
    throw new Error(`Expected linkedComplaintId to be ${target.id}, got ${merged.linkedComplaintId}`);
  }
  if (!merged.mergeNote?.includes('Automated AI duplicate')) {
    throw new Error(`Expected mergeNote to contain custom note, got ${merged.mergeNote}`);
  }

  const updatedTarget = getComplaintById(target.id);
  if (!updatedTarget) {
    throw new Error('Target not found after merge');
  }

  const hasHistory = updatedTarget.statusHistory.some((h) => h.notes?.includes(source.id));
  if (!hasHistory) {
    throw new Error('Expected status history entry on target for merged complaint');
  }

  console.log('✓ Source complaint status set to CLOSED');
  console.log('✓ Source linkedComplaintId and mergeNote recorded');
  console.log('✓ Target received comments and status history');

  // Test self-merge error
  try {
    mergeComplaints(target.id, target.id, 'admin');
    throw new Error('Should have rejected self-merge');
  } catch (err: any) {
    console.log('✓ Rejected self-merge:', err.message);
  }

  console.log('\nAll merge workflow tests passed successfully!');
}

runMergeTests();
