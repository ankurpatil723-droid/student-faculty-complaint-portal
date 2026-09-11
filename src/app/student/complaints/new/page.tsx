'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/shared/navbar';
import { Sidebar } from '@/components/shared/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { ArrowLeft, CheckCircle2, PaperclipIcon, Sparkles, Brain, AlertTriangle, ShieldCheck, Check } from 'lucide-react';
import type { CategoryType, Priority, AIIntelligenceData } from '@/lib/types';
import { analyzeComplaintIntelligence } from '@/lib/ai-intelligence-service';

import { useAuth } from '@/context/AuthContext';

const CATEGORIES: CategoryType[] = ['Academics', 'Infrastructure', 'Finance & Fees', 'Anti-Ragging & Harassment', 'Administration', 'Hostel & Canteen'];
const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function NewComplaintPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: '', category: 'Academics' as CategoryType, priority: 'MEDIUM' as Priority, description: '', isAnonymous: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generatedId, setGeneratedId] = useState<string>('');
  const [aiApplied, setAiApplied] = useState(false);

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const aiSuggestion: AIIntelligenceData | null = React.useMemo(() => {
    if (form.title.trim().length > 5) {
      return analyzeComplaintIntelligence(form.title, form.description);
    }
    return null;
  }, [form.title, form.description]);

  const applyAISuggestions = () => {
    if (!aiSuggestion) return;
    setForm((f) => ({
      ...f,
      category: (aiSuggestion.suggestedCategory as CategoryType) || f.category,
      priority: (aiSuggestion.suggestedPriority as Priority) || f.priority,
    }));
    setAiApplied(true);
    setTimeout(() => setAiApplied(false), 3000);
  };

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
        const compId = data.complaint.id;
        setGeneratedId(compId);
        setSubmitted(true);

        // Auto-redirect to /student/complaints (My Grievances) after brief toast display
        setTimeout(() => {
          router.push('/student/complaints');
          router.refresh();
        }, 1500);
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
        <Navbar userRole="STUDENT" userName={user.name} />
        <div className="flex flex-1">
          <Sidebar role="STUDENT" />
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 mx-auto mb-6">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-4">
                <Check className="h-3.5 w-3.5" /> Grievance filed successfully — {generatedId}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Grievance Submitted!</h2>
              <p className="text-slate-400 text-sm mb-2">
                Your complaint has been received and assigned a tracking ID. Redirecting to My Grievances…
              </p>
              <p className="font-mono text-blue-400 text-sm font-bold mb-8">{generatedId}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => {
                    router.push('/student/complaints');
                    router.refresh();
                  }}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500"
                >
                  Go to My Grievances →
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const inputCls = (field: string) =>
    `w-full bg-slate-900 border rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors ${errors[field] ? 'border-rose-500' : 'border-slate-800'}`;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Navbar userRole="STUDENT" userName="Ganesh Patil" notifCount={2} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role="STUDENT" />
        <main className="flex-1 p-5 md:p-6 space-y-6 overflow-y-auto">
          <div>
            <Link href="/student/complaints">
              <Button variant="ghost" size="sm" className="gap-1.5 text-slate-400 mb-4 -ml-1">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            </Link>
            <PageHeader title="File a Grievance" description="Submit a new complaint to the grievance redressal board" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="border-b border-slate-900 pb-4">
                <CardTitle className="text-sm font-bold">Complaint Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">Grievance Title *</label>
                    <input
                      id="new-complaint-title"
                      value={form.title}
                      onChange={(e) => set('title', e.target.value)}
                      placeholder="Brief summary of your issue"
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
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                      Detailed Description *
                      <span className="ml-2 font-normal text-slate-600">({form.description.length} / min 30 chars)</span>
                    </label>
                    <textarea
                      rows={6}
                      value={form.description}
                      onChange={(e) => set('description', e.target.value)}
                      placeholder="Describe the issue in detail — location, time, persons involved, evidence, etc."
                      className={inputCls('description')}
                    />
                    {errors.description && <p className="text-[10px] text-rose-400 mt-1">{errors.description}</p>}
                  </div>

                  <div className="border-2 border-dashed border-slate-800 rounded-lg p-4 flex flex-col items-center justify-center gap-2 text-center hover:border-slate-700 transition-colors cursor-pointer">
                    <PaperclipIcon className="h-5 w-5 text-slate-500" />
                    <p className="text-xs text-slate-500">Attach supporting documents <span className="text-slate-600">(PDF, Images up to 5MB)</span></p>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                    <input
                      type="checkbox"
                      id="anon-toggle"
                      checked={form.isAnonymous}
                      onChange={(e) => set('isAnonymous', e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-blue-600"
                    />
                    <label htmlFor="anon-toggle" className="text-xs text-slate-300 cursor-pointer leading-relaxed">
                      <span className="font-semibold">Submit Anonymously</span>
                      <span className="text-slate-500 block mt-0.5">Your identity will be hidden from faculty and HOD. Only Super Admin can request a reveal with formal justification.</span>
                    </label>
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full gap-2">
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting…
                      </span>
                    ) : 'Submit Grievance'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {/* AI Complaint Intelligence Widget */}
              <Card className="border-blue-500/30 bg-slate-950/90 shadow-xl relative overflow-hidden">
                <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-blue-600/10 blur-2xl" />
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-bold text-white flex items-center gap-2">
                    <Brain className="h-4 w-4 text-blue-400" />
                    AI Filing Assistant
                  </CardTitle>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                    v1.4 AI
                  </span>
                </CardHeader>
                <CardContent className="text-xs space-y-3 pt-0">
                  {aiSuggestion ? (
                    <>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Suggested Category:</span>
                          <span className="font-bold text-white">{aiSuggestion.suggestedCategory}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Suggested Priority:</span>
                          <span className="font-bold text-amber-400">{aiSuggestion.suggestedPriority}</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Department Routing:</span>
                          <span className="font-bold text-blue-400 truncate max-w-[130px]">{aiSuggestion.suggestedDepartment}</span>
                        </div>
                        <div className="text-[10px] text-emerald-400 font-medium pt-1 border-t border-slate-800/80 flex items-center justify-between">
                          <span>Confidence Score</span>
                          <span>{Math.round(aiSuggestion.confidence.overallConfidence * 100)}%</span>
                        </div>
                      </div>

                      {aiApplied ? (
                        <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] rounded font-semibold flex items-center gap-1.5 justify-center">
                          <Check className="h-3.5 w-3.5" /> AI Suggestions Applied!
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          onClick={applyAISuggestions}
                          className="w-full text-xs gap-1.5 bg-blue-600 hover:bg-blue-500 h-7"
                        >
                          <Sparkles className="h-3.5 w-3.5" /> Apply AI Suggestions
                        </Button>
                      )}

                      {aiSuggestion.duplicateMatches.length > 0 && (
                        <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 space-y-1">
                          <span className="font-semibold flex items-center gap-1 text-amber-400">
                            <AlertTriangle className="h-3 w-3" /> Similar Grievance Found
                          </span>
                          <p className="text-[10px] text-slate-300">
                            "{aiSuggestion.duplicateMatches[0].title}" ({aiSuggestion.duplicateMatches[0].similarityScore}% match). Please check existing complaints.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-500 text-[11px] leading-relaxed italic">
                      Start typing your grievance title & description to see instant AI category, priority, and department routing suggestions.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-bold text-slate-300">Submission Guidelines</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-slate-400 space-y-2.5 pt-0">
                  {[
                    'Be specific — include dates, locations, and individuals involved.',
                    'Attach evidence if available (screenshots, receipts).',
                    'Only one complaint per issue. Duplicates will be closed.',
                    'False or malicious complaints may lead to disciplinary action.',
                    'SLA target for resolution is 7 working days.',
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-bold text-slate-300">Priority Guide</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-2 pt-0">
                  {[
                    { p: 'URGENT', desc: 'Safety risk, harassment, immediate threat', color: 'text-rose-400' },
                    { p: 'HIGH',   desc: 'Exam/marks issue, major infra failure', color: 'text-amber-400' },
                    { p: 'MEDIUM', desc: 'Facility issues, fee queries', color: 'text-blue-400' },
                    { p: 'LOW',    desc: 'General suggestions, minor issues', color: 'text-slate-400' },
                  ].map((item) => (
                    <div key={item.p} className="flex items-start gap-2">
                      <span className={`font-bold w-14 shrink-0 ${item.color}`}>{item.p}</span>
                      <span className="text-slate-500">{item.desc}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
