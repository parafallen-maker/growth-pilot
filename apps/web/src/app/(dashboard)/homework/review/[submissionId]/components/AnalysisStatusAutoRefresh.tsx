'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

type AnalysisStatusResponse = {
  submissionId: string;
  aiStatus: string;
  reviewStatus: string;
  latestJob: {
    status?: string | null;
  } | null;
  latestAnalysis: {
    status?: string | null;
  } | null;
};

const ACTIVE_AI_STATUSES = new Set(['pending', 'running']);
const TERMINAL_AI_STATUSES = new Set(['ready', 'failed', 'skipped']);
const ACTIVE_JOB_STATUSES = new Set(['pending', 'waiting', 'queued', 'active', 'running', 'delayed']);

interface AnalysisStatusAutoRefreshProps {
  submissionId: string;
  initialAiStatus: string;
}

export function AnalysisStatusAutoRefresh({ submissionId, initialAiStatus }: AnalysisStatusAutoRefreshProps) {
  const router = useRouter();
  const lastAiStatusRef = useRef(initialAiStatus);

  useEffect(() => {
    lastAiStatusRef.current = initialAiStatus;
  }, [initialAiStatus]);

  useEffect(() => {
    if (!ACTIVE_AI_STATUSES.has(initialAiStatus)) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      if (cancelled) return;

      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        timeoutId = setTimeout(poll, 5000);
        return;
      }

      try {
        const response = await fetch(`/api/homework/submissions/${submissionId}/analysis-status`, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'same-origin',
        });

        if (!response.ok) throw new Error(`analysis-status ${response.status}`);
        const payload = (await response.json()) as AnalysisStatusResponse;
        const nextAiStatus = payload.aiStatus ?? lastAiStatusRef.current;
        const jobStatus = payload.latestJob?.status ?? null;
        const lastAiStatus = lastAiStatusRef.current;

        if (nextAiStatus !== lastAiStatus || TERMINAL_AI_STATUSES.has(nextAiStatus)) {
          lastAiStatusRef.current = nextAiStatus;
          router.refresh();
        }

        if (ACTIVE_AI_STATUSES.has(nextAiStatus) || (jobStatus && ACTIVE_JOB_STATUSES.has(jobStatus))) {
          timeoutId = setTimeout(poll, 5000);
        }
      } catch {
        timeoutId = setTimeout(poll, 8000);
      }
    };

    timeoutId = setTimeout(poll, 5000);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [initialAiStatus, router, submissionId]);

  return null;
}
