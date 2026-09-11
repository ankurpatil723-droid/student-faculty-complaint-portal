import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
}: ConfirmDialogProps) => {
  if (!isOpen) return null;

  const confirmCls =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20'
      : variant === 'warning'
      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20'
      : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-100 p-1 hover:bg-slate-900 rounded-md transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            variant === 'danger' ? 'bg-rose-500/10 text-rose-400' :
            variant === 'warning' ? 'bg-amber-500/10 text-amber-400' :
            'bg-blue-500/10 text-blue-400'
          }`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-white text-base mb-1">{title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <Button variant="ghost" onClick={onClose}>{cancelLabel}</Button>
          <Button
            onClick={() => { onConfirm(); onClose(); }}
            className={confirmCls}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
