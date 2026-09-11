'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/shared/navbar';
import { Sidebar } from '@/components/shared/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { User as UserIcon, Mail, Phone, Building, Hash, Calendar, GraduationCap, Layers, CheckCircle2, Edit3, Save, X } from 'lucide-react';
import { DEMO_COMPLAINTS } from '@/lib/demo-data';
import { useAuth } from '@/context/AuthContext';
import { StudentOnboardingCard } from '@/components/shared/StudentOnboardingCard';

export default function StudentProfilePage() {
  const { user, updateUserProfile } = useAuth();
  const [showPassForm, setShowPassForm] = useState(false);
  const [passUpdated, setPassUpdated] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const student = user;
  const myComplaints = DEMO_COMPLAINTS.filter(c => c.complainantId === student.id || c.complainantId === 'usr-001');

  const [formData, setFormData] = useState({
    name: student.name || '',
    email: student.email || '',
    rollNumber: student.rollNumber || '',
    department: student.department || 'Computer Engineering',
    year: student.year || 'Third Year',
    division: student.division || 'A',
    phone: student.phone || '',
  });

  useEffect(() => {
    setFormData({
      name: student.name || '',
      email: student.email || '',
      rollNumber: student.rollNumber || '',
      department: student.department || 'Computer Engineering',
      year: student.year || 'Third Year',
      division: student.division || 'A',
      phone: student.phone || '',
    });
  }, [student]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile(formData);
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const fields = [
    { label: 'Full Name', value: student.name, icon: <UserIcon className="h-3.5 w-3.5" /> },
    { label: 'Roll Number', value: student.rollNumber ?? '—', icon: <Hash className="h-3.5 w-3.5" /> },
    { label: 'Email Address', value: student.email, icon: <Mail className="h-3.5 w-3.5" /> },
    { label: 'Department', value: student.department, icon: <Building className="h-3.5 w-3.5" /> },
    { label: 'Year of Study', value: student.year ?? '—', icon: <GraduationCap className="h-3.5 w-3.5" /> },
    { label: 'Division', value: student.division ?? '—', icon: <Layers className="h-3.5 w-3.5" /> },
    { label: 'Phone Number', value: student.phone ?? '—', icon: <Phone className="h-3.5 w-3.5" /> },
    { label: 'Account Created', value: new Date(student.joinedAt || Date.now()).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }), icon: <Calendar className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Navbar userRole="STUDENT" userName={student.name} notifCount={2} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role="STUDENT" />
        <main className="flex-1 p-5 md:p-6 space-y-6 overflow-y-auto">
          <PageHeader
            title="My Profile"
            description="Verified student account details and personal preferences"
          />

          {savedSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Profile information updated successfully!</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Avatar card */}
            <Card className="flex flex-col items-center justify-center p-6 text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-3xl font-black mb-4 shadow-lg shadow-blue-500/20">
                {student.name ? student.name.charAt(0) : 'S'}
              </div>
              <p className="font-bold text-white text-lg">{student.name}</p>
              <p className="text-xs text-blue-400 mt-1">{student.year} · Div {student.division}</p>
              <p className="text-xs text-slate-500 mt-0.5">{student.department}</p>
              <div className="grid grid-cols-3 gap-3 w-full mt-6 pt-5 border-t border-slate-900">
                {[
                  { label: 'Filed', value: myComplaints.length },
                  { label: 'Active', value: myComplaints.filter(c => !['RESOLVED','CLOSED'].includes(c.status)).length },
                  { label: 'Resolved', value: myComplaints.filter(c => ['RESOLVED','CLOSED'].includes(c.status)).length },
                ].map((s, i) => (
                  <div key={i} className="text-center">
                    <p className="text-lg font-black text-white">{s.value}</p>
                    <p className="text-[10px] text-slate-500">{s.label}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Profile Information Card */}
            <div className="lg:col-span-2">
              <StudentOnboardingCard />
            </div>

            {/* Password & Security */}
            <Card className="lg:col-span-3">
              <CardHeader className="border-b border-slate-900 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold">Password & Security</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowPassForm(!showPassForm)} className="text-xs">
                  {showPassForm ? 'Cancel' : 'Change Password'}
                </Button>
              </CardHeader>
              {showPassForm ? (
                <CardContent className="pt-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl">
                    {['Current Password', 'New Password', 'Confirm New Password'].map((label, i) => (
                      <div key={i}>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">{label}</label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                  <Button size="sm" className="mt-4" onClick={() => { setShowPassForm(false); setPassUpdated(true); setTimeout(() => setPassUpdated(false), 3000); }}>
                    Update Password
                  </Button>
                </CardContent>
              ) : (
                <CardContent className="pt-4 flex items-center justify-between">
                  <p className="text-xs text-slate-500">Your password was last changed on Aug 1, 2026.</p>
                  {passUpdated && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Password Updated
                    </span>
                  )}
                </CardContent>
              )}
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

