import type { Feedback } from './types';
import { getComplaintById } from './complaint-store';
import { createServerClient } from './supabase/server';
import { readJson, writeJson } from './persist';

const FEEDBACK_FILE = 'feedback.json';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id?: string): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

function loadFeedbackList(): Feedback[] {
  return readJson<Feedback[]>(FEEDBACK_FILE, []);
}

function saveFeedbackList(data: Feedback[]): void {
  writeJson(FEEDBACK_FILE, data);
}

/**
 * Submit feedback for a resolved or closed complaint.
 */
export async function submitFeedback(input: {
  complaintId: string;
  rating: number;
  comments?: string;
}): Promise<Feedback> {
  const { complaintId, rating, comments } = input;

  // 1. Validate rating is an integer between 1 and 5
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('Rating must be an integer between 1 and 5.');
  }

  // 2. Validate complaint exists and is in 'RESOLVED' or 'CLOSED' status
  const complaint = getComplaintById(complaintId);
  if (!complaint) {
    throw new Error('Complaint not found.');
  }

  if (!['RESOLVED', 'CLOSED'].includes(complaint.status)) {
    throw new Error('Feedback can only be submitted for RESOLVED or CLOSED complaints.');
  }

  // 3. Check for existing feedback in local store
  const existingList = loadFeedbackList();
  const existingFeedback = existingList.find((f) => f.complaintId === complaintId);
  if (existingFeedback) {
    throw new Error('Feedback already submitted for this complaint.');
  }

  const nowIso = new Date().toISOString();
  let createdFeedback: Feedback = {
    id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    complaintId,
    rating,
    comments: comments?.trim() || undefined,
    createdAt: nowIso,
  };

  // 4. Attempt insert into Supabase `public.feedback` table via createServerClient()
  try {
    const supabase = await createServerClient();
    if (isValidUuid(complaintId)) {
      const { data, error } = await supabase
        .from('feedback')
        .insert({
          complaint_id: complaintId,
          rating,
          comments: comments?.trim() || null,
        })
        .select('*')
        .single();

      if (error) {
        if (error.code === '23505' || error.message.includes('unique') || error.message.includes('duplicate')) {
          throw new Error('Feedback already submitted for this complaint.');
        }
        console.warn('[submitFeedback Supabase write notice]', error.message);
      } else if (data) {
        createdFeedback = {
          id: data.id,
          complaintId: data.complaint_id,
          rating: data.rating,
          comments: data.comments || undefined,
          createdAt: data.created_at,
        };
      }
    }
  } catch (err: any) {
    if (err.message === 'Feedback already submitted for this complaint.') {
      throw err;
    }
    console.warn('[submitFeedback Supabase fallback to local storage]', err?.message);
  }

  // 5. Persist to local JSON store
  existingList.push(createdFeedback);
  saveFeedbackList(existingList);

  return createdFeedback;
}

/**
 * Get feedback submitted for a specific complaint.
 */
export async function getFeedbackForComplaint(complaintId: string): Promise<Feedback | null> {
  const existingList = loadFeedbackList();
  const localMatch = existingList.find((f) => f.complaintId === complaintId);
  if (localMatch) {
    return localMatch;
  }

  // Attempt DB read if UUID
  if (isValidUuid(complaintId)) {
    try {
      const supabase = await createServerClient();
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('complaint_id', complaintId)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          complaintId: data.complaint_id,
          rating: data.rating,
          comments: data.comments || undefined,
          createdAt: data.created_at,
        };
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Get all feedback records.
 */
export function getAllFeedback(): Feedback[] {
  return loadFeedbackList();
}
