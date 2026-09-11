import React from 'react';

export const SkeletonLine = ({ className = '' }: { className?: string }) => (
  <div className={`h-4 bg-slate-800 rounded-md animate-pulse ${className}`} />
);

export const SkeletonCard = () => (
  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-6 space-y-3">
    <SkeletonLine className="w-1/3 h-3" />
    <SkeletonLine className="w-1/2 h-7" />
    <SkeletonLine className="w-2/3 h-3" />
  </div>
);

export const SkeletonRow = () => (
  <tr>
    {[...Array(5)].map((_, i) => (
      <td key={i} className="px-4 py-3">
        <SkeletonLine className={i === 1 ? 'w-48' : 'w-20'} />
      </td>
    ))}
  </tr>
);

export const SkeletonTable = ({ rows = 5 }: { rows?: number }) => (
  <div className="rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden">
    <div className="px-4 py-3 border-b border-slate-800">
      <SkeletonLine className="w-40 h-5" />
    </div>
    <table className="w-full">
      <tbody>
        {[...Array(rows)].map((_, i) => <SkeletonRow key={i} />)}
      </tbody>
    </table>
  </div>
);
