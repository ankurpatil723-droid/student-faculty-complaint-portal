'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/shared/navbar';
import { Sidebar } from '@/components/shared/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge, PriorityBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  PlusCircle, FileText, Clock, CheckCircle2, AlertTriangle,
  TrendingUp, ArrowRight, Activity
} from 'lucide-react';
import { DEMO_COMPLAINTS, STUDENT_NOTIFICATIONS } from '@/lib/demo-data';
import { useAuth } from '@/context/AuthContext';
import { StudentOnboardingCard } from '@/components/shared/StudentOnboardingCard';

const STEPS = ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];

const timelineEvents = [
  { text: 'Prof. Kadam responded to COMP-104', time: '2 hours ago', color: 'bg-blue-500' },
  { text: 'COMP-098 assigned to Dr. Suresh Mane', time: '4 days ago', color: 'bg-purple-500' },
  { text: 'COMP-081 resolved by administration', time: '8 days ago', color: 'bg-emerald-500' },
  { text: 'COMP-081 marked for closure', time: '8 days ago', color: 'bg-slate-600' },
];

export default function StudentDashboard() {
  const { user } = useAuth();
  const [studentComplaints, setStudentComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadComplaints() {
      try {
        const res = await fetch('/api/complaints');
        if (res.ok) {
          const data = await res.json();
          if (data.complaints) {
            setStudentComplaints(data.complaints);
          }
        }
      } catch (err) {
        console.error('Failed to load complaints in dashboard', err);
      }
    }
    loadComplaints();
  }, []);

  const unreadCount = STUDENT_NOTIFICATIONS.filter(n => !n.read).length;
  const pending = studentComplaints.filter(c => !['RESOLVED', 'CLOSED'].includes(c.status)).length;
  const resolved = studentComplaints.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status)).length;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Navbar userRole="STUDENT" userName={user.name} notifCount={unreadCount} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role="STUDENT" notifCount={unreadCount} />

        <main className="flex-1 p-5 md:p-6 space-y-6 overflow-y-auto">
          <PageHeader
            title={`Welcome back, ${user.name.split(' ')[0]}`}
            description={`${user.department}${user.year ? ` · ${user.year}` : ''}${user.division ? ` · Div ${user.division}` : ''}`}
            badge={
              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Active Session
              </span>
            }
            action={
              <Link href="/student/complaints/new">
                <Button size="sm" className="gap-2">
                  <PlusCircle className="h-4 w-4" /> File Grievance
                </Button>
              </Link>
            }
          />

          {/* Student Profile & Onboarding Card */}
          <StudentOnboardingCard />

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Filed', value: studentComplaints.length, icon: <FileText className="h-4 w-4 text-slate-400" />, sub: 'Lifetime grievances' },
              { label: 'Pending',     value: pending,  icon: <Clock className="h-4 w-4 text-amber-400" />, sub: 'Active cases', color: 'text-amber-400' },
              { label: 'Resolved',    value: resolved, icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />, sub: 'Closed cases', color: 'text-emerald-400' },
              { label: 'Notifications', value: unreadCount, icon: <AlertTriangle className="h-4 w-4 text-blue-400" />, sub: 'Unread alerts', color: 'text-blue-400' },
            ].map((s, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-semibold text-slate-400">{s.label}</CardTitle>
                  {s.icon}
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-black text-white ${s.color ?? ''}`}>{s.value}</div>
                  <p className="text-[10px] text-slate-500 mt-1">{s.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Complaints */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-900 pb-4">
                <CardTitle className="text-sm font-bold text-white">Recent Grievances</CardTitle>
                <Link href="/student/complaints">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-slate-400">
                    View All <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {studentComplaints.length === 0 ? (
                  <EmptyState
                    icon={<FileText className="h-7 w-7" />}
                    title="No grievances filed yet"
                    description="File your first grievance to get started"
                    action={<Link href="/student/complaints/new"><Button size="sm">File Grievance</Button></Link>}
                  />
                ) : (
                  <div className="divide-y divide-slate-900">
                    {studentComplaints.slice(0, 4).map((comp) => {
                      const stepIdx = STEPS.indexOf(comp.status);
                      const progress = stepIdx < 0 ? 100 : Math.round(((stepIdx + 1) / STEPS.length) * 100);
                      return (
                        <Link
                          key={comp.id}
                          href={`/student/complaints/${comp.id}`}
                          className="flex items-start gap-4 px-5 py-4 hover:bg-slate-900/40 transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono text-slate-500">{comp.id}</span>
                              <StatusBadge status={comp.status} />
                              <PriorityBadge priority={comp.priority} />
                            </div>
                            <p className="text-sm font-medium text-slate-100 mt-1 truncate group-hover:text-white">
                              {comp.title}
                            </p>
                            <div className="mt-2">
                              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                <span>{comp.category}</span>
                                <span>{progress}%</span>
                              </div>
                              <div className="h-1 w-full rounded-full bg-slate-900">
                                <div
                                  className="h-full rounded-full bg-blue-500 transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 shrink-0 mt-1 transition-colors" />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card>
              <CardHeader className="border-b border-slate-900 pb-4">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-400" /> Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  {timelineEvents.map((ev, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${ev.color}`} />
                      <div>
                        <p className="text-xs text-slate-300 leading-snug">{ev.text}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{ev.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
