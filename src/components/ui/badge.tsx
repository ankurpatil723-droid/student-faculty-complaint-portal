import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'error' | 'info';
}

export const Badge = ({ className, variant = 'default', ...props }: BadgeProps) => {
  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
          {
            'bg-slate-800 text-slate-100': variant === 'default',
            'bg-slate-900 text-slate-300': variant === 'secondary',
            'border border-slate-700 text-slate-300': variant === 'outline',
            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20': variant === 'success',
            'bg-amber-500/10 text-amber-400 border border-amber-500/20': variant === 'warning',
            'bg-rose-500/10 text-rose-400 border border-rose-500/20': variant === 'error',
            'bg-blue-500/10 text-blue-400 border border-blue-500/20': variant === 'info',
          }
        ),
        className
      )}
      {...props}
    />
  );
};
