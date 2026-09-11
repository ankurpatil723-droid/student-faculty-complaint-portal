'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Bell, User, LogOut, ChevronDown, CheckCheck, AlertCircle, Info, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface StoredNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  complaintId?: string;
}

interface NavbarProps {
  userRole?: 'STUDENT' | 'TEACHER' | 'ADMIN';
  userName?: string;
  notifCount?: number;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  info: <Info className="h-3.5 w-3.5 text-blue-400" />,
  success: <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />,
  error: <AlertCircle className="h-3.5 w-3.5 text-rose-400" />,
};

export const Navbar = ({
  userRole: propRole,
  userName: propName,
}: NavbarProps) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();

  const userRole = user?.role || propRole || 'STUDENT';
  const userName = user?.name || propName || 'User';

  const roleLabel = userRole === 'STUDENT' ? 'Student' : userRole === 'TEACHER' ? 'Faculty' : 'HOD / Admin';
  const roleColor = userRole === 'STUDENT' ? 'text-blue-400' : userRole === 'TEACHER' ? 'text-purple-400' : 'text-amber-400';

  const notifHref =
    userRole === 'STUDENT' ? '/student/notifications' :
    userRole === 'TEACHER' ? '/teacher/notifications' :
    '/admin/notifications';

  const profileHref =
    userRole === 'STUDENT' ? '/student/profile' :
    userRole === 'TEACHER' ? '/teacher/profile' :
    '/admin/profile';

  // ── Fetch notifications from API ─────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // silently ignore — network may be unavailable
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close notif panel when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Mark all read ────────────────────────────────────────────────────────
  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(0);
    } catch {}
  };

  // ── Mark single read ─────────────────────────────────────────────────────
  const handleMarkRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {}
  };

  const recentNotifs = notifications.slice(0, 6);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-900 bg-slate-950/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Branding */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-white overflow-hidden p-0.5 shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
            <Image
              src="/images/rscoe-logo.jpeg"
              alt="RSCOE Logo"
              width={36}
              height={36}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="font-bold text-sm text-white tracking-wide leading-none">RSCOE Portal</span>
            <span className="text-[10px] text-slate-400 font-medium">JSPM Tathawade</span>
          </div>
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-1 md:gap-2">

          {/* ── Notification Bell with Dropdown ── */}
          <div className="relative" ref={notifRef}>
            <button
              id="notification-bell-btn"
              onClick={() => setNotifOpen((o) => !o)}
              className="relative p-2.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-white transition-all"
              aria-label={`Notifications — ${unreadCount} unread`}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-black text-white ring-2 ring-slate-950 animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification dropdown panel */}
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl shadow-black/60 z-50 overflow-hidden">
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-900">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-semibold text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="flex h-5 px-1.5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        title="Mark all as read"
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-400 transition-colors px-2 py-1 rounded hover:bg-slate-900"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        All read
                      </button>
                    )}
                    <button
                      onClick={() => setNotifOpen(false)}
                      className="p-1 text-slate-500 hover:text-white rounded hover:bg-slate-900 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Notification list */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-900">
                  {recentNotifs.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-500 text-sm">
                      No notifications yet
                    </div>
                  ) : (
                    recentNotifs.map((n) => (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-900/60 transition-colors cursor-pointer group ${!n.read ? 'bg-slate-900/30' : ''}`}
                        onClick={() => { if (!n.read) handleMarkRead(n.id); }}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {TYPE_ICON[n.type] || TYPE_ICON.info}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold leading-snug truncate ${!n.read ? 'text-white' : 'text-slate-300'}`}>
                            {n.title}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                            {n.message}
                          </p>
                          <p className="text-[10px] text-slate-600 mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                        {!n.read && (
                          <div className="flex-shrink-0 mt-1 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-slate-950" />
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Panel footer */}
                <div className="border-t border-slate-900 px-4 py-2.5">
                  <Link
                    href={notifHref}
                    onClick={() => setNotifOpen(false)}
                    className="block text-center text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                  >
                    View all notifications →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="hidden md:flex items-center gap-2.5 border border-slate-800 hover:border-slate-700 bg-slate-900/50 hover:bg-slate-900 rounded-lg pl-2 pr-3 py-2 transition-all"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold">
                {userName.charAt(0)}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-white leading-none">{userName}</span>
                <span className={`text-[10px] font-medium mt-0.5 ${roleColor}`}>{roleLabel}</span>
              </div>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Mobile avatar */}
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-bold"
            >
              {userName.charAt(0)}
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-900">
                    <p className="text-sm font-semibold text-white">{userName}</p>
                    <p className={`text-xs mt-0.5 ${roleColor}`}>{roleLabel}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href={profileHref}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
                    >
                      <User className="h-4 w-4" />
                      View Profile
                    </Link>
                    <Link
                      href={notifHref}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
                    >
                      <Bell className="h-4 w-4" />
                      Notifications
                      {unreadCount > 0 && (
                        <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-black text-white">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  </div>
                  <div className="border-t border-slate-900 py-1">
                    <Link
                      href="/"
                      onClick={() => {
                        setDropdownOpen(false);
                        logout();
                      }}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};


