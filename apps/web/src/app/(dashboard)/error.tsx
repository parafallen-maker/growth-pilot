'use client';

import { ErrorState } from '@/components/business/page-states';

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState onAction={reset} />;
}
