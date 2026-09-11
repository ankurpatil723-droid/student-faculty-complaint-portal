import React from 'react';
import { twMerge } from 'tailwind-merge';
import type { ComplaintStatus, Priority } from '../../lib/types';

// ─── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_MAP: Record<ComplaintStatus, { label: string; cls: string }> = {
  SUBMITTED:    { label: 'Submitted',    cls: 'bg-sky-500/10 text-sky-400 border-sky-500/30' },
  UNDER_REVIEW: { label: 'Under Review', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  ASSIGNED:     { label: 'Assigned',     cls: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  IN_PROGRESS:  { label: 'In Progress',  cls: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  RESOLVED:     { label: 'Resolved',     cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  CLOSED:       { label: 'Closed',       cls: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
  REJECTED:     { label: 'Rejected',     cls: 'bg-red-500/10 text-red-400 border-red-500/30' },
  ESCALATED:    { label: 'Escalated',    cls: 'bg-rose-500/10 text-rose-400 border-rose-500/30' },
  REOPENED:     { label: 'Reopened',     cls: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
};

const PRIORITY_MAP: Record<Priority, { label: string; cls: string }> = {
  LOW:    { label: 'Low',    cls: 'text-slate-400' },
  MEDIUM: { label: 'Medium', cls: 'text-blue-400' },
  HIGH:   { label: 'High',   cls: 'text-amber-400' },
  URGENT: { label: 'Urgent', cls: 'text-rose-400' },
};

interface StatusBadgeProps {
  status: ComplaintStatus;
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const meta = STATUS_MAP[status] ?? { label: status, cls: 'bg-slate-500/10 text-slate-400 border-slate-500/30' };
  return (
    <span className={twMerge(
      'inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wide whitespace-nowrap',
      meta.cls, className
    )}>
      {meta.label}
    </span>
  );
};

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export const PriorityBadge = ({ priority, className }: PriorityBadgeProps) => {
  const meta = PRIORITY_MAP[priority] ?? { label: priority, cls: 'text-slate-400' };
  return (
    <span className={twMerge('text-xs font-bold uppercase tracking-wide', meta.cls, className)}>
      {meta.label}
    </span>
  );
};
