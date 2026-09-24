'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/shared/navbar';
import { Sidebar } from '@/components/shared/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge, PriorityBadge } from '@/components/ui/status-badge';
import { Modal } from '@/components/ui/modal';
import {
  ShieldAlert, Layers, Clock, CheckCircle, AlertTriangle, Lock,
  ArrowRight, Eye, TrendingUp, Download, Calendar, Filter, BarChart3,
  Building, RefreshCw, FileSpreadsheet, FileJson, Star
} from 'lucide-react';
import { DEMO_ADMIN, ADMIN_NOTIFICATIONS } from '@/lib/demo-data';
import type { CategoryType, Priority, ComplaintStatus } from '@/lib/types';
import type { AnalyticsSummary, AgingComplaint } from '@/lib/analytics-service';

const DEPARTMENTS = ['All', 'Computer Engineering', 'Information Technology', 'Mechanical Engineering', 'Civil Engineering', 'Administration'];
const CATEGORIES: (CategoryType | 'ALL')[] = ['ALL', 'Academics', 'Infrastructure', 'Finance & Fees', 'Anti-Ragging & Harassment', 'Administration', 'Hostel & Canteen'];
const PRIORITIES: (Priority | 'ALL')[] = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedCat, setSelectedCat] = useState<CategoryType | 'ALL'>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<Priority | 'ALL'>('ALL');

  // Reveal identity state
  const [revealModal, setRevealModal] = useState<string | null>(null);
  const [revealReason, setRevealReason] = useState('');
  const [revealedData, setRevealedData] = useState<{ name: string; id: string } | null>(null);
  const [revealError, setRevealError] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (startDate) query.set('startDate', startDate);
      if (endDate) query.set('endDate', endDate);
      if (selectedDept !== 'All') query.set('department', selectedDept);
      if (selectedCat !== 'ALL') query.set('category', selectedCat);
      if (selectedPriority !== 'ALL') query.set('priority', selectedPriority);

      const res = await fetch(`/api/analytics?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate, selectedDept, selectedCat, selectedPriority]);

  const applyPreset = (preset: 'all' | '7d' | '30d') => {
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else {
      const now = new Date();
      const end = now.toISOString().split('T')[0];
      const start = new Date(now.getTime() - (preset === '7d' ? 7 : 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(end);
    }
  };

  const buildExportUrl = (format: 'csv' | 'json') => {
    const query = new URLSearchParams();
    query.set('format', format);
    if (startDate) query.set('startDate', startDate);
    if (endDate) query.set('endDate', endDate);
    if (selectedDept !== 'All') query.set('department', selectedDept);
    if (selectedCat !== 'ALL') query.set('category', selectedCat);
    if (selectedPriority !== 'ALL') query.set('priority', selectedPriority);
    return `/api/analytics/export?${query.toString()}`;
  };

  const handleReveal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revealModal || revealReason.trim().length < 10) return;
    setRevealError('');
    try {
      const res = await fetch(`/api/complaints/${revealModal}/identity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: revealReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRevealError(data.error || 'Failed to reveal identity.');
      } else {
        setRevealedData({ name: data.complainantName, id: data.complainantId });
      }
    } catch (err) {
      setRevealError('Network error');
    }
  };

  const unreadCount = ADMIN_NOTIFICATIONS.filter((n) => !n.read).length;

  const handleExportDownload = (format: 'csv' | 'json') => {
    const url = buildExportUrl(format);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rscoe-grievance-report.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Navbar userRole="ADMIN" userName={DEMO_ADMIN.name} notifCount={unreadCount} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role="ADMIN" notifCount={unreadCount} />
        <main className="flex-1 p-5 md:p-6 space-y-6 overflow-y-auto">
          {/* Header */}
          <PageHeader
            title="Executive Analytics Dashboard"
            description={`${DEMO_ADMIN.department} · Real-Time Grievance Intelligence`}
            badge={
              analytics && analytics.agingComplaints.length > 0 ? (
                <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <AlertTriangle className="h-3 w-3" /> {analytics.agingComplaints.length} Aging Complaints
                </span>
              ) : undefined
            }
            action={
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleExportDownload('csv')}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/20"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Export CSV
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleExportDownload('json')}
                  className="gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-600/20"
                >
                  <FileJson className="h-4 w-4" /> Export JSON
                </Button>
              </div>
            }
          />

          {/* Interactive Filter Bar */}
          <Card className="bg-slate-900/60 border-slate-800">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <Filter className="h-4 w-4 text-blue-400" /> Filter Engine & Reporting Context
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => applyPreset('all')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                      !startDate && !endDate ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    All Time
                  </button>
                  <button
                    onClick={() => applyPreset('30d')}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                      startDate && endDate ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Last 30 Days
                  </button>
                  <button
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      setSelectedDept('All');
                      setSelectedCat('ALL');
                      setSelectedPriority('ALL');
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-slate-800/80 text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" /> Reset
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Department</label>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Category</label>
                  <select
                    value={selectedCat}
                    onChange={(e) => setSelectedCat(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Priority</label>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Executive KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
            {[
              { label: 'Total Complaints', value: analytics?.total ?? 0, color: 'text-white', sub: 'Filtered dataset' },
              { label: 'Pending', value: analytics?.pending ?? 0, color: 'text-sky-400', sub: 'Awaiting resolution' },
              { label: 'In Progress', value: analytics?.inProgress ?? 0, color: 'text-amber-400', sub: 'Under investigation' },
              { label: 'Resolved', value: analytics?.resolved ?? 0, color: 'text-emerald-400', sub: 'Resolved & Closed' },
              { label: 'Escalated', value: analytics?.escalated ?? 0, color: 'text-rose-400', sub: 'Director-level' },
              {
                label: 'Avg Resolution Time',
                value: analytics ? `${analytics.avgResolutionTimeDays}d` : '0d',
                color: 'text-purple-400',
                sub: analytics ? `~${analytics.avgResolutionTimeHours} hours` : '0 hours',
              },
              {
                label: 'Avg. Resolution Rating',
                value: analytics?.avgResolutionRating ? `${analytics.avgResolutionRating} / 5 ★` : '—',
                color: 'text-amber-400',
                sub: 'Student feedback',
              },
              {
                label: 'Feedback Response Rate',
                value: analytics ? `${analytics.feedbackResponseRate}%` : '0%',
                color: 'text-emerald-400',
                sub: 'Of resolved cases',
              },
            ].map((s, i) => (
              <Card key={i} className="bg-slate-950 border-slate-850">
                <CardContent className="p-4">
                  <p className="text-[11px] text-slate-400 font-semibold">{s.label}</p>
                  <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
                  <p className="text-[9px] text-slate-500 mt-1">{s.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Category & Department Breakdown */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-400" /> Category & Department Distribution
                </CardTitle>
                <CardDescription>Breakdown of grievance counts calculated dynamically</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center justify-between">
                    <span>Complaints by Category</span>
                    <span className="text-slate-500 font-normal">Dataset Count</span>
                  </h4>
                  <div className="space-y-3">
                    {analytics &&
                      Object.entries(analytics.byCategory).map(([cat, count]) => {
                        const pct = analytics.total > 0 ? Math.round((count / analytics.total) * 100) : 0;
                        return (
                          <div key={cat}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-slate-300 font-medium">{cat}</span>
                              <span className="text-white font-bold">
                                {count} <span className="text-slate-500">({pct}%)</span>
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
                              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div className="border-t border-slate-900 pt-4">
                  <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center justify-between">
                    <span>Complaints by Department</span>
                    <span className="text-slate-500 font-normal">Department Distribution</span>
                  </h4>
                  <div className="space-y-3">
                    {analytics &&
                      Object.entries(analytics.byDepartment).map(([dept, count]) => {
                        const pct = analytics.total > 0 ? Math.round((count / analytics.total) * 100) : 0;
                        return (
                          <div key={dept}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-slate-300 font-medium">{dept}</span>
                              <span className="text-white font-bold">
                                {count} <span className="text-slate-500">({pct}%)</span>
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
                              <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resolution Performance & Priority Breakdown */}
            <div className="space-y-4">
              {/* SLA Performance Card */}
              <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Resolution Performance (SLA Health)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-white">
                      {analytics?.resolutionPerformance.slaComplianceRate ?? 100}%
                    </span>
                    <span className="text-xs text-slate-400">Target: 7 Days Max</span>
                  </div>

                  <div className="h-2.5 w-full rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-500 transition-all"
                      style={{ width: `${analytics?.resolutionPerformance.slaComplianceRate ?? 100}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/60">
                    <div>
                      <p className="text-slate-500 text-[10px]">Within SLA (&le;7d)</p>
                      <p className="font-bold text-emerald-400">{analytics?.resolutionPerformance.withinSlaCount ?? 0} cases</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-[10px]">Breached SLA (&gt;7d)</p>
                      <p className="font-bold text-rose-400">{analytics?.resolutionPerformance.breachedSlaCount ?? 0} cases</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Priority Breakdown */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-400" /> Priority Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {analytics &&
                    Object.entries(analytics.byPriority).map(([pri, count]) => {
                      const color =
                        pri === 'URGENT'
                          ? 'border-rose-500/30 text-rose-400 bg-rose-500/10'
                          : pri === 'HIGH'
                          ? 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                          : pri === 'MEDIUM'
                          ? 'border-blue-500/30 text-blue-400 bg-blue-500/10'
                          : 'border-slate-700 text-slate-400 bg-slate-800/40';
                      return (
                        <div key={pri} className="flex items-center justify-between text-xs">
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${color}`}>{pri}</span>
                          <span className="font-bold text-white">{count}</span>
                        </div>
                      );
                    })}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Monthly Complaint Trends */}
          <Card>
            <CardHeader className="border-b border-slate-900 pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-400" /> Monthly Complaint Trends
              </CardTitle>
              <CardDescription>Volume and resolution progress aggregated by calendar month</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {analytics && analytics.monthlyTrends.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {analytics.monthlyTrends.map((m) => (
                    <div key={m.month} className="p-3 bg-slate-900/60 rounded-xl border border-slate-850">
                      <p className="text-xs font-bold text-slate-300 mb-2">{m.month}</p>
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-xl font-black text-white">{m.total}</span>
                        <span className="text-[10px] text-slate-500">complaints</span>
                      </div>
                      <div className="flex gap-2 text-[10px] pt-2 border-t border-slate-800">
                        <span className="text-emerald-400 font-semibold">{m.resolved} resolved</span>
                        <span className="text-amber-400 font-semibold">{m.pending} pending</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-4">No historical monthly data matching current filter.</p>
              )}
            </CardContent>
          </Card>

          {/* Aging Complaints (Unresolved > 7 days) */}
          <Card className="border-rose-500/20">
            <CardHeader className="border-b border-slate-900 pb-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Aging Complaints (&gt;7 Days Unresolved)
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">High-priority cases requiring immediate intervention</CardDescription>
              </div>
              <span className="text-xs font-mono font-bold text-rose-400 px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/20">
                {analytics?.agingComplaints.length ?? 0} Overdue
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {analytics && analytics.agingComplaints.length > 0 ? (
                <div className="divide-y divide-slate-900">
                  {analytics.agingComplaints.map((comp: AgingComplaint) => (
                    <div key={comp.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-900/40 transition-colors">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-mono text-slate-400 font-bold">{comp.id}</span>
                          <StatusBadge status={comp.status} />
                          <PriorityBadge priority={comp.priority} />
                          <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                            {comp.daysOpen} days open
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-white truncate">{comp.title}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {comp.department} · {comp.category}
                        </p>
                      </div>
                      <Link href={`/admin/complaints/${comp.id}`}>
                        <Button size="sm" variant="outline" className="text-xs gap-1">
                          Investigate <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500">
                  <CheckCircle className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                  No aging complaints! All active grievances are within target SLA.
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Identity Reveal Modal */}
      <Modal
        isOpen={!!revealModal}
        onClose={() => {
          setRevealModal(null);
          setRevealReason('');
          setRevealedData(null);
          setRevealError('');
        }}
        title="Request Complainant Identity Reveal"
      >
        {revealedData ? (
          <div className="py-2 space-y-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>Identity disclosed server-side and logged to audit records.</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-500">Complainant Name</p>
              <p className="text-sm font-bold text-white bg-slate-900 p-2.5 rounded-lg border border-slate-800 mt-1">{revealedData.name}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-500">Complainant ID</p>
              <p className="text-sm font-mono text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800 mt-1">{revealedData.id}</p>
            </div>
            <Button
              className="w-full mt-2"
              variant="outline"
              onClick={() => {
                setRevealModal(null);
                setRevealedData(null);
              }}
            >
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleReveal} className="space-y-4 py-2">
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 text-xs text-rose-400 leading-relaxed">
              <Lock className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Identity reveals are heavily audited. Every disclosure creates a permanent audit log entry.</span>
            </div>
            {revealError && <div className="p-3 bg-red-500/10 border border-red-500/20 text-xs text-red-400 rounded-lg">{revealError}</div>}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Justification Reason *</label>
              <textarea
                rows={4}
                value={revealReason}
                onChange={(e) => setRevealReason(e.target.value)}
                placeholder="State your formal reason for requiring the complainant's identity (min 10 chars)…"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500 resize-none"
              />
              {revealReason.length > 0 && revealReason.length < 10 && (
                <p className="text-[10px] text-rose-400 mt-1">Please provide at least 10 characters.</p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setRevealModal(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-rose-600 hover:bg-rose-500" disabled={revealReason.trim().length < 10}>
                Disclose Identity
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
