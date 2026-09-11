'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { GraduationCap, UserCheck, Lock, ShieldCheck, ArrowRight, Eye, EyeOff, AlertCircle, KeyRound, CheckCircle2, ScanLine } from 'lucide-react';
import nextDynamic from 'next/dynamic';

// Extend Window to include Google Identity Services globals
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
    handleCredentialResponse?: (response: { credential: string }) => void;
    handleGoogleSignIn?: (response: { credential: string }) => void;
  }
}

const IdScannerModal = nextDynamic(() => import('@/components/ui/IdScannerModal'), { ssr: false });
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { Role } from '@/lib/types';
import { OnboardingModal, OnboardingAccount } from '@/components/shared/OnboardingModal';

type TabRole = 'STUDENT' | 'TEACHER' | 'HEAD' | 'SUPER_ADMIN';

const DEPARTMENTS = [
  'Computer Engineering',
  'Information Technology',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electronics & Telecommunication',
  'Administration',
];

const DEMO_PROFILES: Record<TabRole, { name: string; email: string; department: string; rollNumber?: string; year?: string; division?: string; designation?: string; phone: string; password: string; dest: string }> = {
  STUDENT: {
    name: 'Ganesh Patil',
    email: 'ganesh.patil.comp@jspm.edu.in',
    department: 'Computer Engineering',
    rollNumber: 'COMP2021089',
    year: 'Third Year',
    division: 'B',
    phone: '+91 98765 43210',
    password: 'Password@123',
    dest: '/student/dashboard',
  },
  TEACHER: {
    name: 'Prof. Anil Kadam',
    email: 'anil.kadam.comp@jspm.org',
    department: 'Computer Engineering',
    designation: 'Assistant Professor',
    phone: '+91 98220 11223',
    password: 'Password@123',
    dest: '/teacher/dashboard',
  },
  HEAD: {
    name: 'Dr. Suresh Mane',
    email: 'hod.computer@jspm.edu.in',
    department: 'Computer Engineering',
    designation: 'Head of Department (Computer)',
    phone: '+91 94225 99887',
    password: 'Password@123',
    dest: '/admin/dashboard',
  },
  SUPER_ADMIN: {
    name: 'Dr. Rajesh Deshmukh',
    email: 'principal@jspm.edu.in',
    department: 'Administration',
    designation: 'Principal & Super Administrator',
    phone: '+91 90110 00001',
    password: 'Password@123',
    dest: '/admin/dashboard',
  },
};

const TAB_ICON: Record<TabRole, React.ReactNode> = {
  STUDENT: <GraduationCap className="h-4 w-4" />,
  TEACHER: <UserCheck className="h-4 w-4" />,
  HEAD: <Lock className="h-4 w-4" />,
  SUPER_ADMIN: <ShieldCheck className="h-4 w-4" />,
};

const TAB_LABELS: Record<TabRole, string> = {
  STUDENT: 'Student',
  TEACHER: 'Faculty',
  HEAD: 'Department Head',
  SUPER_ADMIN: 'Super Admin',
};

