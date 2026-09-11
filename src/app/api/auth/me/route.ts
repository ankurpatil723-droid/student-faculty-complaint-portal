import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth/security';
import { findUserById } from '@/lib/auth/user-store';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('rscoe_session')?.value || req.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized. No active session token found.' },
      { status: 401 }
    );
  }

  const session = verifySessionToken(token);
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized. Session token expired or invalid.' },
      { status: 401 }
    );
  }

  const user = findUserById(session.userId);
  if (!user) {
    return NextResponse.json(
      { error: 'User account no longer exists.' },
      { status: 404 }
    );
  }

  const { passwordHash, ...sanitizedUser } = user;

  return NextResponse.json({
    authenticated: true,
    user: sanitizedUser,
  });
}
