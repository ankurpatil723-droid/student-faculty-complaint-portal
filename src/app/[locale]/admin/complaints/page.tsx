'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/shared/navbar';
import { Sidebar } from '@/components/shared/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge, PriorityBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Search, FileText, ArrowRight, Lock, Filter } from 'lucide-react';
import type { ComplaintStatus, Priority, Complaint } from '@/lib/types';

const STATUS_TABS: { label: string; value: ComplaintStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Under Review', value: 'UNDER_REVIEW' },
  { label: 'Assigned', value: 'ASSIGNED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Escalated', value: 'ESCALATED' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
];

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'ALL'>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/complaints');
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
        c.complainantName.toLowerCase().includes(search.toLowerCase()) ||
        c.category.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const matchPriority = priorityFilter === 'ALL' || c.priority === priorityFilter;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [search, statusFilter, priorityFilter, complaints]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Navbar userRole="ADMIN" userName="Dr. Suresh Mane" notifCount={2} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role="ADMIN" />
        <main className="flex-1 p-5 md:p-6 space-y-6 overflow-y-auto">
          <PageHeader
            title="All Grievances"
            description={`${complaints.length} total complaints in system`}
            action={
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
                <Filter className="h-3.5 w-3.5" /> Filters
              </Button>
            }
          />

          <Card>
            <CardHeader className="border-b border-slate-900 pb-0 pt-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input type="text" placeholder="Search complaints, IDs, complainants…"
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500" />
              </div>

              {showFilters && (
                <div className="flex flex-wrap gap-3 pb-3 border-b border-slate-900">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500 mb-1 block">PRIORITY</label>
                    <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as Priority | 'ALL')}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500">
                      <option value="ALL">All Priorities</option>
                      {['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button variant="ghost" size="sm" onClick={() => { setPriorityFilter('ALL'); setStatusFilter('ALL'); setSearch(''); }}
                      className="text-xs text-slate-500">Clear All</Button>
                  </div>
                </div>
              )}

              <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
                {STATUS_TABS.map((tab) => (
                  <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
                    className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
                      statusFilter === tab.value ? 'bg-blue-600/10 text-blue-400 border-blue-500/30' : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-900'
                    }`}>
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
                <EmptyState icon={<FileText className="h-6 w-6" />} title="No complaints found"
                  description="Try adjusting your search or filters." />
              ) : (
                <div className="divide-y divide-slate-900">
                  {filtered.map((comp) => (
                    <Link key={comp.id} href={`/admin/complaints/${comp.id}`}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-slate-900/40 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-mono text-slate-500">{comp.id}</span>
                          <StatusBadge status={comp.status} />
                          <PriorityBadge priority={comp.priority} />
                          {comp.isAnonymous && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 border border-slate-800 px-1.5 py-0.5 rounded-full">
                              <Lock className="h-2.5 w-2.5" /> Anonymous
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white">{comp.title}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-500">
                          <span>{comp.category}</span>
                          <span>·</span>
                          <span>{comp.complainantName}</span>
                          <span>·</span>
                          <span>{new Date(comp.createdAt).toLocaleDateString('en-IN')}</span>
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
