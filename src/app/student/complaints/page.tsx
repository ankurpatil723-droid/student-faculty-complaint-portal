'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/shared/navbar';
import { Sidebar } from '@/components/shared/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge, PriorityBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { PlusCircle, Search, FileText, ArrowRight } from 'lucide-react';
import type { ComplaintStatus, Complaint } from '@/lib/types';

import { useAuth } from '@/context/AuthContext';

const STATUS_TABS: { label: string; value: ComplaintStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Under Review', value: 'UNDER_REVIEW' },
  { label: 'Assigned', value: 'ASSIGNED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
];

function StudentComplaintsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'ALL'>('ALL');
  // 'new' query param set by router.refresh() triggers a fresh fetch
  const newParam = searchParams?.get('new');

  // Re-fetch every time this page mounts or 'new' param changes (after router.push from new complaint form)
  useEffect(() => {
    fetchComplaints();
  }, [newParam]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      // cache: 'no-store' ensures fresh data on every mount, not stale browser cache
      const res = await fetch('/api/complaints', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints || []);
      }
    } catch (e) {
      console.error('Failed to fetch complaints', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return complaints.filter((c) => {
      const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.id.toLowerCase().includes(search.toLowerCase()) ||
        c.category.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter, complaints]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Navbar userRole="STUDENT" userName={user.name} notifCount={2} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role="STUDENT" />
        <main className="flex-1 p-5 md:p-6 space-y-6 overflow-y-auto">
          <PageHeader
            title="My Grievances"
            description={`${complaints.length} complaints filed`}
            action={
              <Link href="/student/complaints/new">
                <Button size="sm" className="gap-2">
                  <PlusCircle className="h-4 w-4" /> New Grievance
                </Button>
              </Link>
            }
          />

          <Card>
            <CardHeader className="border-b border-slate-900 pb-0 pt-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by title, ID, or category…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-hide -mx-1 px-1">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setStatusFilter(tab.value)}
                    className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
                      statusFilter === tab.value
                        ? 'bg-blue-600/10 text-blue-400 border-blue-500/30'
                        : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    {tab.label}
                    <span className="ml-1.5 text-[10px] text-slate-500">
                      {tab.value === 'ALL' ? complaints.length : complaints.filter(c => c.status === tab.value).length}
                    </span>
                  </button>
                ))}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-500">Loading complaints…</div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={<FileText className="h-6 w-6" />}
                  title={search ? 'No results found' : 'No complaints in this category'}
                  description={search ? `No complaints match "${search}"` : 'Try a different filter or file a new grievance.'}
                  action={!search ? (
                    <Link href="/student/complaints/new"><Button size="sm">File Grievance</Button></Link>
                  ) : undefined}
                />
              ) : (
                <div className="divide-y divide-slate-900">
                  {filtered.map((comp) => (
                    <Link
                      key={comp.id}
                      href={`/student/complaints/${comp.id}`}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-slate-900/40 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-mono text-slate-500">{comp.id}</span>
                          <StatusBadge status={comp.status} />
                          <PriorityBadge priority={comp.priority} />
                          {comp.isAnonymous && (
                            <span className="text-[10px] text-slate-500 italic">anonymous</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white">
                          {comp.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                          <span>{comp.category}</span>
                          <span>·</span>
                          <span>{new Date(comp.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          {comp.assignedTo && <><span>·</span><span>Assigned: {comp.assignedTo}</span></>}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

export default function StudentComplaintsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading complaints...</div>}>
      <StudentComplaintsContent />
    </Suspense>
  );
}
