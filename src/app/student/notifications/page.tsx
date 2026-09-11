'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/shared/navbar';
import { Sidebar } from '@/components/shared/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Bell, Info, CheckCircle2, AlertTriangle, XCircle, ArrowRight, Check } from 'lucide-react';
import { STUDENT_NOTIFICATIONS } from '@/lib/demo-data';
import type { Notification } from '@/lib/types';

const TYPE_ICON = {
  info:    <Info className="h-4 w-4 text-sky-400" />,
  success: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-400" />,
  error:   <XCircle className="h-4 w-4 text-rose-400" />,
};

const TYPE_BG = {
  info:    'border-sky-500/20 bg-sky-500/5',
  success: 'border-emerald-500/20 bg-emerald-500/5',
  warning: 'border-amber-500/20 bg-amber-500/5',
  error:   'border-rose-500/20 bg-rose-500/5',
};

export default function StudentNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(STUDENT_NOTIFICATIONS);

  const unread = notifications.filter(n => !n.read);
  const markAllRead = () => setNotifications(ns => ns.map(n => ({ ...n, read: true })));
  const markRead = (id: string) => setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));

  const grouped = notifications.reduce<Record<string, Notification[]>>((acc, n) => {
    const date = new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(n);
    return acc;
  }, {});

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      <Navbar userRole="STUDENT" userName="Ganesh Patil" notifCount={unread.length} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role="STUDENT" notifCount={unread.length} />
        <main className="flex-1 p-5 md:p-6 space-y-6 overflow-y-auto">
          <PageHeader
            title="Notifications"
            description={unread.length > 0 ? `${unread.length} unread notification${unread.length !== 1 ? 's' : ''}` : 'All caught up!'}
            action={
              unread.length > 0 ? (
                <Button variant="outline" size="sm" onClick={markAllRead} className="gap-2">
                  <Check className="h-3.5 w-3.5" /> Mark All Read
                </Button>
              ) : undefined
            }
          />

          <Card>
            <CardContent className="p-0">
              {notifications.length === 0 ? (
                <EmptyState
                  icon={<Bell className="h-7 w-7" />}
                  title="No notifications"
                  description="You're all caught up. New alerts about your complaints will appear here."
                />
              ) : (
                <div>
                  {Object.entries(grouped).map(([date, items]) => (
                    <div key={date}>
                      <div className="px-5 py-2 bg-slate-900/30 border-b border-slate-900">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{date}</span>
                      </div>
                      {items.map((notif) => (
                        <div
                          key={notif.id}
                          className={`flex items-start gap-4 px-5 py-4 border-b border-slate-900 last:border-0 transition-colors ${
                            !notif.read ? 'bg-slate-900/20' : ''
                          }`}
                        >
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${TYPE_BG[notif.type]}`}>
                            {TYPE_ICON[notif.type]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className={`text-sm font-semibold ${notif.read ? 'text-slate-300' : 'text-white'}`}>
                                  {notif.title}
                                  {!notif.read && (
                                    <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-blue-500 align-middle" />
                                  )}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{notif.message}</p>
                              </div>
                              <span className="text-[10px] text-slate-600 shrink-0">
                                {new Date(notif.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              {notif.complaintId && (
                                <Link href={`/student/complaints/${notif.complaintId}`}>
                                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1 text-blue-400">
                                    View Complaint <ArrowRight className="h-3 w-3" />
                                  </Button>
                                </Link>
                              )}
                              {!notif.read && (
                                <button
                                  onClick={() => markRead(notif.id)}
                                  className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                  Mark as read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
