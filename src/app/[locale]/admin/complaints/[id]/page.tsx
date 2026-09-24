'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/shared/navbar';
import { Sidebar } from '@/components/shared/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, PriorityBadge } from '@/components/ui/status-badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import { ArrowLeft, Tag, Building, User, Clock, MessageSquare, Send, Lock, Eye, CheckCircle2, AlertTriangle, ChevronDown, Activity } from 'lucide-react';
import type { ComplaintStatus, Complaint, Comment, StatusHistoryEntry, CategoryType, Priority } from '@/lib/types';
import { AIIntelligencePanel } from '@/components/ui/AIIntelligencePanel';

const STATUS_OPTIONS: ComplaintStatus[] = ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED', 'REJECTED', 'REOPENED'];

export default function AdminComplaintDetail() {
  const params = useParams();
  const id = params?.id as string;
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusDropdown, setStatusDropdown] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [revealModal, setRevealModal] = useState(false);
  const [revealReason, setRevealReason] = useState('');
  const [revealSubmitting, setRevealSubmitting] = useState(false);
  const [revealedIdentity, setRevealedIdentity] = useState<{ complainantId: string; complainantName: string; auditId: string; disclosedAt: string } | null>(null);
  const [revealError, setRevealError] = useState('');
  const [confirmEscalate, setConfirmEscalate] = useState(false);
  const [assignedTo, setAssignedTo] = useState('');
  const [statusChanged, setStatusChanged] = useState(false);
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);

  useEffect(() => {
    fetchComplaint();
    fetchHistory();
  }, [id]);

  const fetchComplaint = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/complaints/${id}`);
      if (res.ok) {
        const data = await res.json();
        setComplaint(data.complaint);
        setAssignedTo(data.complaint.assignedTo || '');
      }
    } catch (e) {
      console.error('Failed to fetch complaint', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/complaints/${id}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (e) {
      console.error('Failed to fetch history', e);
    }
  };

  const handleSend = async () => {
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

  const handleStatusChange = async (newStatus: ComplaintStatus) => {
    if (!complaint) return;
    try {
      const res = await fetch(`/api/complaints/${complaint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setComplaint(data.complaint);
        setStatusChanged(true);
        setTimeout(() => setStatusChanged(false), 2000);
        fetchHistory();
      }
    } catch (e) {
      console.error('Failed to update status', e);
    } finally {
      setStatusDropdown(false);
    }
  };

  const handleAssign = async () => {
    if (!assignedTo.trim() || !complaint) return;
    try {
      const res = await fetch(`/api/complaints/${complaint.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: assignedTo.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setStatusChanged(true);
        setTimeout(() => setStatusChanged(false), 2000);
        fetchComplaint();
      }
    } catch (e) {
      console.error('Failed to assign', e);
    }
  };

  const handleReveal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || revealReason.trim().length < 10) return;
    setRevealSubmitting(true);
    setRevealError('');
    try {
      const res = await fetch(`/api/complaints/${complaint.id}/identity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: revealReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRevealError(data.error || 'Failed to retrieve identity.');
      } else {
        // Store in component state only — never in localStorage
        setRevealedIdentity({
          complainantId: data.complainantId,
          complainantName: data.complainantName,
          auditId: data.auditId,
          disclosedAt: data.disclosedAt,
        });
      }
    } catch (err) {
      setRevealError('Network error. Please try again.');
    } finally {
      setRevealSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
        <Navbar userRole="ADMIN" userName="Dr. Suresh Mane" />
        <div className="flex flex-1"><Sidebar role="ADMIN" />
          <main className="flex-1 flex items-center justify-center"><p className="text-sm text-slate-500">Loading…</p></main>
        </div>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
        <Navbar userRole="ADMIN" userName="Dr. Suresh Mane" />
        <div className="flex flex-1"><Sidebar role="ADMIN" />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-4xl font-black text-slate-700 mb-2">404</p>
              <p className="text-slate-400 mb-6">Complaint not found</p>
              <Link href="/admin/complaints"><Button variant="outline">Back to List</Button></Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Navbar userRole="ADMIN" userName="Dr. Suresh Mane" notifCount={2} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role="ADMIN" />
        <main className="flex-1 p-5 md:p-6 space-y-6 overflow-y-auto">
          <div>
            <Link href="/admin/complaints">
              <Button variant="ghost" size="sm" className="gap-1.5 text-slate-400 mb-4 -ml-1">
                <ArrowLeft className="h-4 w-4" /> Back to All Complaints
              </Button>
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-mono text-slate-500">{complaint.id}</span>
                  <StatusBadge status={complaint.status} />
                  <PriorityBadge priority={complaint.priority} />
                  {complaint.isAnonymous && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 border border-slate-800 rounded-full px-2 py-0.5">
                      <Lock className="h-2.5 w-2.5" /> Anonymous
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-bold text-white">{complaint.title}</h1>
                {statusChanged && <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Status updated</p>}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => { setRevealModal(true); setRevealedIdentity(null); setRevealError(''); setRevealReason(''); }}
                  className="gap-1.5 text-blue-400 hover:bg-blue-600/10 border border-blue-500/20 text-xs">
                  <Eye className="h-3.5 w-3.5" /> Reveal Identity
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmEscalate(true)}
                  className="gap-1.5 text-amber-400 hover:bg-amber-600/10 border border-amber-500/20 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5" /> Escalate
                </Button>

                <div className="relative">
                  <Button size="sm" onClick={() => setStatusDropdown(!statusDropdown)} className="gap-1.5 text-xs">
                    Change Status <ChevronDown className={`h-3.5 w-3.5 transition-transform ${statusDropdown ? 'rotate-180' : ''}`} />
                  </Button>
                  {statusDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setStatusDropdown(false)} />
                      <div className="absolute right-0 top-full mt-1.5 z-50 w-44 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl py-1 overflow-hidden">
                        {STATUS_OPTIONS.map(s => (
                          <button key={s} onClick={() => handleStatusChange(s)}
                            className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-900 transition-colors ${
                              complaint.status === s ? 'text-blue-400' : 'text-slate-300'
                            }`}>
                            {s.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* AI Complaint Intelligence Module */}
              <AIIntelligencePanel
                complaintId={complaint.id}
                aiData={complaint.aiIntelligence}
                currentCategory={complaint.category}
                currentPriority={complaint.priority}
                currentDepartment={complaint.department}
                onApplySuggestions={(cat, prio, dept) => {
                  setComplaint(prev => prev ? { ...prev, category: cat, priority: prio, department: dept } : null);
                  setStatusChanged(true);
                  setTimeout(() => setStatusChanged(false), 3000);
                }}
                onAdoptResponse={(draft) => {
                  setNewComment(draft);
                }}
                onExecuteAction={(plan) => {
                  handleStatusChange('IN_PROGRESS');
                }}
              />

              <Card>
                <CardHeader className="border-b border-slate-900 pb-4">
                  <CardTitle className="text-sm font-bold">Complaint Details</CardTitle>
                </CardHeader>
              <CardContent className="pt-4 space-y-5">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  {[
                    { icon: <Tag className="h-3.5 w-3.5" />, label: 'Category', value: complaint.category },
                    { icon: <Building className="h-3.5 w-3.5" />, label: 'Department', value: complaint.department },
                    { icon: <User className="h-3.5 w-3.5" />, label: 'Complainant', value: complaint.isAnonymous ? 'Anonymous' : complaint.complainantName },
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
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Assign To Faculty/Officer</label>
                  <div className="flex gap-2">
                    <input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}
                      placeholder="e.g. Prof. Anil Kadam"
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500" />
                    <Button size="sm" onClick={handleAssign}>Assign</Button>
                  </div>
                </div>

                <div className="border-t border-slate-900 pt-4">
                  <p className="text-xs text-slate-500 font-semibold mb-2">Description</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{complaint.description}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
              <Card className="flex flex-col">
                <CardHeader className="border-b border-slate-900 pb-4">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-amber-400" /> Admin Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col pt-4">
                  {complaint.comments.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">No notes yet.</p>
                  ) : (
                    <div className="space-y-3 mb-4">
                      {complaint.comments.map((c: Comment) => (
                        <div key={c.id} className={`rounded-lg p-3 ${c.authorRole === 'ADMIN' || c.authorRole === 'HEAD' ? 'bg-amber-500/5 border border-amber-500/10' : 'bg-slate-900/50'}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-slate-200">{c.authorName}</span>
                            <span className="text-[10px] text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-auto flex gap-2">
                    <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a note or response…" rows={2}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none" />
                    <Button size="icon" onClick={handleSend} disabled={!newComment.trim()} className="self-end">
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {history.length > 0 && (
                <Card>
                  <CardHeader className="border-b border-slate-900 pb-4">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Activity className="h-4 w-4 text-slate-400" /> Audit Trail
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {history.map((log) => (
                      <div key={log.id} className="flex items-start gap-2 text-xs">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                        <div>
                          <p className="text-slate-300">
                            {log.oldStatus ? `Status changed from ${log.oldStatus} to ${log.newStatus}` : `Status set to ${log.newStatus}`}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{log.changedByName} · {new Date(log.changedAt).toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>

      <Modal isOpen={revealModal} onClose={() => { setRevealModal(false); setRevealedIdentity(null); setRevealError(''); setRevealReason(''); }} title="Reveal Complainant Identity">
        {revealedIdentity ? (
          <div className="py-2 space-y-4">
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-300">
                <p className="font-semibold mb-1">Identity Disclosed — Access Logged</p>
                <p className="text-slate-400">Audit ID: <span className="font-mono text-slate-300">{revealedIdentity.auditId}</span></p>
                <p className="text-slate-400">Logged at: {new Date(revealedIdentity.disclosedAt).toLocaleString('en-IN')}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <p className="text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Complainant Name</p>
                <p className="text-sm font-bold text-white bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5">{revealedIdentity.complainantName}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Complainant ID</p>
                <p className="text-sm font-mono text-slate-300 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5">{revealedIdentity.complainantId}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-600">This disclosure has been permanently recorded. The information displayed here is not stored in your browser.</p>
            <Button className="w-full" variant="outline" onClick={() => { setRevealModal(false); setRevealedIdentity(null); }}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleReveal} className="space-y-4 py-2">
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 text-xs text-rose-400 leading-relaxed">
              <Lock className="h-4 w-4 shrink-0 mt-0.5" />
              <span>This action is <strong>permanently logged</strong> with your ID, timestamp, and stated reason. Unauthorized or frivolous access is a policy violation.</span>
            </div>
            {revealError && (
              <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-red-400">
                {revealError}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Formal Justification <span className="text-rose-400">*</span></label>
              <textarea rows={4} value={revealReason} onChange={(e) => setRevealReason(e.target.value)}
                placeholder="State a formal, specific reason for requiring the complainant's identity (min. 10 characters)…"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500 resize-none" />
              {revealReason.length > 0 && revealReason.length < 10 && (
                <p className="text-[10px] text-rose-400 mt-1">Minimum 10 characters required.</p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setRevealModal(false)} disabled={revealSubmitting}>Cancel</Button>
              <Button type="submit" className="bg-rose-600 hover:bg-rose-500" disabled={revealSubmitting || revealReason.trim().length < 10}>
                {revealSubmitting ? 'Requesting…' : 'Disclose Identity'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={confirmEscalate}
        onClose={() => setConfirmEscalate(false)}
        onConfirm={() => handleStatusChange('ESCALATED')}
        title="Escalate Complaint"
        description="This will escalate the complaint to Director level. The complainant and assigned faculty will be notified. This action is logged."
        confirmLabel="Escalate"
        variant="warning"
      />
    </div>
  );
}
