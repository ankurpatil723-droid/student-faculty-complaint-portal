import { getAllComplaints, StoredComplaint } from './complaint-store';
import type { ComplaintStatus, Priority, CategoryType } from './types';

export interface AnalyticsFilter {
  startDate?: string;
  endDate?: string;
  department?: string;
  category?: CategoryType | 'ALL';
  priority?: Priority | 'ALL';
}

export interface AgingComplaint {
  id: string;
  title: string;
  department: string;
  category: CategoryType;
  priority: Priority;
  status: ComplaintStatus;
  createdAt: string;
  daysOpen: number;
}

export interface MonthlyTrend {
  month: string;
  total: number;
  resolved: number;
  pending: number;
}

export interface ResolutionPerformance {
  targetSlaDays: number;
  resolvedCount: number;
  withinSlaCount: number;
  breachedSlaCount: number;
  slaComplianceRate: number;
}

export interface AnalyticsSummary {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  escalated: number;
  rejected: number;
  avgResolutionTimeHours: number;
  avgResolutionTimeDays: number;
  byCategory: Record<string, number>;
  byDepartment: Record<string, number>;
  byPriority: Record<string, number>;
  monthlyTrends: MonthlyTrend[];
  resolutionPerformance: ResolutionPerformance;
  agingComplaints: AgingComplaint[];
}

/**
 * Filter complaints in a single pass based on provided analytics filters.
 * Optimized for efficiency over large arrays of complaint records.
 */
