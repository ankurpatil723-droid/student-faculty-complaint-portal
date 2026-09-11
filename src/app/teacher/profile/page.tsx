'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/shared/navbar';
import { Sidebar } from '@/components/shared/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { User as UserIcon, Mail, Phone, Building, Calendar, Briefcase, Edit3, Save, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function TeacherProfilePage() {
  const { user, updateUserProfile } = useAuth();
  const teacher = user;

  const [isEditing, setIsEditing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: teacher.name || '',
    email: teacher.email || '',
    designation: teacher.designation || 'Assistant Professor',
    department: teacher.department || 'Computer Engineering',
    phone: teacher.phone || '',
  });

  useEffect(() => {
    setFormData({
      name: teacher.name || '',
      email: teacher.email || '',
      designation: teacher.designation || 'Assistant Professor',
      department: teacher.department || 'Computer Engineering',
      phone: teacher.phone || '',
    });
  }, [teacher]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile(formData);
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const fields = [
    { label: 'Full Name', value: teacher.name, icon: <UserIcon className="h-3.5 w-3.5" /> },
    { label: 'Designation', value: teacher.designation ?? '—', icon: <Briefcase className="h-3.5 w-3.5" /> },
    { label: 'Email Address', value: teacher.email, icon: <Mail className="h-3.5 w-3.5" /> },
    { label: 'Department', value: teacher.department, icon: <Building className="h-3.5 w-3.5" /> },
    { label: 'Phone Number', value: teacher.phone ?? '—', icon: <Phone className="h-3.5 w-3.5" /> },
    {
      label: 'Account Created',
      value: new Date(teacher.joinedAt || Date.now()).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      icon: <Calendar className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Navbar userRole="TEACHER" notifCount={1} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role="TEACHER" />
        <main className="flex-1 p-5 md:p-6 space-y-6 overflow-y-auto">
          <PageHeader title="My Profile" description="Verified faculty account details" />

          {savedSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Faculty profile updated successfully!</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="flex flex-col items-center justify-center p-6 text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-3xl font-black mb-4 shadow-lg shadow-purple-500/20">
                {teacher.name ? teacher.name.charAt(0) : 'T'}
              </div>
              <p className="font-bold text-white text-lg">{teacher.name}</p>
              <p className="text-xs text-purple-400 mt-1">{teacher.designation}</p>
              <p className="text-xs text-slate-500 mt-0.5">{teacher.department}</p>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="border-b border-slate-900 pb-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-purple-400" /> Staff Information
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-xs gap-1.5 border-slate-800 hover:bg-slate-900"
                >
                  {isEditing ? (
                    <>
                      <X className="h-3.5 w-3.5" /> Cancel Edit
                    </>
                  ) : (
                    <>
                      <Edit3 className="h-3.5 w-3.5" /> Edit Profile
                    </>
                  )}
                </Button>
              </CardHeader>
              <CardContent className="pt-5 space-y-4">
                {isEditing ? (
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Full Name</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Designation</label>
                        <input
                          type="text"
                          value={formData.designation}
                          onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email Address</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Department</label>
                        <select
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                        >
                          <option>Computer Engineering</option>
                          <option>Information Technology</option>
                          <option>Mechanical Engineering</option>
                          <option>Civil Engineering</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Phone Number</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+91 98765 43210"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button type="submit" size="sm" className="gap-2 bg-purple-600 hover:bg-purple-500">
                        <Save className="h-4 w-4" /> Save Profile Changes
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {fields.map((field, i) => (
                      <div key={i}>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-1.5">
                          {field.icon} {field.label}
                        </label>
                        <div className="bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-300">
                          {field.value}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
