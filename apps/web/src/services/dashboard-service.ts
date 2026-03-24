import type { QueryBase } from '@/features/shared/types';

export const dashboardService = {
  query(_params: QueryBase = {}) {
    return {
      metrics: [
        { label: '在读学生数', value: '268', hint: '较上周 +12' },
        { label: '待复核作业', value: '34', hint: '高优先级 8 条' },
        { label: '本周未发周报', value: '11', hint: '建议周四前清零' },
        { label: '本月应收', value: '¥182,400', hint: '到账率 76%' },
      ],
    };
  },
};
