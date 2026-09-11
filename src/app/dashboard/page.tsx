'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function DashboardRedirectPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // Check localStorage fallback
    const savedRole = localStorage.getItem('userRole') || user?.role || 'STUDENT';
    
    if (savedRole === 'TEACHER') {
      window.location.replace('/teacher/dashboard');
    } else if (savedRole === 'HEAD' || savedRole === 'SUPER_ADMIN' || savedRole === 'ADMIN') {
      window.location.replace('/admin/dashboard');
    } else {
      window.location.replace('/student/dashboard');
    }
  }, [user, isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center text-slate-400 text-sm">
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        Redirecting to dashboard…
      </div>
    </div>
  );
}
