import React from 'react';
import { FileX, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 mb-5">
      {icon ?? <Inbox className="h-7 w-7" />}
    </div>
    <h3 className="text-base font-semibold text-slate-200 mb-2">{title}</h3>
    {description && (
      <p className="text-sm text-slate-500 max-w-xs leading-relaxed">{description}</p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
);
