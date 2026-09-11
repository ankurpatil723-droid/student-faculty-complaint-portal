'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Settings,
  ShieldAlert,
  History,
  Lock,
  PlusCircle,
  Bell,
  User,
  Menu,
  X,
  BarChart3,
  Users,
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface SidebarProps {
  role?: 'STUDENT' | 'TEACHER' | 'ADMIN';
  notifCount?: number;
}

const buildMenu = (role: 'STUDENT' | 'TEACHER' | 'ADMIN') => {
  const base = role === 'STUDENT' ? '/student' : role === 'TEACHER' ? '/teacher' : '/admin';
  const items = [
    { id: 'dashboard',     label: 'Dashboard',      icon: LayoutDashboard, href: `${base}/dashboard` },
    { id: 'complaints',    label: role === 'ADMIN' ? 'All Grievances' : 'My Grievances', icon: FileText, href: `${base}/complaints` },
    ...(role === 'STUDENT' ? [
      { id: 'new',         label: 'New Grievance',  icon: PlusCircle,      href: `${base}/complaints/new` },
    ] : []),
    ...(role === 'ADMIN' ? [
      { id: 'analytics',   label: 'Analytics',      icon: BarChart3,       href: `${base}/dashboard` },
      { id: 'users',       label: 'User Accounts',  icon: Users,           href: `${base}/dashboard` },
      { id: 'audit',       label: 'Audit Log',      icon: History,         href: `${base}/dashboard` },
      { id: 'privacy',     label: 'Privacy Audits', icon: Lock,            href: `${base}/dashboard` },
    ] : []),
    { id: 'notifications', label: 'Notifications',  icon: Bell,            href: `${base}/notifications` },
    { id: 'profile',       label: 'Profile',        icon: User,            href: `${base}/profile` },
  ];
  return items;
};

const RoleTag = ({ role }: { role: 'STUDENT' | 'TEACHER' | 'ADMIN' }) => {
  const map = {
    STUDENT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    TEACHER: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    ADMIN:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };
  const label = role === 'STUDENT' ? 'Student Portal' : role === 'TEACHER' ? 'Faculty Portal' : 'HOD Admin Panel';
  return (
    <span className={twMerge('text-[10px] font-bold px-2 py-0.5 rounded-full border tracking-wide', map[role])}>
      {label}
    </span>
  );
};

const NavItem = ({ item, pathname }: { item: ReturnType<typeof buildMenu>[0]; pathname: string }) => {
  const Icon = item.icon;
  const isActive = pathname === item.href || (item.id === 'dashboard' && pathname.endsWith('/dashboard'));
  return (
    <Link
      href={item.href}
      className={twMerge(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
};

export const Sidebar = ({ role = 'STUDENT', notifCount = 0 }: SidebarProps) => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menu = buildMenu(role);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-3 mb-4">
        <RoleTag role={role} />
      </div>
      <nav className="flex-1 space-y-1">
        {menu.map((item) => <NavItem key={item.id} item={item} pathname={pathname} />)}
      </nav>
      <div className="border-t border-slate-900 pt-4 mt-4">
        <div className="flex items-center gap-2 px-3 text-[10px] text-slate-500 font-semibold leading-normal">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-500/60" />
          <span>SLA Target: 7 Days Max Resolution</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed bottom-5 left-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 w-72 bg-slate-950 border-r border-slate-900 p-4 flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1.5 hover:bg-slate-900 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-6 mt-1 flex items-center gap-2.5">
              <div className="relative h-8 w-8 rounded-lg bg-white overflow-hidden p-0.5 shrink-0 shadow-md">
                <Image
                  src="/images/rscoe-logo.jpeg"
                  alt="RSCOE Logo"
                  width={32}
                  height={32}
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="font-bold text-white text-sm">RSCOE Portal</span>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-slate-900 bg-slate-950/40 p-4 shrink-0">
        <SidebarContent />
      </aside>
    </>
  );
};
