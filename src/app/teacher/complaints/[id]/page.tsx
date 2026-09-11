'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/shared/navbar';
import { Sidebar } from '@/components/shared/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge, PriorityBadge } from '@/components/ui/status-badge';
import { ArrowLeft, Tag, Building, User, Clock, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import type { Complaint, Comment, ComplaintStatus } from '@/lib/types';

const STEPS = [
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'UNDER_REVIEW', label: 'Under Review' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'CLOSED', label: 'Closed' },
];

export default function TeacherComplaintDetail() {
  const params = useParams();
  const id = params?.id as string;
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    fetchComplaint();
  }, [id]);

  const fetchComplaint = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/complaints/${id}`);
      if (res.ok) {
        const data = await res.json();
        setComplaint(data.complaint);
      }
    } catch (e) {
      console.error('Failed to fetch complaint', e);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
        <Navbar userRole="TEACHER" userName="Prof. Anil Kadam" />
        <div className="flex flex-1"><Sidebar role="TEACHER" />
          <main className="flex-1 flex items-center justify-center"><p className="text-sm text-slate-500">Loading…</p></main>
        </div>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
        <Navbar userRole="TEACHER" userName="Prof. Anil Kadam" />
        <div className="flex flex-1"><Sidebar role="TEACHER" />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-4xl font-black text-slate-700 mb-2">404</p>
              <p className="text-slate-400 mb-6">Complaint not found</p>
              <Link href="/teacher/complaints"><Button variant="outline">Back to List</Button></Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const currentStep = STEPS.findIndex(s => s.key === complaint.status);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Navbar userRole="TEACHER" userName="Prof. Anil Kadam" notifCount={1} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role="TEACHER" />
        <main className="flex-1 p-5 md:p-6 space-y-6 overflow-y-auto">
          <div>
            <Link href="/teacher/complaints">
              <Button variant="ghost" size="sm" className="gap-1.5 text-slate-400 mb-4 -ml-1">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            </Link>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono text-slate-500">{complaint.id}</span>
              <StatusBadge status={complaint.status} />
              <PriorityBadge priority={complaint.priority} />
            </div>
            <h1 className="text-xl font-bold text-white">{complaint.title}</h1>
          </div>

          {/* Stepper */}
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between relative">
                <div className="absolute left-0 right-0 top-4 h-0.5 bg-slate-800 -z-0" />
                {STEPS.map((step, i) => {
                  const done = i < currentStep;
                  const active = i === currentStep;
                  return (
                    <div key={step.key} className="flex flex-col items-center gap-2 z-10 flex-1">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                        done ? 'bg-purple-600 border-purple-600 text-white' :
                        active ? 'bg-purple-600/20 border-purple-500 text-purple-400 ring-4 ring-purple-500/10' :
                        'bg-slate-950 border-slate-700 text-slate-600'
                      }`}>
                        {done ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
                      </div>
                      <span className={`text-[10px] font-semibold text-center leading-tight ${
                        active ? 'text-purple-400' : done ? 'text-slate-300' : 'text-slate-600'
                      }`}>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="border-b border-slate-900 pb-4">
                <CardTitle className="text-sm font-bold">Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
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
                  <p className="text-xs text-slate-500 font-semibold mb-2">Description</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{complaint.description}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="flex flex-col">
              <CardHeader className="border-b border-slate-900 pb-4">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-purple-400" /> Respond
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col pt-4">
                {complaint.comments.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No responses yet. Be the first to respond.</p>
                ) : (
                  <div className="space-y-3 flex-1 mb-4">
                    {complaint.comments.map((c: Comment) => (
                      <div key={c.id} className={`rounded-lg p-3 ${c.authorRole === 'TEACHER' ? 'bg-purple-500/5 border border-purple-500/10' : 'bg-slate-900/50'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-slate-200">{c.authorName}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.authorRole === 'TEACHER' ? 'text-purple-400 bg-purple-500/10' : 'text-slate-500'}`}>
                            {c.authorRole}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{c.content}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-auto flex gap-2">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Type your response…"
                    rows={3}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 resize-none"
                  />
                  <Button size="icon" onClick={handleSend} disabled={!newComment.trim()} className="self-end">
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
