import React from 'react';
import { X } from 'lucide-react';
import { Card } from './card';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <Card className="w-full max-w-lg border border-slate-800 bg-slate-950 p-6 flex flex-col shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-100 transition-colors p-1 hover:bg-slate-900 rounded-md"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold text-white mb-4 border-b border-slate-900 pb-2">{title}</h2>
        <div className="flex-1 text-slate-300 text-sm overflow-y-auto max-h-[75vh]">
          {children}
        </div>
      </Card>
    </div>
  );
};
