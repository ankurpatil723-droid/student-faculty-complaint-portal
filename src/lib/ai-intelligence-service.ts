import type {
  CategoryType,
  Priority,
  Complaint,
  AIIntelligenceData,
  AIIntelligenceMetadata,
  DuplicateMatch,
  SentimentSignal,
  SuggestedResolutionAction,
} from './types';

const AI_MODEL_NAME = 'RSCOE-Grievance-AI-v1.4';
const AI_MODEL_VERSION = '1.4.0';

/**
 * Calculates string word similarity percentage (0 - 100) between two texts
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(
    text1.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter((w) => w.length > 2)
  );
  const words2 = new Set(
    text2.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter((w) => w.length > 2)
  );

  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  words1.forEach((w) => {
    if (words2.has(w)) intersection++;
  });

  const smaller = Math.min(words1.size, words2.size);
  return Math.round((intersection / smaller) * 100);
}

/**
 * AI Intelligence Module - Analyzes grievance title, description and historical complaints store
 */
export function analyzeComplaintIntelligence(
  title: string,
  description: string,
  existingComplaints: Complaint[] = []
): AIIntelligenceData {
  const startTime = Date.now();
  const textContent = `${title} ${description}`.toLowerCase();

  // 1. Category & Subcategory Analysis
  let suggestedCategory: CategoryType = 'Infrastructure';
  let suggestedSubcategory = 'General';
  let categoryConfidence = 0.85;

  if (
    textContent.includes('ragging') ||
    textContent.includes('harass') ||
    textContent.includes('threat') ||
    textContent.includes('bias') ||
    textContent.includes('safeti')
  ) {
    suggestedCategory = 'Anti-Ragging & Harassment';
    suggestedSubcategory = textContent.includes('ragging') ? 'Ragging' : 'Harassment';
    categoryConfidence = 0.96;
  } else if (
    textContent.includes('projector') ||
    textContent.includes('ac') ||
    textContent.includes('air conditioning') ||
    textContent.includes('vga') ||
    textContent.includes('bench') ||
    textContent.includes('whiteboard') ||
    textContent.includes('lab') ||
    textContent.includes('room') ||
    textContent.includes('water cooler') ||
    textContent.includes('filter') ||
    textContent.includes('electrical') ||
    textContent.includes('infrastructure')
  ) {
    suggestedCategory = 'Infrastructure';
    suggestedSubcategory = textContent.includes('lab') ? 'Laboratories' : 'Classrooms';
    categoryConfidence = 0.92;
  } else if (
    textContent.includes('mark') ||
    textContent.includes('exam') ||
    textContent.includes('dsa') ||
    textContent.includes('evaluat') ||
    textContent.includes('teacher') ||
    textContent.includes('syllabus') ||
    textContent.includes('lecture')
  ) {
    suggestedCategory = 'Academics';
    suggestedSubcategory = textContent.includes('mark') ? 'Marks/Results' : 'Examinations';
    categoryConfidence = 0.93;
  } else if (
    textContent.includes('fee') ||
    textContent.includes('scholarship') ||
    textContent.includes('refund') ||
    textContent.includes('receipt') ||
    textContent.includes('payment')
  ) {
    suggestedCategory = 'Finance & Fees';
    suggestedSubcategory = textContent.includes('scholarship') ? 'Scholarship' : 'Fee Payment';
    categoryConfidence = 0.95;
  } else if (
    textContent.includes('canteen') ||
    textContent.includes('food') ||
    textContent.includes('mess') ||
    textContent.includes('hostel cleanliness')
  ) {
    suggestedCategory = 'Hostel & Canteen';
    suggestedSubcategory = textContent.includes('food') ? 'Food Quality' : 'Maintenance';
    categoryConfidence = 0.91;
  }

  // 2. Priority Suggestion
  let suggestedPriority: Priority = 'MEDIUM';
  let priorityConfidence = 0.88;

  if (
    textContent.includes('leak') ||
    textContent.includes('hazard') ||
    textContent.includes('urgent') ||
    textContent.includes('immediate') ||
    textContent.includes('ragging') ||
    textContent.includes('stomach') ||
    textContent.includes('electrical') ||
    textContent.includes('harass')
  ) {
    suggestedPriority = textContent.includes('ragging') || textContent.includes('electrical') ? 'URGENT' : 'HIGH';
    priorityConfidence = 0.94;
  } else if (textContent.includes('broken') || textContent.includes('deadline') || textContent.includes('discrepancy')) {
    suggestedPriority = 'HIGH';
    priorityConfidence = 0.90;
  } else if (textContent.includes('tastes bad') || textContent.includes('whiteboard') || textContent.includes('minor')) {
    suggestedPriority = 'LOW';
    priorityConfidence = 0.85;
  }

  // 3. Department Routing Suggestion
  let suggestedDepartment = 'Computer Engineering';
  let departmentConfidence = 0.87;

  if (suggestedCategory === 'Finance & Fees') {
    suggestedDepartment = 'Finance Office';
    departmentConfidence = 0.94;
  } else if (suggestedCategory === 'Anti-Ragging & Harassment') {
    suggestedDepartment = 'Anti-Ragging & Safety Cell';
    departmentConfidence = 0.96;
  } else if (suggestedCategory === 'Infrastructure' || suggestedCategory === 'Hostel & Canteen') {
    suggestedDepartment = 'Campus Infrastructure & Maintenance';
    departmentConfidence = 0.91;
  } else if (textContent.includes('it') || textContent.includes('information technology')) {
    suggestedDepartment = 'Information Technology';
    departmentConfidence = 0.93;
  }

  // 4. Summarization
  const cleanTitle = title.trim();
  const summary = `Grievance regarding "${cleanTitle}". ${description.length > 120 ? description.slice(0, 120) + '…' : description}`;

  // 5. Duplicate Complaint Detection
  const duplicateMatches: DuplicateMatch[] = [];
  for (const c of existingComplaints) {
    const similarityScore = calculateTextSimilarity(`${title} ${description}`, `${c.title} ${c.description}`);
    if (similarityScore >= 35) {
      duplicateMatches.push({
        complaintId: c.id,
        title: c.title,
        similarityScore,
        status: c.status,
        category: c.category,
      });
    }
  }
  duplicateMatches.sort((a, b) => b.similarityScore - a.similarityScore);

  // 6. Sentiment & Urgency Signals
  const riskFlags: string[] = [];
  const detectedEmotions: string[] = [];

  if (textContent.includes('leak') || textContent.includes('electrical') || textContent.includes('slip hazard')) {
    riskFlags.push('Infrastructure & Safety Hazard');
  }
  if (textContent.includes('deadline') || textContent.includes('approaching')) {
    riskFlags.push('SLA Breach Risk');
  }
  if (textContent.includes('bias') || textContent.includes('unfair') || textContent.includes('evaluat')) {
    riskFlags.push('Academic Compliance Audit');
  }
  if (textContent.includes('ragging') || textContent.includes('harass')) {
    riskFlags.push('Strict Confidentiality Safeguard');
  }

  let urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
  let sentimentScore = -0.3; // Default mildly concerned

  if (suggestedPriority === 'URGENT' || riskFlags.length >= 2) {
    urgencyLevel = 'CRITICAL';
    sentimentScore = -0.8;
    detectedEmotions.push('high_concern', 'urgent_call_to_action');
  } else if (suggestedPriority === 'HIGH') {
    urgencyLevel = 'HIGH';
    sentimentScore = -0.6;
    detectedEmotions.push('frustrated', 'seeking_resolution');
  } else {
    urgencyLevel = suggestedPriority === 'LOW' ? 'LOW' : 'MEDIUM';
    sentimentScore = -0.2;
    detectedEmotions.push('observational', 'inquisitive');
  }

  const sentimentSignal: SentimentSignal = {
    urgencyLevel,
    sentimentScore,
    detectedEmotions,
    riskFlags: riskFlags.length > 0 ? riskFlags : ['Standard Handling'],
  };

  // 7. Suggested Response for HOD / Case Officer
  let suggestedResponse = `Acknowledge receiving grievance "${title}". Inspection will be scheduled with ${suggestedDepartment} within 48 hours.`;

  if (suggestedCategory === 'Academics') {
    suggestedResponse = `Acknowledged. The academic committee will review the student marksheet and DSA answer sheet under supervision of the department head.`;
  } else if (suggestedCategory === 'Infrastructure') {
    suggestedResponse = `Acknowledged. Maintenance team has been notified regarding the equipment issue. Replacement or repair will be completed within 3 working days.`;
  } else if (suggestedCategory === 'Anti-Ragging & Harassment') {
    suggestedResponse = `Urgent confidential review initiated. The Anti-Ragging Cell has logged this case. Identity protection measures are fully active.`;
  }

  // 8. Suggested Resolution Action Plan
  const suggestedResolutionAction: SuggestedResolutionAction = {
    actionType: suggestedCategory === 'Infrastructure' ? 'DISPATCH_MAINTENANCE' : 'SCHEDULE_INVESTIGATION',
    description: `Assign case officer from ${suggestedDepartment} to verify claims and implement corrective measures within SLA timeframe.`,
    recommendedAssigneeRole: 'HEAD',
    estimatedResolutionDays: suggestedPriority === 'URGENT' ? 1 : suggestedPriority === 'HIGH' ? 3 : 7,
  };

  // Overall Confidence
  const overallConfidence = Math.round(((categoryConfidence + priorityConfidence + departmentConfidence) / 3) * 100) / 100;

  const metadata: AIIntelligenceMetadata = {
    model: AI_MODEL_NAME,
    version: AI_MODEL_VERSION,
    timestamp: new Date().toISOString(),
    processingTimeMs: Date.now() - startTime,
  };

  return {
    suggestedCategory,
    suggestedSubcategory,
    suggestedPriority,
    suggestedDepartment,
    summary,
    duplicateMatches: duplicateMatches.slice(0, 3), // Top 3 duplicate matches
    sentimentSignal,
    suggestedResponse,
    suggestedResolutionAction,
    confidence: {
      categoryConfidence,
      priorityConfidence,
      departmentConfidence,
      overallConfidence,
    },
    metadata,
  };
}
