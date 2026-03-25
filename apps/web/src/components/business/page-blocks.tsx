import type { AsyncState } from '@/features/shared/types';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '@/components/business/page-states';
export {
  ChartPanel,
  DataTable,
  FilterBar,
  MetricGrid,
  PageHeader,
  SummaryPanel,
  TabStrip,
  TimelinePanel,
} from '@growthpilot/ui/page-primitives';

export function StateBlock({ state, title, actionLabel = '重试' }: { state: AsyncState; title: string; actionLabel?: string }) {
  if (state === 'loading') {
    return <LoadingState title={title} />;
  }

  if (state === 'empty') {
    return <EmptyState title={title} actionLabel="创建首条数据" actionHref="#" />;
  }

  if (state === 'error') {
    return <ErrorState title={title} actionLabel={actionLabel} traceId="req-web-wave1" code="SYS_500" />;
  }

  if (state === 'forbidden') {
    return <ForbiddenState title={title} />;
  }

  return null;
}