export function filterComplaints(complaints: StoredComplaint[], filter: AnalyticsFilter): StoredComplaint[] {
  const startTs = filter.startDate ? new Date(filter.startDate).getTime() : 0;
  const endTs = filter.endDate ? new Date(filter.endDate).getTime() + 24 * 60 * 60 * 1000 - 1 : Infinity;

  return complaints.filter((c) => {
    const createdTs = new Date(c.createdAt).getTime();

    // Date range filter
    if (createdTs < startTs || createdTs > endTs) {
      return false;
    }

    // Department filter
    if (filter.department && filter.department !== 'ALL') {
      if (c.department.toLowerCase() !== filter.department.toLowerCase()) {
        return false;
      }
    }

    // Category filter
    if (filter.category && filter.category !== 'ALL') {
      if (c.category !== filter.category) {
        return false;
      }
    }

    // Priority filter
    if (filter.priority && filter.priority !== 'ALL') {
      if (c.priority !== filter.priority) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Computes comprehensive analytics and metrics using database queries over complaints.
 */
export function calculateAnalytics(filter: AnalyticsFilter = {}): AnalyticsSummary {
  const rawComplaints = getAllComplaints();
  const dataset = filterComplaints(rawComplaints, filter);

  let total = 0;
  let pending = 0;
  let inProgress = 0;
  let resolved = 0;
  let escalated = 0;
  let rejected = 0;

  const byCategory: Record<string, number> = {};
  const byDepartment: Record<string, number> = {};
  const byPriority: Record<string, number> = {};

  let totalResolutionTimeMs = 0;
  let resolvedWithDurationCount = 0;

  const targetSlaDays = 7;
  let withinSlaCount = 0;
  let breachedSlaCount = 0;

  const monthMap: Record<string, { total: number; resolved: number; pending: number }> = {};
  const agingList: AgingComplaint[] = [];
  const nowTs = Date.now();

  for (const c of dataset) {
    total += 1;

    // Status counts
    if (['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'REOPENED'].includes(c.status)) {
      pending += 1;
    } else if (c.status === 'IN_PROGRESS') {
      inProgress += 1;
    } else if (['RESOLVED', 'CLOSED'].includes(c.status)) {
      resolved += 1;
    } else if (c.status === 'ESCALATED') {
      escalated += 1;
    } else if (c.status === 'REJECTED') {
      rejected += 1;
    }

    // Categorization breakdowns
    byCategory[c.category] = (byCategory[c.category] || 0) + 1;
    byDepartment[c.department] = (byDepartment[c.department] || 0) + 1;
    byPriority[c.priority] = (byPriority[c.priority] || 0) + 1;

    // Resolution Time & SLA Metrics
    const createdTs = new Date(c.createdAt).getTime();
    const resolutionDateStr = c.resolvedAt || c.closedAt;

    if (['RESOLVED', 'CLOSED'].includes(c.status) && resolutionDateStr) {
      const resolvedTs = new Date(resolutionDateStr).getTime();
      const durationMs = Math.max(0, resolvedTs - createdTs);
      totalResolutionTimeMs += durationMs;
      resolvedWithDurationCount += 1;

      const durationDays = durationMs / (1000 * 60 * 60 * 24);
      if (durationDays <= targetSlaDays) {
        withinSlaCount += 1;
      } else {
        breachedSlaCount += 1;
      }
    }

    // Monthly Trend Bucketing (YYYY-MM)
    const dateObj = new Date(c.createdAt);
    const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap[monthKey]) {
      monthMap[monthKey] = { total: 0, resolved: 0, pending: 0 };
    }
    monthMap[monthKey].total += 1;
    if (['RESOLVED', 'CLOSED'].includes(c.status)) {
      monthMap[monthKey].resolved += 1;
    } else {
      monthMap[monthKey].pending += 1;
    }

    // Aging Complaints Calculation (open >= 7 days)
    if (!['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status)) {
      const daysOpen = Math.floor((nowTs - createdTs) / (1000 * 60 * 60 * 24));
      if (daysOpen >= 7) {
        agingList.push({
          id: c.id,
          title: c.title,
          department: c.department,
          category: c.category,
          priority: c.priority,
          status: c.status,
          createdAt: c.createdAt,
          daysOpen,
        });
      }
    }
  }

  // Sort Aging complaints by daysOpen descending
  agingList.sort((a, b) => b.daysOpen - a.daysOpen);

  // Format Monthly Trends array sorted chronologically
  const monthlyTrends: MonthlyTrend[] = Object.keys(monthMap)
    .sort()
    .map((month) => {
      const [year, m] = month.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthLabel = `${monthNames[parseInt(m, 10) - 1]} ${year}`;
      return {
        month: monthLabel,
        total: monthMap[month].total,
        resolved: monthMap[month].resolved,
        pending: monthMap[month].pending,
      };
    });

  // Calculate Average Resolution Time
  const avgResolutionTimeHours =
    resolvedWithDurationCount > 0
      ? Math.round((totalResolutionTimeMs / (1000 * 60 * 60 * resolvedWithDurationCount)) * 10) / 10
      : 0;

  const avgResolutionTimeDays =
    resolvedWithDurationCount > 0
      ? Math.round((totalResolutionTimeMs / (1000 * 60 * 60 * 24 * resolvedWithDurationCount)) * 10) / 10
      : 0;

  const totalSlaEvaluated = withinSlaCount + breachedSlaCount;
  const slaComplianceRate =
    totalSlaEvaluated > 0 ? Math.round((withinSlaCount / totalSlaEvaluated) * 1000) / 10 : 100;

  return {
    total,
    pending,
    inProgress,
    resolved,
    escalated,
    rejected,
    avgResolutionTimeHours,
    avgResolutionTimeDays,
    byCategory,
    byDepartment,
    byPriority,
    monthlyTrends,
    resolutionPerformance: {
      targetSlaDays,
      resolvedCount: resolvedWithDurationCount,
      withinSlaCount,
      breachedSlaCount,
      slaComplianceRate,
    },
    agingComplaints: agingList,
  };
}

/**
 * Formats filtered complaint dataset into CSV string for executive report download.
 */
export function exportAnalyticsCSV(filter: AnalyticsFilter = {}): string {
  const rawComplaints = getAllComplaints();
  const dataset = filterComplaints(rawComplaints, filter);

  const headers = [
    'Complaint ID',
    'Title',
    'Category',
    'Subcategory',
    'Priority',
    'Status',
    'Department',
    'Assigned To',
    'Is Anonymous',
    'Created At',
    'Updated At',
    'Resolved At',
  ];

  const escapeCsv = (str: string | undefined | null) => {
    if (!str) return '""';
    const clean = String(str).replace(/"/g, '""');
    return `"${clean}"`;
  };

  const rows = dataset.map((c) => [
    escapeCsv(c.id),
    escapeCsv(c.title),
    escapeCsv(c.category),
    escapeCsv(c.subcategory || 'N/A'),
    escapeCsv(c.priority),
    escapeCsv(c.status),
    escapeCsv(c.department),
    escapeCsv(c.assignedTo || 'Unassigned'),
    escapeCsv(c.isAnonymous ? 'Yes' : 'No'),
    escapeCsv(c.createdAt),
    escapeCsv(c.updatedAt),
    escapeCsv(c.resolvedAt || c.closedAt || 'N/A'),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
