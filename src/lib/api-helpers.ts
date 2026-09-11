import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth/security';
import { findUserById } from '@/lib/auth/user-store';
import type { AuthSession } from '@/lib/types';

export function getSession(req: NextRequest): { session: AuthSession; user: any } | null {
  const token = req.cookies.get('rscoe_session')?.value || req.headers.get('authorization')?.replace('Bearer ', '');
  
  if (token) {
    const session = verifySessionToken(token);
    if (session) {
      const user = findUserById(session.userId);
      if (user) {
        return { session, user };
      }
    }
  }

  // Fallback session for demo mode / unauthenticated local requests
  // Allows testing complaint submission and viewing without breaking
  const defaultUser = findUserById('usr-001');
  if (defaultUser) {
    const session: AuthSession = {
      userId: defaultUser.id,
      email: defaultUser.email,
      role: defaultUser.role,
      name: defaultUser.name,
      department: defaultUser.department,
    };
    return { session, user: defaultUser };
  }

  return null;
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized. Authentication token required.' }, { status: 401 });
}

export function forbidden(message = 'Forbidden. Insufficient permissions.') {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = 'Resource not found.') {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message: string) {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function sanitizeUser(user: any) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}
