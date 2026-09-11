import { Role } from '@/lib/types';

export type Permission =
  | 'complaint:create'
  | 'complaint:read_own'
  | 'complaint:read_assigned'
  | 'complaint:read_department'
  | 'complaint:read_all'
  | 'complaint:assign'
  | 'complaint:update_status'
  | 'complaint:comment'
  | 'complaint:escalate'
  | 'identity:request_reveal'
  | 'identity:approve_reveal'
  | 'analytics:view'
  | 'users:manage'
  | 'system:audit_logs'
  | 'system:override';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  STUDENT: [
    'complaint:create',
    'complaint:read_own',
    'complaint:comment',
  ],
  TEACHER: [
    'complaint:create',
    'complaint:read_own',
    'complaint:read_assigned',
    'complaint:comment',
  ],
  HEAD: [
    'complaint:create',
    'complaint:read_own',
    'complaint:read_assigned',
    'complaint:read_department',
    'complaint:assign',
    'complaint:update_status',
    'complaint:comment',
    'complaint:escalate',
    'identity:request_reveal',
    'analytics:view',
    'users:manage',
  ],
  ADMIN: [
    'complaint:create',
    'complaint:read_own',
    'complaint:read_assigned',
    'complaint:read_department',
    'complaint:assign',
    'complaint:update_status',
    'complaint:comment',
    'complaint:escalate',
    'identity:request_reveal',
    'analytics:view',
    'users:manage',
  ],
  SUPER_ADMIN: [
    'complaint:create',
    'complaint:read_own',
    'complaint:read_assigned',
    'complaint:read_department',
    'complaint:read_all',
    'complaint:assign',
    'complaint:update_status',
    'complaint:comment',
    'complaint:escalate',
    'identity:request_reveal',
    'identity:approve_reveal',
    'analytics:view',
    'users:manage',
    'system:audit_logs',
    'system:override',
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const allowed = ROLE_PERMISSIONS[role] || [];
  return allowed.includes(permission);
}

export function canAccessRoute(role: Role, path: string): boolean {
  if (role === 'SUPER_ADMIN') return true;

  if (path.startsWith('/super-admin')) {
    return false;
  }

  if (path.startsWith('/admin')) {
    return role === 'HEAD' || role === 'ADMIN';
  }

  if (path.startsWith('/teacher')) {
    return role === 'TEACHER';
  }

  if (path.startsWith('/student')) {
    return role === 'STUDENT';
  }

  return true;
}
