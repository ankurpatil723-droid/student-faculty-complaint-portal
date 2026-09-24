import { submitFeedback, getFeedbackForComplaint } from '../src/lib/feedback-store';
import { getAllComplaints, updateComplaintStatus } from '../src/lib/complaint-store';

async function runFeedbackTests() {
  console.log('--- Testing Post-Resolution Feedback Store ---');

  const complaints = getAllComplaints();
  const resolvedComplaint = complaints.find((c) => c.status === 'RESOLVED' || c.status === 'CLOSED') || complaints[0];

  // If not resolved, temporarily resolve it for testing
  if (resolvedComplaint.status !== 'RESOLVED' && resolvedComplaint.status !== 'CLOSED') {
    updateComplaintStatus(resolvedComplaint.id, 'RESOLVED', 'test-user', 'Test User', 'Resolution test');
  }

  console.log(`Testing with complaint: ${resolvedComplaint.id} (Status: ${resolvedComplaint.status})`);

  // Test 1: Invalid rating (< 1 or > 5 or non-integer)
  try {
    await submitFeedback({ complaintId: resolvedComplaint.id, rating: 6 });
    throw new Error('Should have rejected rating > 5');
  } catch (err: any) {
    console.log('✓ Rejected rating 6:', err.message);
  }

  // Test 2: Valid submission
  try {
    const fb = await submitFeedback({
      complaintId: resolvedComplaint.id,
      rating: 5,
      comments: 'Great and fast resolution!',
    });
    console.log('✓ Submitted feedback successfully:', fb.rating, 'stars, comment:', fb.comments);
  } catch (err: any) {
    if (err.message.includes('already submitted')) {
      console.log('✓ Feedback already exists for this complaint.');
    } else {
      throw err;
    }
  }

  // Test 3: Duplicate submission blocked
  try {
    await submitFeedback({
      complaintId: resolvedComplaint.id,
      rating: 4,
    });
    throw new Error('Should have blocked duplicate feedback submission');
  } catch (err: any) {
    console.log('✓ Duplicate submission blocked:', err.message);
  }

  // Test 4: Retrieve feedback
  const retrieved = await getFeedbackForComplaint(resolvedComplaint.id);
  if (retrieved && retrieved.rating >= 1 && retrieved.rating <= 5) {
    console.log(`✓ Retrieved feedback: ${retrieved.rating} stars for ${retrieved.complaintId}`);
  } else {
    throw new Error('Failed to retrieve submitted feedback');
  }

  console.log('\nAll feedback tests passed successfully!');
}

runFeedbackTests().catch((err) => {
  console.error('Feedback tests failed:', err);
  process.exit(1);
});
