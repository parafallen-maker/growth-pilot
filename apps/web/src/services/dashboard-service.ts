import { analyticsService } from '@/services/analytics-service';
import type { QueryBase } from '@/features/shared/types';

export const dashboardService = {
  query(params: QueryBase = {}) {
    return analyticsService.queryOverview(params);
  },
};
