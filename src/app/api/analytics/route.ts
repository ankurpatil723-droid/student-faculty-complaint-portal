import { NextRequest, NextResponse } from 'next/server';
import { getSession, unauthorized, forbidden } from '@/lib/api-helpers';
import { calculateAnalytics, AnalyticsFilter } from '@/lib/analytics-service';
import type { CategoryType, Priority } from '@/lib/types';

export async function GET(req: NextRequest) {
  const auth = getSession(req);
  if (!auth) return unauthorized();

  const { session } = auth;
  // RBAC guard: Only HEAD, ADMIN, SUPER_ADMIN
  if (!['HEAD', 'ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
    return forbidden('Only Head and Admin accounts can view system analytics.');
  }

  const url = new URL(req.url);
  const filter: AnalyticsFilter = {
    startDate: url.searchParams.get('startDate') || undefined,
    endDate: url.searchParams.get('endDate') || undefined,
    department: url.searchParams.get('department') || undefined,
    category: (url.searchParams.get('category') as CategoryType | 'ALL') || undefined,
    priority: (url.searchParams.get('priority') as Priority | 'ALL') || undefined,
  };

  // If HOD (HEAD) without explicit department override, scope analytics to their department
  if (session.role === 'HEAD' && !filter.department) {
    filter.department = session.department;
  }

  const analytics = calculateAnalytics(filter);

  return NextResponse.json({
    filter,
    analytics,
  });
}
