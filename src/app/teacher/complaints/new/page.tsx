'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/shared/navbar';
import { Sidebar } from '@/components/shared/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { ArrowLeft, CheckCircle2, PaperclipIcon } from 'lucide-react';
import type { CategoryType, Priority } from '@/lib/types';

const CATEGORIES: CategoryType[] = ['Academics', 'Infrastructure', 'Finance & Fees', 'Anti-Ragging & Harassment', 'Administration', 'Hostel & Canteen'];
const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function TeacherNewComplaintPage() {
  const [form, setForm] = useState({
    title: '', category: 'Academics' as CategoryType, priority: 'MEDIUM' as Priority, description: '', isAnonymous: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generatedId, setGeneratedId] = useState<string>('');

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Please provide a grievance title.';
    if (form.description.trim().length < 30) e.description = 'Description must be at least 30 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedId(data.complaint.id);
        setSubmitted(true);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to submit complaint.');
      }
    } catch (err) {
      alert('Network error during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
        <Navbar userRole="TEACHER" userName="Prof. Anil Kadam" />
        <div className="flex flex-1">
          <Sidebar role="TEACHER" />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 mx-auto mb-6">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Grievance Submitted!</h2>
              <p className="text-slate-400 text-sm mb-2">
                Your complaint has been logged with tracking ID:
              </p>
              <p className="font-mono text-purple-400 text-sm font-bold mb-8">{generatedId}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href={`/teacher/complaints/${generatedId}`}>
                  <Button className="w-full sm:w-auto bg-purple-600 hover:bg-purple-500">View Complaint Details</Button>
                </Link>
                <Link href="/teacher/complaints">
                  <Button variant="outline" className="w-full sm:w-auto">View All Complaints</Button>
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const inputCls = (field: string) =>
    `w-full bg-slate-900 border rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500 transition-colors ${errors[field] ? 'border-rose-500' : 'border-slate-800'}`;

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
            <PageHeader title="File Faculty Grievance" description="Submit an institutional or departmental complaint" />
          </div>

          <Card className="max-w-2xl">
            <CardHeader className="border-b border-slate-900 pb-4">
              <CardTitle className="text-sm font-bold">Complaint Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Grievance Title *</label>
                  <input
                    value={form.title}
                    onChange={(e) => set('title', e.target.value)}
                    placeholder="Brief summary of issue"
                    className={inputCls('title')}
                  />
                  {errors.title && <p className="text-[10px] text-rose-400 mt-1">{errors.title}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Category *</label>
                    <select value={form.category} onChange={(e) => set('category', e.target.value)} className={inputCls('category')}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Priority *</label>
                    <select value={form.priority} onChange={(e) => set('priority', e.target.value)} className={inputCls('priority')}>
                      {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Description *</label>
                  <textarea
                    rows={5}
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Provide full context and details…"
                    className={inputCls('description')}
                  />
                  {errors.description && <p className="text-[10px] text-rose-400 mt-1">{errors.description}</p>}
                </div>

                <Button type="submit" disabled={submitting} className="w-full bg-purple-600 hover:bg-purple-500">
                  {submitting ? 'Submitting…' : 'Submit Faculty Grievance'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
