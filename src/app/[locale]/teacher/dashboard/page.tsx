'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/shared/navbar';
import { Sidebar } from '@/components/shared/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge, PriorityBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { FileText, Clock, CheckCircle2, ArrowRight, Users, Activity, PlusCircle } from 'lucide-react';
import { DEMO_COMPLAINTS, DEMO_TEACHER } from '@/lib/demo-data';

const recentActivity = [
  { text: 'Responded to COMP-104 (Infrastructure)', time: '2 hours ago', color: 'bg-blue-500' },
  { text: 'COMP-095 marked resolved', time: '8 days ago', color: 'bg-emerald-500' },
  { text: 'COMP-067 assigned to you for review', time: '11 days ago', color: 'bg-amber-500' },
];

export default function TeacherDashboard() {
  const [complaints, setComplaints] = React.useState<any[]>(DEMO_COMPLAINTS);

  React.useEffect(() => {
    async function loadComplaints() {
      try {
        const res = await fetch('/api/complaints');
        if (res.ok) {
          const data = await res.json();
          if (data.complaints) {
            setComplaints(data.complaints);
          }
        }
      } catch (err) {
        console.error('Failed to load teacher complaints', err);
      }
    }
    loadComplaints();
  }, []);

  const teacherComplaints = complaints.filter(c => c.complainantId === 'usr-002' || c.complainantRole === 'TEACHER');
  const assigned = complaints.filter(c => c.assignedTo === 'Prof. Anil Kadam' || c.assignedTo === 'usr-002');
  const pending = teacherComplaints.filter(c => !['RESOLVED', 'CLOSED'].includes(c.status)).length;
  const resolved = teacherComplaints.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status)).length;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Navbar userRole="TEACHER" userName={DEMO_TEACHER.name} notifCount={1} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role="TEACHER" notifCount={1} />
        <main className="flex-1 p-5 md:p-6 space-y-6 overflow-y-auto">
          <PageHeader
            title="Faculty Dashboard"
            description={`${DEMO_TEACHER.department} · ${DEMO_TEACHER.designation}`}
            badge={
              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Demo Mode
              </span>
            }
            action={
              <Link href="/teacher/complaints/new">
                <Button size="sm" className="gap-2">
                  <PlusCircle className="h-4 w-4" /> File Grievance
                </Button>
              </Link>
            }
          />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Filed', value: teacherComplaints.length, icon: <FileText className="h-4 w-4 text-slate-400" />, sub: 'Lifetime complaints' },
              { label: 'Pending', value: pending, icon: <Clock className="h-4 w-4 text-amber-400" />, sub: 'Active cases', color: 'text-amber-400' },
              { label: 'Resolved', value: resolved, icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />, sub: 'Closed cases', color: 'text-emerald-400' },
              { label: 'Assigned to Me', value: assigned.length, icon: <Users className="h-4 w-4 text-purple-400" />, sub: 'For review', color: 'text-purple-400' },
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
            {/* My Complaints */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-900 pb-4">
                <CardTitle className="text-sm font-bold text-white">My Grievances</CardTitle>
                <Link href="/teacher/complaints">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-slate-400">
                    View All <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {teacherComplaints.length === 0 ? (
                  <EmptyState
                    icon={<FileText className="h-7 w-7" />}
                    title="No grievances filed"
                    description="File a grievance to begin tracking it here."
                  />
                ) : (
                  <div className="divide-y divide-slate-900">
                    {teacherComplaints.map((comp) => (
                      <Link
                        key={comp.id}
                        href={`/teacher/complaints/${comp.id}`}
                        className="flex items-center gap-4 px-5 py-4 hover:bg-slate-900/40 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-mono text-slate-500">{comp.id}</span>
                            <StatusBadge status={comp.status} />
                            <PriorityBadge priority={comp.priority} />
                          </div>
                          <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white">{comp.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{comp.category} · {new Date(comp.createdAt).toLocaleDateString('en-IN')}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" />
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Activity */}
            <Card>
              <CardHeader className="border-b border-slate-900 pb-4">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-purple-400" /> Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  {recentActivity.map((ev, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${ev.color}`} />
                      <div>
                        <p className="text-xs text-slate-300 leading-snug">{ev.text}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{ev.time}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Assigned to me */}
                {assigned.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-slate-900">
                    <p className="text-xs font-bold text-slate-400 mb-3">Complaints Assigned To Me</p>
                    {assigned.map(c => (
                      <Link key={c.id} href={`/teacher/complaints/${c.id}`}
                        className="flex items-center justify-between py-2 hover:opacity-80 group">
                        <div>
                          <span className="text-xs font-mono text-slate-500 mr-2">{c.id}</span>
                          <StatusBadge status={c.status} />
                        </div>
                        <ArrowRight className="h-3 w-3 text-slate-600 group-hover:text-slate-400" />
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