export default function LoginPage() {
  const { loginApi, loginCustomUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabRole>('STUDENT');

  // Form states initialized with role defaults
  const [name, setName] = useState(DEMO_PROFILES.STUDENT.name);
  const [email, setEmail] = useState(DEMO_PROFILES.STUDENT.email);
  const [department, setDepartment] = useState(DEMO_PROFILES.STUDENT.department);
  const [rollNumber, setRollNumber] = useState(DEMO_PROFILES.STUDENT.rollNumber || '');
  const [year, setYear] = useState(DEMO_PROFILES.STUDENT.year || 'Third Year');
  const [division, setDivision] = useState(DEMO_PROFILES.STUDENT.division || 'B');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState(DEMO_PROFILES.STUDENT.phone);
  const [password, setPassword] = useState(DEMO_PROFILES.STUDENT.password);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetModal, setResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [scannerModal, setScannerModal] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<OnboardingAccount | null>(null);

  // Helper function to decode Google JWT token
  const parseJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  };

  const getDestinationForRole = (role: string) => {
    if (role === 'TEACHER') return '/teacher/dashboard';
    if (role === 'HEAD' || role === 'SUPER_ADMIN' || role === 'ADMIN') return '/admin/dashboard';
    return '/student/dashboard';
  };

  // ── Real Google Identity Services ────────────────────────────────────────────
  const handleGoogleSignIn = useCallback(
    async (response: { credential: string }) => {
      setGoogleLoading(true);
      setError('');
      try {
        const responsePayload = parseJwt(response.credential);
        const gEmail = responsePayload?.email || email;
        const gName = responsePayload?.name || name;

        // 1. Save user info to local storage
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("userEmail", gEmail);
        localStorage.setItem("userName", gName);
        
        const effectiveRole = activeTab === 'HEAD' ? 'HEAD' : (activeTab as Role);
        localStorage.setItem("userRole", effectiveRole);

        // Pre-fill form fields with Google data
        const emailInput = document.querySelector("input[type='email']") as HTMLInputElement | null;
        if (emailInput && gEmail) {
          emailInput.value = gEmail;
          setEmail(gEmail);
        }

        const nameInput = document.querySelector("input[placeholder*='Name']") as HTMLInputElement | null;
        if (nameInput && gName) {
          nameInput.value = gName;
          setName(gName);
        }

        // Provision user locally in session state
        const userProfile = {
          name: gName || gEmail.split('@')[0],
          email: gEmail,
          role: effectiveRole,
          department: department || 'Computer Engineering',
          rollNumber: effectiveRole === 'STUDENT' ? rollNumber || `COMP${Math.floor(2021000 + Math.random() * 9000)}` : undefined,
          year: effectiveRole === 'STUDENT' ? year : undefined,
          division: effectiveRole === 'STUDENT' ? division : undefined,
          phone: phone || '+91 98765 43210',
        };

        loginCustomUser(userProfile);

        // Send token to backend session endpoint to set HttpOnly session cookie
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: response.credential,
            role: effectiveRole,
            email: gEmail,
            name: gName,
          }),
        });

        const data = await res.json().catch(() => ({}));
        const targetUrl = data.destination || getDestinationForRole(effectiveRole);
        
        // Explicitly forward to dashboard
        window.location.replace(targetUrl);
      } catch (err: any) {
        setError(err.message || 'Google sign-in error.');
        setGoogleLoading(false);
      }
    },
    [activeTab, department, rollNumber, year, division, phone, email, name, loginCustomUser]
  );

  // Register the callback globally and initialise GIS each time the tab changes
  useEffect(() => {
    window.handleCredentialResponse = handleGoogleSignIn;
    window.handleGoogleSignIn = handleGoogleSignIn;

    const initGIS = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: '785540442631-e1skfp8a6vcfv0rdqtnhi79d9bbnebl4.apps.googleusercontent.com',
        callback: handleGoogleSignIn,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      const btnEl = document.getElementById('google-signin-btn');
      if (btnEl) {
        window.google.accounts.id.renderButton(btnEl, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: btnEl.offsetWidth || 380,
        });
      }
    };

    if (window.google?.accounts?.id) {
      initGIS();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGIS();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [handleGoogleSignIn]);

  const handleTabChange = (tab: TabRole) => {
    setActiveTab(tab);
    const demo = DEMO_PROFILES[tab];
    setName(demo.name);
    setEmail(demo.email);
    setDepartment(demo.department);
    setRollNumber(demo.rollNumber || '');
    setYear(demo.year || 'Third Year');
    setDivision(demo.division || 'B');
    setDesignation(demo.designation || '');
    setPhone(demo.phone);
    setPassword(demo.password);
    setError('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide your email address and password.');
      return;
    }

    setError('');
    setLoading(true);

    const effectiveRole = activeTab === 'HEAD' ? 'HEAD' : (activeTab as Role);
    const destination = getDestinationForRole(effectiveRole);

    try {
      // 1. Attempt standard authentication (/api/auth/login)
      const res = await loginApi(email.trim().toLowerCase(), password, effectiveRole);

      if (res.success && res.user) {
        window.location.replace(destination);
        return;
      }

      // 2. Fallback session provisioning for custom profiles
      const userProfile = {
        name: name.trim() || email.split('@')[0],
        email: email.trim().toLowerCase(),
        role: effectiveRole,
        department: department.trim(),
        rollNumber: effectiveRole === 'STUDENT' ? rollNumber.trim() || `COMP${Math.floor(2021000 + Math.random() * 9000)}` : undefined,
        year: effectiveRole === 'STUDENT' ? year : undefined,
        division: effectiveRole === 'STUDENT' ? division : undefined,
        designation: effectiveRole !== 'STUDENT' ? (designation.trim() || (effectiveRole === 'TEACHER' ? 'Assistant Professor' : 'Department Head')) : undefined,
        phone: phone.trim() || '+91 98765 43210',
      };

      loginCustomUser(userProfile);

      await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: effectiveRole,
          email: userProfile.email,
          name: userProfile.name,
        }),
      }).catch(() => {});

      window.location.replace(destination);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during login.');
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (role: TabRole) => {
    setLoading(true);
    setError('');
    const demo = DEMO_PROFILES[role];
    const effectiveRole = role === 'HEAD' ? 'HEAD' : (role as Role);
    const destination = demo.dest || getDestinationForRole(effectiveRole);

    try {
      loginCustomUser({
        name: demo.name,
        email: demo.email,
        role: effectiveRole,
        department: demo.department,
        rollNumber: demo.rollNumber,
        year: demo.year,
        division: demo.division,
        designation: demo.designation,
        phone: demo.phone,
      });

      // Background cookie setup
      await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: effectiveRole, email: demo.email, name: demo.name }),
      }).catch(() => {});

      window.location.replace(destination);
    } catch (err: any) {
      setError('Quick login failed: ' + (err.message || 'Error'));
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      setResetMsg(data.message || 'Password reset link sent to your registered email address.');
    } catch (err) {
      setResetMsg('Password reset request initiated.');
    }
  };

  const tabColor =
    activeTab === 'SUPER_ADMIN'
      ? 'border-purple-500/30 text-purple-400 bg-purple-500/10'
      : activeTab === 'HEAD'
      ? 'border-amber-500/30 text-amber-400 bg-amber-500/10'
      : 'border-blue-500/30 text-blue-400 bg-blue-500/10';

  const inputCls =
    'w-full bg-slate-900/90 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all';

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#030712] via-[#020617] to-[#000000] flex flex-col items-center justify-start sm:justify-center p-4 py-8 sm:py-12 overflow-y-auto">
      {/* Background radial glow */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 h-96 w-96 bg-blue-600/10 blur-[130px] rounded-full" />

      {/* Logo Header */}
      <Link href="/" className="flex items-center gap-3.5 mb-6 group z-10">
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
          <p className="font-bold text-white text-lg sm:text-xl leading-tight">RSCOE Student Grievance & Complaint Portal</p>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">JSPM Rajarshi Shahu College of Engineering</p>
        </div>
      </Link>

      {/* Card */}
      <div className="w-full max-w-lg bg-slate-950/90 border border-slate-800/80 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden backdrop-blur-xl z-10">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-900">
          <h1 className="text-xl font-bold text-white">Portal Sign In</h1>
          <p className="text-xs text-slate-400 mt-1">Enter your details to log in to your account</p>
        </div>

        {/* Role Tabs */}
        <div className="grid grid-cols-4 border-b border-slate-900 bg-slate-900/40">
          {(['STUDENT', 'TEACHER', 'HEAD', 'SUPER_ADMIN'] as TabRole[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabChange(tab)}
              className={`flex items-center justify-center gap-1.5 py-3 px-1 text-xs font-semibold transition-all border-b-2 ${
                activeTab === tab
                  ? `${
                      tab === 'SUPER_ADMIN'
                        ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                        : tab === 'HEAD'
                        ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                        : 'border-blue-500 text-blue-400 bg-blue-500/10'
                    }`
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              {TAB_ICON[tab]}
              <span>{TAB_LABELS[tab]}</span>
            </button>
          ))}
        </div>

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="px-6 py-5 space-y-3.5">
          <div className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs ${tabColor}`}>
            {TAB_ICON[activeTab]}
            <span>
              {activeTab === 'STUDENT' && 'Student Login · Enter your full name, roll number, and college email.'}
              {activeTab === 'TEACHER' && 'Faculty Member Login · Enter your staff details and department.'}
              {activeTab === 'HEAD' && 'Department Head Login · Route case investigations and identity reveals.'}
              {activeTab === 'SUPER_ADMIN' && 'Super Administrator Login · Manage college security and RBAC.'}
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Full Name & Phone Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ganesh Patil"
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className={inputCls}
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-slate-400">Email Address *</label>
              {activeTab === 'STUDENT' && (
                <button
                  type="button"
                  onClick={() => setScannerModal(true)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 text-[10px] font-semibold transition-all"
                >
                  <ScanLine className="h-3 w-3" /> Scan ID Card
                </button>
              )}
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@jspm.edu.in"
              className={inputCls}
              required
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Department *</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className={inputCls}>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d} className="bg-slate-900 text-slate-200">{d}</option>
              ))}
            </select>
          </div>

          {/* Role specific inputs */}
          {activeTab === 'STUDENT' && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Roll Number</label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="COMP2021089"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Year</label>
                <select value={year} onChange={(e) => setYear(e.target.value)} className={inputCls}>
                  {['First Year', 'Second Year', 'Third Year', 'Fourth Year'].map((y) => (
                    <option key={y} value={y} className="bg-slate-900 text-slate-200">{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Division</label>
                <select value={division} onChange={(e) => setDivision(e.target.value)} className={inputCls}>
                  {['A', 'B', 'C', 'D'].map((div) => (
                    <option key={div} value={div} className="bg-slate-900 text-slate-200">{div}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {(activeTab === 'TEACHER' || activeTab === 'HEAD' || activeTab === 'SUPER_ADMIN') && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Designation</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder={
                  activeTab === 'TEACHER'
                    ? 'e.g. Assistant Professor'
                    : activeTab === 'HEAD'
                    ? 'e.g. Head of Department'
                    : 'Principal & Administrator'
                }
                className={inputCls}
              />
            </div>
          )}

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-400">Password</label>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setResetModal(true);
                }}
                className="text-[10px] text-slate-400 hover:text-blue-400 transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`${inputCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className={`w-full gap-2 mt-2 font-semibold shadow-lg rounded-xl py-2.5 ${
              activeTab === 'SUPER_ADMIN'
                ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20'
                : activeTab === 'HEAD'
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/25'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Logging in…
              </span>
            ) : (
              <>
                Sign In as {TAB_LABELS[activeTab]}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => handleQuickDemoLogin(activeTab)}
            className="w-full gap-2 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-semibold py-2 rounded-xl transition-all"
          >
            ⚡ 1-Click Demo Quick Login as {TAB_LABELS[activeTab]}
          </Button>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-950 px-2 text-slate-500">Or continue with</span>
            </div>
          </div>

          {/* Google Identity Services HTML-based button configuration */}
          <div className="w-full flex flex-col items-center gap-2">
            {googleLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="h-3.5 w-3.5 border-2 border-slate-500 border-t-white rounded-full animate-spin" />
                Verifying with Google…
              </div>
            )}
            <div
              id="g_id_onload"
              data-client_id="785540442631-e1skfp8a6vcfv0rdqtnhi79d9bbnebl4.apps.googleusercontent.com"
              data-callback="handleGoogleSignIn"
              data-auto_prompt="false"
            />
            <div
              id="google-signin-btn"
              className="g_id_signin w-full flex justify-center"
              data-type="standard"
              data-shape="rectangular"
              data-theme="filled_black"
              data-text="signin_with"
              data-size="large"
              data-width="100%"
              style={{ minHeight: 44 }}
            />
          </div>
        </form>
      </div>

      {/* Mandatory Onboarding & Dual ID Verification Modal */}
      <OnboardingModal
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        initialAccount={selectedAccount}
      />

      {/* ID Card Scanner Modal */}
      {scannerModal && (
        <IdScannerModal
          onScanSuccess={(prn, generatedEmail) => {
            const scannedName = `Student ${prn}`;
            setName(scannedName);
            setEmail(generatedEmail);
            setRollNumber(prn);
            loginCustomUser({
              name: scannedName,
              email: generatedEmail,
              role: 'STUDENT',
              department,
              rollNumber: prn,
              year,
              division,
              phone,
            });
            window.location.replace('/student/dashboard');
          }}
          onClose={() => setScannerModal(false)}
        />
      )}

      {/* Forgot Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reset Password</h3>
                <p className="text-xs text-slate-400">Request password reset token</p>
              </div>
            </div>

            {resetMsg ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{resetMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Registered Email</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="email@jspm.edu.in"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Generate Reset Token
                </Button>
              </form>
            )}

            <button
              onClick={() => {
                setResetModal(false);
                setResetMsg('');
              }}
              className="w-full mt-3 text-xs text-slate-500 hover:text-slate-300 py-1"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-slate-600">
        © 2026 JSPM RSCOE · Grievance Redressal Portal
      </p>
    </div>
  );
}
