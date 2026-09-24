'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/shared/navbar';
import { Sidebar } from '@/components/shared/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, PriorityBadge } from '@/components/ui/status-badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ArrowLeft, CheckCircle2, Clock, User, Tag, Building, Lock, MessageSquare, Send, RefreshCw, Star } from 'lucide-react';
import type { Complaint, Comment, Feedback } from '@/lib/types';

const STEPS = [
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'UNDER_REVIEW', label: 'Under Review' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'CLOSED', label: 'Closed' },
];

export default function StudentComplaintDetail() {
  const params = useParams();
  const id = params?.id as string;
  const { user } = useAuth();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [closed, setClosed] = useState(false);

  // Feedback State
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedbackComments, setFeedbackComments] = useState<string>('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchComplaint();
  }, [id]);

  const fetchComplaint = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      // cache: 'no-store' ensures we always fetch fresh data — never stale browser cache.
      // This is critical for newly submitted complaints to appear immediately.
      const res = await fetch(`/api/complaints/${id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setComplaint(data.complaint);
        if (data.complaint?.feedback) {
          setFeedback(data.complaint.feedback);
        }
      } else if (res.status === 404) {
        setFetchError('Complaint not found. It may have been deleted, or this ID does not exist.');
      } else if (res.status === 403) {
        setFetchError('You do not have permission to view this complaint.');
      } else {
        const err = await res.json().catch(() => ({}));
        setFetchError(err.error || `Server error (${res.status}). Please try again.`);
      }

      // Also check dedicated feedback endpoint
      try {
        const fbRes = await fetch(`/api/complaints/${id}/feedback`, { cache: 'no-store' });
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          if (fbData.feedback) {
            setFeedback(fbData.feedback);
          }
        }
      } catch {}
    } catch (e) {
      console.error('Failed to fetch complaint', e);
      setFetchError('Network error. Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint) return;
    setSubmittingFeedback(true);
    setFeedbackError(null);

    try {
      const res = await fetch(`/api/complaints/${complaint.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          comments: feedbackComments.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedbackError(data.error || 'Failed to submit feedback.');
      } else {
        setFeedback(data.feedback);
      }
    } catch (err) {
      setFeedbackError('Network error. Please try again.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !complaint) return;
    try {
      const res = await fetch(`/api/complaints/${complaint.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment, isAnonymous: false }),
      });
      if (res.ok) {
        const data = await res.json();
        setComplaint({ ...complaint, comments: [...complaint.comments, data.comment] });
        setNewComment('');
      }
    } catch (e) {
      console.error('Failed to post comment', e);
    }
  };

  const handleClose = async () => {
    if (!complaint) return;
    try {
      const res = await fetch(`/api/complaints/${complaint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLOSED' }),
      });
      if (res.ok) {
        const data = await res.json();
        setComplaint(data.complaint);
        setClosed(true);
      }
    } catch (e) {
      console.error('Failed to close complaint', e);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
        <Navbar userRole="STUDENT" userName={user.name} />
        <div className="flex flex-1"><Sidebar role="STUDENT" />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-500">Loading complaint…</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (fetchError || !complaint) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
        <Navbar userRole="STUDENT" userName={user.name} />
        <div className="flex flex-1">
          <Sidebar role="STUDENT" />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm px-4">
              <p className="text-4xl font-black text-slate-700 mb-2">404</p>
              <p className="text-slate-400 mb-2">{fetchError || 'Complaint not found.'}</p>
              <p className="text-xs text-slate-600 mb-6">ID searched: <span className="font-mono text-slate-500">{id}</span></p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" size="sm" onClick={fetchComplaint} className="gap-2">
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </Button>
                <Link href="/student/complaints">
                  <Button variant="outline" size="sm">Back to List</Button>
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const currentStep = STEPS.findIndex(s => s.key === (closed ? 'CLOSED' : complaint.status));
  const isResolved = ['RESOLVED', 'CLOSED'].includes(complaint.status);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Navbar userRole="STUDENT" userName={user.name} notifCount={2} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role="STUDENT" />
        <main className="flex-1 p-5 md:p-6 space-y-6 overflow-y-auto">
          <div>
            <Link href="/student/complaints">
              <Button variant="ghost" size="sm" className="gap-1.5 text-slate-400 mb-4 -ml-1">
                <ArrowLeft className="h-4 w-4" /> Back to Grievances
              </Button>
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-mono text-slate-500">{complaint.id}</span>
                  <StatusBadge status={closed ? 'CLOSED' : complaint.status} />
                  <PriorityBadge priority={complaint.priority} />
                  {complaint.isAnonymous && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 border border-slate-800 rounded-full px-2 py-0.5">
                      <Lock className="h-2.5 w-2.5" /> Anonymous
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-bold text-white">{complaint.title}</h1>
              </div>
              {isResolved && !closed && (
                <Button
                  size="sm"
                  onClick={() => setConfirmClose(true)}
                  className="bg-emerald-600 hover:bg-emerald-500 shrink-0"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> Confirm & Close
                </Button>
              )}
            </div>
          </div>

          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between relative">
                <div className="absolute left-0 right-0 top-4 h-0.5 bg-slate-800 -z-0" />
                {STEPS.map((step, i) => {
                  const done = i < currentStep || closed;
                  const active = i === currentStep && !closed;
                  return (
                    <div key={step.key} className="flex flex-col items-center gap-2 z-10 flex-1">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                        done ? 'bg-blue-600 border-blue-600 text-white' :
                        active ? 'bg-blue-600/20 border-blue-500 text-blue-400 ring-4 ring-blue-500/10' :
                        'bg-slate-950 border-slate-700 text-slate-600'
                      }`}>
                        {done ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                      </div>
                      <span className={`text-[10px] font-semibold text-center leading-tight ${
                        active ? 'text-blue-400' : done ? 'text-slate-300' : 'text-slate-600'
                      }`}>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Post-Resolution Feedback Section */}
          {isResolved && feedback && (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardHeader className="pb-3 border-b border-slate-900/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-amber-400 flex items-center gap-2">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    Resolution Feedback Submitted
                  </CardTitle>
                  <span className="text-[10px] text-slate-500">
                    {new Date(feedback.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-5 w-5 ${
                          s <= feedback.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-bold text-slate-200 ml-1">
                    {feedback.rating} / 5
                  </span>
                </div>
                {feedback.comments && (
                  <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800/60 leading-relaxed mt-2">
                    &ldquo;{feedback.comments}&rdquo;
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {isResolved && !feedback && (
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardHeader className="pb-2 border-b border-slate-900/50">
                <CardTitle className="text-sm font-bold text-blue-400 flex items-center gap-2">
                  <Star className="h-4 w-4 text-blue-400" />
                  Rate Resolution Quality
                </CardTitle>
                <p className="text-xs text-slate-400 mt-1">
                  Please rate your satisfaction with the grievance resolution provided by the department.
                </p>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleSubmitFeedback} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      Your Rating:
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 hover:scale-110 transition-transform focus:outline-none"
                          aria-label={`Rate ${star} star`}
                        >
                          <Star
                            className={`h-6 w-6 transition-colors ${
                              star <= (hoverRating || rating)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-700 hover:text-slate-500'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-semibold text-slate-300 ml-2">
                        {hoverRating || rating} / 5 Stars
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Comments or suggestions (optional):
                    </label>
                    <textarea
                      value={feedbackComments}
                      onChange={(e) => setFeedbackComments(e.target.value)}
                      placeholder="Share any additional comments regarding how your grievance was handled..."
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>

                  {feedbackError && (
                    <p className="text-xs text-rose-400">{feedbackError}</p>
                  )}

                  <Button
                    type="submit"
                    size="sm"
                    disabled={submittingFeedback}
                    className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5"
                  >
                    {submittingFeedback ? 'Submitting...' : 'Submit Resolution Feedback'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="border-b border-slate-900 pb-4">
                <CardTitle className="text-sm font-bold text-white">Grievance Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  {[
                    { icon: <Tag className="h-3.5 w-3.5" />, label: 'Category', value: complaint.category },
                    { icon: <Building className="h-3.5 w-3.5" />, label: 'Department', value: complaint.department },
                    { icon: <User className="h-3.5 w-3.5" />, label: 'Assigned To', value: complaint.assignedTo ?? '—' },
                    { icon: <Clock className="h-3.5 w-3.5" />, label: 'Submitted', value: new Date(complaint.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-slate-500 mt-0.5">{item.icon}</span>
                      <div>
                        <p className="text-slate-500 font-medium">{item.label}</p>
                        <p className="text-slate-200 font-semibold mt-0.5">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-900 pt-4">
                  <p className="text-xs text-slate-500 font-semibold mb-2">Description</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{complaint.description}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader className="border-b border-slate-900 pb-4">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-400" />
                  Comments {complaint.comments.length > 0 && <span className="text-slate-500">({complaint.comments.length})</span>}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col pt-4">
                {complaint.comments.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">No comments yet.</p>
                ) : (
                  <div className="space-y-3 flex-1">
                    {complaint.comments.map((c: Comment) => (
                      <div key={c.id} className="bg-slate-900/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-slate-200">{c.authorName}</span>
                          <span className="text-[10px] text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{c.content}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  <input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                    placeholder="Add a comment…"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                  <Button size="icon" onClick={handleSendComment} disabled={!newComment.trim()}>
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <ConfirmDialog
        isOpen={confirmClose}
        onClose={() => setConfirmClose(false)}
        onConfirm={handleClose}
        title="Confirm Complaint Closure"
        description="Are you satisfied with the resolution? This action will mark the complaint as closed and cannot be undone."
        confirmLabel="Yes, Close Complaint"
        variant="default"
      />
    </div>
  );
}
