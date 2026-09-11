import type { Notification, Role, NotificationType } from './types';
import { STUDENT_NOTIFICATIONS, ADMIN_NOTIFICATIONS } from './demo-data';

export interface StoredNotification extends Notification {
  recipientRole?: Role;
  recipientId?: string;
  department?: string;
}

// Persist across Next.js hot reloads (same pattern as complaint-store.ts)
const globalStore = globalThis as unknown as {
  __notifications?: StoredNotification[];
  __notifCounter?: number;
};

if (!globalStore.__notifications) {
  globalStore.__notifications = [
    ...STUDENT_NOTIFICATIONS.map((n) => ({ ...n, recipientRole: 'STUDENT' as Role, recipientId: 'usr-001' })),
    ...ADMIN_NOTIFICATIONS.map((n) => ({ ...n, recipientRole: 'HEAD' as Role, department: 'Computer Engineering' })),
  ];
  globalStore.__notifCounter = 100;
}

const notifications: StoredNotification[] = globalStore.__notifications;

function nextNotifId() {
  globalStore.__notifCounter = (globalStore.__notifCounter ?? 100) + 1;
  return `notif-${globalStore.__notifCounter}`;
}

/**
 * Creates a notification for a targeted user or role
 */
export function createNotification(input: {
  title: string;
  message: string;
  type: NotificationType;
  complaintId?: string;
  recipientRole?: Role;
  recipientId?: string;
  department?: string;
}): StoredNotification {
  const notif: StoredNotification = {
    id: nextNotifId(),
    title: input.title,
    message: input.message,
    type: input.type,
    read: false,
    createdAt: new Date().toISOString(),
    complaintId: input.complaintId,
    recipientRole: input.recipientRole,
    recipientId: input.recipientId,
    department: input.department,
  };

  notifications.unshift(notif);
  console.log(
    `[NOTIFICATION CREATED] For Role: ${input.recipientRole || 'ALL'} | Dept: ${input.department || 'ALL'} | Title: "${input.title}" | Complaint: ${input.complaintId || 'N/A'}`
  );
  return notif;
}

/**
 * Marks a single notification as read. Returns true if found.
 */
export function markNotificationRead(id: string): boolean {
  const notif = notifications.find((n) => n.id === id);
  if (!notif) return false;
  notif.read = true;
  return true;
}

/**
 * Marks ALL notifications for a given user/role as read.
 */
export function markAllNotificationsRead(role: Role, userId: string, department?: string): number {
  const targets = getNotificationsForUser(role, userId, department).filter((n) => !n.read);
  targets.forEach((n) => { n.read = true; });
  return targets.length;
}

/**
 * Get notifications relevant for a given user role & department
 */
export function getNotificationsForUser(role: Role, userId: string, department?: string): StoredNotification[] {
  return notifications.filter((n) => {
    if (n.recipientId && n.recipientId === userId) return true;
    if (n.recipientRole === role) {
      if (!n.department || !department || n.department.toLowerCase() === department.toLowerCase()) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Get all notifications
 */
export function getAllNotifications(): StoredNotification[] {
  return [...notifications];
}
