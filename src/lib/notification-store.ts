import type { Notification, Role, NotificationType } from './types';
import { createAdminClient } from '@/lib/supabase/server';

export interface StoredNotification extends Notification {
  recipientRole?: Role;
  recipientId?: string;
  department?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id?: string): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

function mapDbNotificationToStored(row: {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  action_url?: string | null;
  complaint_id?: string | null;
  created_at: string;
}): StoredNotification {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: (row.type as NotificationType) || 'info',
    read: Boolean(row.is_read),
    createdAt: row.created_at,
    complaintId: row.complaint_id || undefined,
    recipientId: row.user_id,
  };
}

/**
 * Creates a notification for a targeted user or role and persists it to Supabase DB.
 */
export async function createNotification(input: {
  title: string;
  message: string;
  type: NotificationType;
  complaintId?: string;
  recipientRole?: Role;
  recipientId?: string;
  department?: string;
}): Promise<StoredNotification | null> {
  try {
    const adminClient = createAdminClient();
    const targetUserIds: string[] = [];

    if (input.recipientId && isValidUuid(input.recipientId)) {
      targetUserIds.push(input.recipientId);
    } else if (input.recipientRole) {
      let userQuery = adminClient
        .from('users')
        .select('id')
        .eq('role', input.recipientRole);

      if (input.department) {
        userQuery = userQuery.eq('department', input.department);
      }

      const { data: users, error: userError } = await userQuery;
      if (!userError && users && users.length > 0) {
        users.forEach((u) => {
          if (u.id && !targetUserIds.includes(u.id)) {
            targetUserIds.push(u.id);
          }
        });
      }
    }

    if (targetUserIds.length === 0) {
      console.warn(
        `[createNotification] No matching recipient user found for role: ${input.recipientRole}, id: ${input.recipientId}, dept: ${input.department}`
      );
      return null;
    }

    const rowsToInsert = targetUserIds.map((userId) => ({
      user_id: userId,
      title: input.title,
      message: input.message,
      type: input.type || 'info',
      is_read: false,
      complaint_id: isValidUuid(input.complaintId) ? input.complaintId : null,
    }));

    const { data, error } = await adminClient
      .from('notifications')
      .insert(rowsToInsert)
      .select('*');

    if (error) {
      console.error('[createNotification DB error]', error);
      return null;
    }

    console.log(
      `[NOTIFICATION CREATED IN DB] Count: ${data?.length || 0} | For Role: ${input.recipientRole || 'ALL'} | Dept: ${input.department || 'ALL'} | Title: "${input.title}"`
    );

    return data && data.length > 0 ? mapDbNotificationToStored(data[0]) : null;
  } catch (err) {
    console.error('[createNotification error]', err);
    return null;
  }
}

/**
 * Marks a single notification as read in DB. Returns true if updated.
 */
export async function markNotificationRead(id: string): Promise<boolean> {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .select('id');

    if (error) {
      console.error('[markNotificationRead DB error]', error);
      return false;
    }
    return Boolean(data && data.length > 0);
  } catch (err) {
    console.error('[markNotificationRead error]', err);
    return false;
  }
}

/**
 * Marks ALL notifications for a given user as read in DB.
 */
export async function markAllNotificationsRead(
  role: Role,
  userId: string,
  department?: string
): Promise<number> {
  try {
    const adminClient = createAdminClient();
    if (!isValidUuid(userId)) {
      return 0;
    }

    const { data, error } = await adminClient
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select('id');

    if (error) {
      console.error('[markAllNotificationsRead DB error]', error);
      return 0;
    }
    return data ? data.length : 0;
  } catch (err) {
    console.error('[markAllNotificationsRead error]', err);
    return 0;
  }
}

/**
 * Get notifications for a given user from DB.
 */
export async function getNotificationsForUser(
  role: Role,
  userId: string,
  department?: string
): Promise<StoredNotification[]> {
  try {
    const adminClient = createAdminClient();

    if (isValidUuid(userId)) {
      const { data, error } = await adminClient
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[getNotificationsForUser DB error]', error);
        return [];
      }
      return (data || []).map(mapDbNotificationToStored);
    }

    // Fallback: If userId is non-UUID, attempt role lookup
    let userQuery = adminClient.from('users').select('id').eq('role', role);
    if (department) {
      userQuery = userQuery.eq('department', department);
    }
    const { data: users } = await userQuery;
    const userIds = (users || []).map((u) => u.id).filter(Boolean);

    if (userIds.length === 0) return [];

    const { data, error } = await adminClient
      .from('notifications')
      .select('*')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getNotificationsForUser role-fallback error]', error);
      return [];
    }
    return (data || []).map(mapDbNotificationToStored);
  } catch (err) {
    console.error('[getNotificationsForUser error]', err);
    return [];
  }
}

/**
 * Get all notifications from DB.
 */
export async function getAllNotifications(): Promise<StoredNotification[]> {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapDbNotificationToStored);
  } catch (err) {
    console.error('[getAllNotifications error]', err);
    return [];
  }
}
