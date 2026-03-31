'use client';

import Link from 'next/link';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
};

type ToastRecord = ToastInput & {
  id: string;
};

type ToastApi = {
  toast: (toast: ToastInput) => string;
  info: (toast: Omit<ToastInput, 'tone'>) => string;
  success: (toast: Omit<ToastInput, 'tone'>) => string;
  warning: (toast: Omit<ToastInput, 'tone'>) => string;
  danger: (toast: Omit<ToastInput, 'tone'>) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

function createToastId() {
  return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismiss = useMemo(
    () => (id: string) => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    },
    [],
  );

  const api = useMemo<ToastApi>(() => {
    const enqueue = (toast: ToastInput) => {
      const id = createToastId();
      setToasts((current) => {
        // Dedup: skip if same title+tone+description already exists
        const isDuplicate = current.some(
          (t) => t.title === toast.title && t.tone === (toast.tone ?? 'info') && t.description === toast.description,
        );
        if (isDuplicate) return current;
        return [...current, { ...toast, id }];
      });
      return id;
    };

    return {
      toast: enqueue,
      info: (toast) => enqueue({ ...toast, tone: 'info' }),
      success: (toast) => enqueue({ ...toast, tone: 'success' }),
      warning: (toast) => enqueue({ ...toast, tone: 'warning' }),
      danger: (toast) => enqueue({ ...toast, tone: 'danger' }),
      dismiss,
    };
  }, [dismiss]);

  useEffect(() => {
    if (!toasts.length) {
      return undefined;
    }

    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        dismiss(toast.id);
      }, toast.durationMs ?? 4200),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [dismiss, toasts]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" aria-live="polite" aria-relevant="additions removals">
        {toasts.map((toast) => {
          const toneClass = toast.tone ?? 'info';

          return (
            <article key={toast.id} className={`toast toast-${toneClass}`}>
              <div className="toast-copy">
                <strong>{toast.title}</strong>
                {toast.description ? <p>{toast.description}</p> : null}
              </div>
              <div className="toast-actions">
                {toast.actionHref ? (
                  <Link className="btn" href={toast.actionHref} onClick={() => dismiss(toast.id)}>
                    {toast.actionLabel ?? '查看'}
                  </Link>
                ) : toast.onAction ? (
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      toast.onAction?.();
                      dismiss(toast.id);
                    }}
                  >
                    {toast.actionLabel ?? '执行'}
                  </button>
                ) : null}
                <button className="btn ghost" type="button" onClick={() => dismiss(toast.id)} aria-label="关闭通知">
                  关闭
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);

  if (!value) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return value;
}
