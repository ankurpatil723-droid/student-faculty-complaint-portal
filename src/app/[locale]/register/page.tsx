'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

const DEPARTMENTS = [
  'Computer Engineering',
  'Information Technology',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electronics & Telecommunication',
  'Artificial Intelligence & Data Science',
];

export default function RegisterPage() {
  const { registerApi } = useAuth();
  const [form, setForm] = useState({
    name: '', email: '', role: 'STUDENT', department: 'Computer Engineering',
    designation: '', rollNumber: '', year: 'First Year', phone: '',
    password: '', confirmPassword: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Full name is required.';
    if (!form.email.includes('@')) e.email = 'Enter a valid email address.';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setApiError('');
    setLoading(true);

    const res = await registerApi({
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role,
      department: form.department,
      rollNumber: form.rollNumber,
      year: form.year,
      phone: form.phone,
    });

    setLoading(false);
    if (res.success) {
      setSubmitted(true);
    } else {
      setApiError(res.error || 'Registration failed.');
    }
  };

  const inputCls = (field: string) =>
    `w-full bg-slate-900 border rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors ${
      errors[field] ? 'border-rose-500' : 'border-slate-800'
    }`;

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Account Requested!</h1>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Your registration request has been submitted. An administrator will review and activate your account within 24 hours. You'll receive a confirmation email at <span className="text-blue-400">{form.email}</span>.
          </p>
          <Link href="/login">
            <Button className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black flex flex-col items-center justify-center p-4 py-12">
      <Link href="/" className="flex items-center gap-3.5 mb-8 group">
        <div className="relative h-14 w-14 sm:h-16 sm:w-16 flex items-center justify-center rounded-2xl bg-white p-1 shadow-xl shadow-blue-500/20 group-hover:shadow-blue-500/35 transition-all overflow-hidden border border-slate-700">
          <Image
            src="/images/rscoe-logo.jpeg"
            alt="RSCOE Logo"
            width={64}
            height={64}
            className="h-full w-full object-contain"
            priority
          />
        </div>
        <div>
          <p className="font-bold text-white text-lg sm:text-xl leading-tight">RSCOE Grievance Portal</p>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">Create your account</p>
        </div>
      </Link>

      <div className="w-full max-w-lg bg-slate-950/80 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-slate-900">
          <h1 className="text-xl font-bold text-white">Create Account</h1>
          <p className="text-sm text-slate-400 mt-1">Fill in your details to request portal access</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          {/* Role Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">Account Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['STUDENT', 'TEACHER', 'ADMIN'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => set('role', r)}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                    form.role === r
                      ? 'bg-blue-600/10 border-blue-500/40 text-blue-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {r === 'TEACHER' ? 'Faculty' : r === 'ADMIN' ? 'HOD/Admin' : 'Student'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Full Name *</label>
              <input id="reg-name" value={form.name} onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Ganesh Patil" className={inputCls('name')} />
              {errors.name && <p className="text-[10px] text-rose-400 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Phone Number</label>
              <input id="reg-phone" value={form.phone} onChange={(e) => set('phone', e.target.value)}
                placeholder="+91 98765 43210" className={inputCls('phone')} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email Address *</label>
            <input id="reg-email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
              placeholder="your.name@jspm.edu.in" className={inputCls('email')} />
            {errors.email && <p className="text-[10px] text-rose-400 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Department *</label>
            <select value={form.department} onChange={(e) => set('department', e.target.value)} className={inputCls('department')}>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>

          {form.role === 'STUDENT' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Roll Number</label>
                <input value={form.rollNumber} onChange={(e) => set('rollNumber', e.target.value)}
                  placeholder="COMP2021089" className={inputCls('rollNumber')} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Year</label>
                <select value={form.year} onChange={(e) => set('year', e.target.value)} className={inputCls('year')}>
                  {['First Year', 'Second Year', 'Third Year', 'Fourth Year'].map((y) => <option key={y}>{y}</option>)}
                </select>
              </div>
            </div>
          )}

          {(form.role === 'TEACHER' || form.role === 'ADMIN') && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Designation</label>
              <input value={form.designation} onChange={(e) => set('designation', e.target.value)}
                placeholder="e.g. Assistant Professor" className={inputCls('designation')} />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Password *</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder="Min. 8 characters" className={`${inputCls('password')} pr-10`} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-[10px] text-rose-400 mt-1">{errors.password}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Confirm Password *</label>
              <input type="password" value={form.confirmPassword}
                onChange={(e) => set('confirmPassword', e.target.value)}
                placeholder="Re-enter password" className={inputCls('confirmPassword')} />
              {errors.confirmPassword && <p className="text-[10px] text-rose-400 mt-1">{errors.confirmPassword}</p>}
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full gap-2 mt-2">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting…
              </span>
            ) : (
              <>Create Account <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>

          <p className="text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
