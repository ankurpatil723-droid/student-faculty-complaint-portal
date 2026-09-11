import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}

export const PageHeader = ({ title, description, badge, action }: PageHeaderProps) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
    <div>
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
        {badge}
      </div>
      {description && (
        <p className="text-sm text-slate-400">{description}</p>
      )}
    </div>
    {action && <div className="flex items-center gap-3 shrink-0">{action}</div>}
  </div>
);
