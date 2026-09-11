import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={twMerge(
          clsx(
            'inline-flex items-center justify-center font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] duration-100',
            {
              'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 focus-visible:ring-blue-500':
                variant === 'primary',
              'bg-slate-800 hover:bg-slate-700 text-slate-100 focus-visible:ring-slate-700':
                variant === 'secondary',
              'border border-slate-700 hover:bg-slate-900 text-slate-300 focus-visible:ring-slate-700':
                variant === 'outline',
              'hover:bg-slate-900 text-slate-400 hover:text-slate-100 focus-visible:ring-slate-800':
                variant === 'ghost',
              'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/20 focus-visible:ring-red-500':
                variant === 'destructive',
              'px-3 py-1.5 text-xs': size === 'sm',
              'px-4 py-2 text-sm': size === 'md',
              'px-5 py-3 text-base': size === 'lg',
              'p-2.5': size === 'icon',
            },
            className
          )
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
