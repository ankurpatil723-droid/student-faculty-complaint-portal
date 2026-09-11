import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth/security';
import { hasPermission } from '@/lib/auth/permissions';
import { searchComplaints } from '@/lib/complaint-store';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('rscoe_session')?.value || req.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized. Authentication token required.' },
      { status: 401 }
    );
  }

  const session = verifySessionToken(token);
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized. Invalid or expired session.' },
      { status: 401 }
    );
  }

  if (session.role === 'STUDENT' || session.role === 'TEACHER') {
    const result = searchComplaints({ complainantId: session.userId });
    return NextResponse.json({ role: session.role, complaints: result.complaints });
  }

  if (session.role === 'HEAD' || session.role === 'ADMIN') {
    if (!hasPermission(session.role, 'complaint:read_department')) {
      return NextResponse.json(
        { error: 'Forbidden. Insufficient department permissions.' },
        { status: 403 }
      );
    }
    const result = searchComplaints({});
    return NextResponse.json({
      role: session.role,
      department: session.department,
      complaints: result.complaints,
    });
  }

  if (session.role === 'SUPER_ADMIN') {
    const result = searchComplaints({});
    return NextResponse.json({
      role: session.role,
      complaints: result.complaints,
      allAccess: true,
    });
  }

  return NextResponse.json(
    { error: 'Forbidden. Unknown or unauthorized role.' },
    { status: 403 }
  );
}
