/**
 * Generic EmptyState component (FI-06).
 * Centered, gray-toned, large emoji icon.
 */

'use client';

import Link from 'next/link';

type EmptyStateProps = {
  icon?: string;
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
};

export function EmptyState({
  icon = '📭',
  title = '暂无数据',
  description = '当前没有匹配的记录。',
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <section className="state-card">
      <div className="empty-illustration" aria-hidden="true" style={{ fontSize: 48 }}>
        {icon}
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel ? (
        <div className="button-row">
          {actionHref ? (
            <Link className="btn primary" href={actionHref}>
              {actionLabel}
            </Link>
          ) : onAction ? (
            <button className="btn primary" type="button" onClick={onAction}>
              {actionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
