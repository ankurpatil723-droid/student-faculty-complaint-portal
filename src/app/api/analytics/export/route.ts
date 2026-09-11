import { NextRequest, NextResponse } from 'next/server';
import { getSession, unauthorized, forbidden } from '@/lib/api-helpers';
import { exportAnalyticsCSV, filterComplaints, AnalyticsFilter } from '@/lib/analytics-service';
import { getAllComplaints } from '@/lib/complaint-store';
import type { CategoryType, Priority } from '@/lib/types';

export async function GET(req: NextRequest) {
  const auth = getSession(req);
  if (!auth) return unauthorized();

  const { session } = auth;
  if (!['HEAD', 'ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
    return forbidden('Only Head and Admin accounts can export report data.');
  }

  const url = new URL(req.url);
  const format = url.searchParams.get('format') || 'csv';

  const filter: AnalyticsFilter = {
    startDate: url.searchParams.get('startDate') || undefined,
    endDate: url.searchParams.get('endDate') || undefined,
    department: url.searchParams.get('department') || undefined,
    category: (url.searchParams.get('category') as CategoryType | 'ALL') || undefined,
    priority: (url.searchParams.get('priority') as Priority | 'ALL') || undefined,
  };

  if (session.role === 'HEAD' && !filter.department) {
    filter.department = session.department;
  }

  const timestamp = new Date().toISOString().split('T')[0];

  if (format === 'json') {
    const rawComplaints = getAllComplaints();
    const dataset = filterComplaints(rawComplaints, filter);

    return new NextResponse(JSON.stringify({ exportDate: new Date().toISOString(), filter, recordCount: dataset.length, data: dataset }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="rscoe-grievance-report-${timestamp}.json"`,
      },
    });
  }

  const csvContent = exportAnalyticsCSV(filter);

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="rscoe-grievance-report-${timestamp}.csv"`,
    },
  });
}
