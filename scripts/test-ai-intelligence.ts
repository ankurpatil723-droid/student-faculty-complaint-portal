import { analyzeComplaintIntelligence } from '../src/lib/ai-intelligence-service';
import { getAllComplaints, createComplaint } from '../src/lib/complaint-store';

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

async function runAITests() {
  console.log('\n==================================================');
  console.log('  Testing AI-Assisted Complaint Intelligence Module');
  console.log('==================================================\n');

  const existingComplaints = getAllComplaints();

  // Test 1: Analysis on Infrastructure & AC Leakage Complaint
  console.log('--- Test Suite 1: Infrastructure & Hazard AI Analysis ---');
  const infraTitle = 'Lab 3 Air Conditioning Unit Leaking Water profusely';
  const infraDesc = 'The AC unit in Laboratory 3 is leaking water onto electrical wires and causing slip hazard for students during practical sessions.';
  const ai1 = analyzeComplaintIntelligence(infraTitle, infraDesc, existingComplaints);

  assert(ai1.suggestedCategory === 'Infrastructure', '1. Feature 1: Category suggested as Infrastructure');
  assert(ai1.suggestedPriority === 'HIGH' || ai1.suggestedPriority === 'URGENT', '2. Feature 2: Priority suggested as HIGH/URGENT');
  assert(ai1.suggestedDepartment.includes('Infrastructure') || ai1.suggestedDepartment.includes('Computer'), '3. Feature 3: Department suggestion provided');
  assert(ai1.summary.includes('Air Conditioning') || ai1.summary.includes('Lab 3'), '4. Feature 4: Executive summary generated');
  assert(ai1.sentimentSignal.urgencyLevel === 'HIGH' || ai1.sentimentSignal.urgencyLevel === 'CRITICAL', '5. Feature 6: Sentiment & Urgency signal detected');
  assert(ai1.suggestedResponse.length > 20, '6. Feature 7: Contextual suggested response generated');
  assert(ai1.suggestedResolutionAction.actionType.length > 0, '7. Feature 8: Suggested resolution action plan provided');

  // Test 2: Duplicate Detection Test
  console.log('\n--- Test Suite 2: Duplicate Complaint Detection ---');
  const dupTitle = 'Lab 5 Projector VGA Cable Broken';
  const dupDesc = 'The projector in Laboratory 5 has a broken VGA connector so we cannot display teaching slides.';
  const ai2 = analyzeComplaintIntelligence(dupTitle, dupDesc, existingComplaints);

  assert(ai2.duplicateMatches.length > 0, '8. Feature 5: Duplicate complaint match detected against COMP-104');
  assert(ai2.duplicateMatches[0].complaintId === 'COMP-104', '9. Duplicate match correctly identifies COMP-104');
  assert(ai2.duplicateMatches[0].similarityScore >= 35, '10. Similarity score is accurately calculated');

  // Test 3: Metadata & Confidence Scores Storage
  console.log('\n--- Test Suite 3: Metadata & Confidence Storage ---');
  assert(ai2.metadata.model === 'RSCOE-Grievance-AI-v1.4', '11. Model metadata stores model ID');
  assert(ai2.metadata.version === '1.4.0', '12. Model metadata stores version');
  assert(typeof ai2.metadata.timestamp === 'string', '13. Timestamp is stored');
  assert(typeof ai2.confidence.overallConfidence === 'number', '14. Confidence scores stored');

  // Test 4: Creation in Store with AI Intelligence
  console.log('\n--- Test Suite 4: Store Integration & Human Safeguards ---');
  const newComp = createComplaint({
    title: 'Discrepancy in DSA Mid-Sem Marks Sheet',
    description: 'My DSA mid-sem marks show 12/25 but answer paper shows 18/25. Request re-evaluation.',
    category: 'Academics',
    priority: 'HIGH',
    isAnonymous: false,
    complainantId: 'usr-001',
    complainantName: 'Ganesh Patil',
    complainantRole: 'STUDENT',
    department: 'Computer Engineering',
  });

  assert(newComp.aiIntelligence !== undefined, '15. Complaint created in store includes aiIntelligence');
  assert(newComp.status === 'SUBMITTED', '16. Human Safeguard: Initial complaint status is SUBMITTED (AI alone does NOT close or alter status)');

  console.log('\n==================================================');
  console.log(`  AI MODULE TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('==================================================\n');

  if (failed > 0) process.exit(1);
}

runAITests().catch((err) => {
  console.error('AI Test error:', err);
  process.exit(1);
});
