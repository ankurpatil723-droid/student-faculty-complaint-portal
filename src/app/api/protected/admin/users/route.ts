import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth/security';
import { hasPermission } from '@/lib/auth/permissions';
import { getAllUsers } from '@/lib/auth/user-store';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('rscoe_session')?.value || req.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized. Authentication required.' },
      { status: 401 }
    );
  }

  const session = verifySessionToken(token);
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized. Invalid or expired token.' },
      { status: 401 }
    );
  }

  // Server-side explicit permission check
  if (!hasPermission(session.role, 'users:manage')) {
    return NextResponse.json(
      { error: 'Forbidden. Role escalation attempt blocked. Requires HEAD or SUPER_ADMIN authorization.' },
      { status: 403 }
    );
  }

  const users = getAllUsers();
  return NextResponse.json({
    authorizedRole: session.role,
    users,
  });
}
