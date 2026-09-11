'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { Role, User } from '@/lib/types';
import {
  GraduationCap,
  User as UserIcon,
  Mail,
  Building,
  Hash,
  Phone,
  ScanLine,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Edit3
} from 'lucide-react';

const IdScannerModal = dynamic(() => import('@/components/ui/IdScannerModal'), { ssr: false });

export interface OnboardingAccount {
  name: string;
  email: string;
  role?: Role;
  department?: string;
  rollNumber?: string;
  year?: string;
  division?: string;
  phone?: string;
}

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAccount: OnboardingAccount | null;
  onComplete?: (user: User) => void;
}

const DEPARTMENTS = [
  'Computer Engineering',
  'Information Technology',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electronics & Telecommunication',
  'Administration',
];

const YEARS = ['First Year', 'Second Year', 'Third Year', 'Fourth Year'];
const DIVISIONS = ['A', 'B', 'C', 'D'];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  initialAccount,
  onComplete,
}) => {
  const { loginCustomUser } = useAuth();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedBadge, setScannedBadge] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'STUDENT' as Role,
    department: 'Computer Engineering',
    rollNumber: '',
    year: 'Third Year',
    division: 'B',
    phone: '',
  });

  useEffect(() => {
    if (initialAccount) {
      setFormData({
        name: initialAccount.name || '',
        email: initialAccount.email || '',
        role: initialAccount.role || 'STUDENT',
        department: initialAccount.department || 'Computer Engineering',
        rollNumber: initialAccount.rollNumber || '',
        year: initialAccount.year || 'Third Year',
        division: initialAccount.division || 'B',
        phone: initialAccount.phone || '+91 98765 43210',
      });
      setScannedBadge(false);
      setError('');
    }
  }, [initialAccount]);

  const handleScanSuccess = (prn: string, generatedEmail?: string) => {
    setFormData((prev) => ({
      ...prev,
      rollNumber: prn,
      email: prev.email || generatedEmail || '',
    }));
    setScannedBadge(true);
    setScannerOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Please provide your full name and email address.');
      return;
    }

    if (formData.role === 'STUDENT' && !formData.rollNumber.trim()) {
      setError('Please enter your Roll Number / PRN or scan your college ID card.');
      return;
    }

    setError('');
    setLoading(true);

    const userPayload: Partial<User> = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      role: formData.role,
      department: formData.department.trim(),
      rollNumber: formData.role === 'STUDENT' ? formData.rollNumber.trim().toUpperCase() : undefined,
      year: formData.role === 'STUDENT' ? formData.year : undefined,
      division: formData.role === 'STUDENT' ? formData.division : undefined,
      phone: formData.phone.trim() || '+91 98765 43210',
    };

    // Save profile to context and localStorage
    loginCustomUser(userPayload);

    // Provision server-side session token
    try {
      await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: formData.role,
          email: userPayload.email,
          name: userPayload.name,
        }),
      });
    } catch (_) {}

    const dest =
      formData.role === 'STUDENT'
        ? '/student/dashboard'
        : formData.role === 'TEACHER'
        ? '/teacher/dashboard'
        : '/admin/dashboard';

    setLoading(false);
    onClose();
    window.location.href = dest;
  };

  const inputCls =
    'w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none transition-colors';

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Complete Profile & ID Verification">
        <div className="space-y-4 py-1">
          {/* Header Badge */}
          <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                First-Time Account Onboarding
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-semibold">
                  Google Verified
                </span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Complete your details and verify your institutional ID to access RSCOE Portal.
              </p>
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ankur Patil"
                  className={inputCls}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@jspm.edu.in"
                  className={inputCls}
                  required
                />
              </div>
            </div>

            {/* Department & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Department *
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className={inputCls}
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  User Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                  className={inputCls}
                >
                  <option value="STUDENT">Student</option>
                  <option value="TEACHER">Faculty Member</option>
                  <option value="HEAD">Department Head (HOD)</option>
                  <option value="SUPER_ADMIN">Super Administrator</option>
                </select>
              </div>
            </div>

            {/* Student-specific fields: Dual ID Verification, Year, Division */}
            {formData.role === 'STUDENT' && (
              <>
                {/* Dual ID Verification Container */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Hash className="h-3.5 w-3.5 text-blue-400" />
                      Roll Number / Student ID (PRN) *
                    </label>
                    {scannedBadge && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Scanned from ID Card
                      </span>
                    )}
                  </div>

                  {/* Dual Verification Method Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Option 1: Scan ID */}
                    <button
                      type="button"
                      onClick={() => setScannerOpen(true)}
                      className="flex items-center justify-center gap-2 p-2 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-400 text-xs font-semibold transition-all group"
                    >
                      <ScanLine className="h-4 w-4 group-hover:scale-110 transition-transform" />
                      <span>Option 1: Scan ID Card</span>
                    </button>

                    {/* Option 2: Manual Entry Indicator */}
                    <div className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-slate-400 text-xs font-medium">
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Option 2: Manual Entry</span>
                    </div>
                  </div>

                  {/* Roll Number Input (Manual Entry) */}
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.rollNumber}
                      onChange={(e) => {
                        setFormData({ ...formData, rollNumber: e.target.value.toUpperCase() });
                        setScannedBadge(false);
                      }}
                      placeholder="e.g. COMP2021089 or RBT25CS173"
                      className={`${inputCls} font-mono uppercase tracking-widest`}
                      required
                    />
                  </div>
                </div>

                {/* Year & Division */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Year of Study *
                    </label>
                    <select
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      className={inputCls}
                    >
                      {YEARS.map((y) => (
                        <option key={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Division *
                    </label>
                    <select
                      value={formData.division}
                      onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                      className={inputCls}
                    >
                      {DIVISIONS.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className={inputCls}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Non-student phone */}
            {formData.role !== 'STUDENT' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className={inputCls}
                />
              </div>
            )}

            {/* Complete Onboarding Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full gap-2 mt-2 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20 text-xs font-semibold py-2.5"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving Profile…
                </span>
              ) : (
                <>
                  Complete Onboarding & Access Portal
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </Modal>

      {/* ID Scanner Modal */}
      {scannerOpen && (
        <IdScannerModal
          onScanSuccess={handleScanSuccess}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </>
  );
};
