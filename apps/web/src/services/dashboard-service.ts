import type { QueryBase } from '@/features/shared/types';
import { analyticsService } from '@/services/analytics-service';

export const dashboardService = {
  query(params: QueryBase = {}) {
    return analyticsService.queryOverview(params);
  },
};
