'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/business/toast-provider';

type QueryStatusToastProps = {
  successKeys?: string[];
  errorKeys?: string[];
  warningKeys?: string[];
};

function buildDescription(key: string, value: string) {
  if (key === 'error') return decodeURIComponent(value);
  return value;
}

export function QueryStatusToast({
  successKeys = ['created', 'generated', 'reviewed', 'published', 'updated'],
  errorKeys = ['error'],
  warningKeys = [],
}: QueryStatusToastProps) {
  const params = useSearchParams();
  const toast = useToast();
  const shown = useRef<string>('');

  useEffect(() => {
    const current = params.toString();
    if (!current || shown.current === current) return;

    for (const key of errorKeys) {
      const value = params.get(key);
      if (value) {
        toast.danger({ title: '操作失败', description: buildDescription(key, value) });
        shown.current = current;
        return;
      }
    }

    for (const key of warningKeys) {
      const value = params.get(key);
      if (value) {
        toast.warning({ title: '请关注', description: buildDescription(key, value) });
        shown.current = current;
        return;
      }
    }

    for (const key of successKeys) {
      const value = params.get(key);
      if (value) {
        toast.success({ title: '操作成功', description: buildDescription(key, value) });
        shown.current = current;
        return;
      }
    }
  }, [errorKeys, params, successKeys, toast, warningKeys]);

  return null;
}
