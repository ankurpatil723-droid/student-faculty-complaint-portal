'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  Building, 
  Hash, 
  GraduationCap, 
  Layers, 
  CheckCircle2, 
  Edit3, 
  Save, 
  X,
  Sparkles
} from 'lucide-react';

interface StudentOnboardingCardProps {
  initialEditMode?: boolean;
}

export const StudentOnboardingCard: React.FC<StudentOnboardingCardProps> = ({ 
  initialEditMode = false 
}) => {
  const { user, updateUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    rollNumber: user?.rollNumber || '',
    department: user?.department || 'Computer Engineering',
    year: user?.year || 'Third Year',
    division: user?.division || 'A',
    phone: user?.phone || '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        rollNumber: user.rollNumber || '',
        department: user.department || 'Computer Engineering',
        year: user.year || 'Third Year',
        division: user.division || 'A',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile(formData);
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const isProfileComplete = Boolean(
    user?.name && user?.email && user?.rollNumber && user?.department && user?.year && user?.division
  );

  return (
    <Card className="border-slate-800 bg-slate-950/90 shadow-xl relative overflow-hidden">
      {/* Background glow accent */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-blue-600/10 blur-3xl" />

      <CardHeader className="border-b border-slate-900 pb-4 flex flex-row items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              Student Profile & Onboarding
              {!isProfileComplete && (
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Sparkles className="h-3 w-3" /> Complete Onboarding
                </span>
              )}
            </CardTitle>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified student registration details & editable information
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs gap-1.5 border-slate-800 hover:bg-slate-900 hover:text-white"
        >
          {isEditing ? (
            <>
              <X className="h-3.5 w-3.5" /> Cancel
            </>
          ) : (
            <>
              <Edit3 className="h-3.5 w-3.5" /> Edit Profile
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent className="pt-5 space-y-4">
        {savedSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-lg text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Profile details saved and updated across your active session!</span>
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Roll Number (PRN) *
                </label>
                <input
                  type="text"
                  value={formData.rollNumber}
                  onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                  placeholder="e.g. COMP2021089"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
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
                  className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Department *
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option>Computer Engineering</option>
                  <option>Information Technology</option>
                  <option>Mechanical Engineering</option>
                  <option>Civil Engineering</option>
                  <option>Electronics & Telecommunication</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Year of Study *
                </label>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option>First Year</option>
                  <option>Second Year</option>
                  <option>Third Year</option>
                  <option>Fourth Year</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Division *
                </label>
                <select
                  value={formData.division}
                  onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option>A</option>
                  <option>B</option>
                  <option>C</option>
                  <option>D</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button type="submit" size="sm" className="gap-2 bg-blue-600 hover:bg-blue-500 text-xs">
                <Save className="h-4 w-4" /> Save Profile Changes
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="text-xs text-slate-400"
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
                <UserIcon className="h-3.5 w-3.5 text-blue-400" /> Full Name
              </span>
              <p className="text-xs font-semibold text-white truncate">{user?.name || '—'}</p>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
                <Hash className="h-3.5 w-3.5 text-blue-400" /> Roll Number
              </span>
              <p className="text-xs font-semibold text-white">{user?.rollNumber || '—'}</p>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
                <Mail className="h-3.5 w-3.5 text-blue-400" /> Email Address
              </span>
              <p className="text-xs font-semibold text-white truncate">{user?.email || '—'}</p>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
                <Building className="h-3.5 w-3.5 text-blue-400" /> Department
              </span>
              <p className="text-xs font-semibold text-white truncate">{user?.department || '—'}</p>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
                <GraduationCap className="h-3.5 w-3.5 text-blue-400" /> Year & Division
              </span>
              <p className="text-xs font-semibold text-white">
                {user?.year || 'Third Year'} {user?.division ? `· Div ${user.division}` : ''}
              </p>
            </div>

            <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl">
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-1">
                <Phone className="h-3.5 w-3.5 text-blue-400" /> Phone Number
              </span>
              <p className="text-xs font-semibold text-white">{user?.phone || '—'}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
