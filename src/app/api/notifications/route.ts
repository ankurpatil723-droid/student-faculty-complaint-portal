import { NextRequest, NextResponse } from 'next/server';
import { getSession, unauthorized, badRequest } from '@/lib/api-helpers';
import {
  getNotificationsForUser,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/notification-store';

export async function GET(req: NextRequest) {
  const auth = getSession(req);
  if (!auth) return unauthorized();
  const { session } = auth;

  const notifications = await getNotificationsForUser(session.role, session.userId, session.department);

  return NextResponse.json({
    success: true,
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
  });
}

/**
 * PATCH /api/notifications
 * Body: { id: string }        → mark single notification read
 * Body: { markAll: true }     → mark all read for this user
 */
export async function PATCH(req: NextRequest) {
  const auth = getSession(req);
  if (!auth) return unauthorized();
  const { session } = auth;

  const body = await req.json().catch(() => ({}));
  const { id, markAll } = body as { id?: string; markAll?: boolean };

  if (markAll) {
    const count = await markAllNotificationsRead(session.role, session.userId, session.department);
    const remaining = await getNotificationsForUser(session.role, session.userId, session.department);
    return NextResponse.json({
      success: true,
      markedRead: count,
      unreadCount: 0,
      notifications: remaining,
    });
  }

  if (!id) return badRequest('Provide either { id } to mark one read, or { markAll: true }.');

  const found = await markNotificationRead(id);
  if (!found) return NextResponse.json({ success: false, error: 'Notification not found.' }, { status: 404 });

  const updated = await getNotificationsForUser(session.role, session.userId, session.department);
  return NextResponse.json({
    success: true,
    unreadCount: updated.filter((n) => !n.read).length,
    notifications: updated,
  });
}
