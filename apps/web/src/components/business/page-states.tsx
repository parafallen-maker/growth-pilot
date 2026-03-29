'use client';

import Link from 'next/link';

type ActionProps = {
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
};

export function LoadingState({ title = '正在加载', description = '正在获取最新数据，请稍候。' }: { title?: string; description?: string }) {
  return (
    <section className="state-card stack" aria-busy="true" aria-live="polite">
      <div className="badge">Loading</div>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="grid-3">
        <div className="skeleton-block" />
        <div className="skeleton-block" />
        <div className="skeleton-block" />
      </div>
      <div className="skeleton-line" />
      <div className="skeleton-line" />
    </section>
  );
}

export function EmptyState({
  title = '暂无结果',
  description = '当前筛选条件没有匹配数据。',
  actionLabel,
  actionHref,
  onAction,
}: { title?: string; description?: string } & ActionProps) {
  return (
    <section className="state-card">
      <div className="empty-illustration" aria-hidden="true">
        🗂️
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

export function ErrorState({
  title = '加载失败',
  description = '网络或服务暂时不可用，请稍后重试。',
  actionLabel = '重试',
  actionHref,
  onAction,
  traceId,
  code,
}: { title?: string; description?: string; traceId?: string; code?: string } & ActionProps) {
  const handleRetry = onAction ?? (() => window.location.reload());

  return (
    <section className="state-card">
      <div className="badge danger">Error</div>
      <h3 className="state-title">{title}</h3>
      <p>{description}</p>
      {code || traceId ? <div className="code">{`code: ${code ?? 'UNKNOWN'}\ntraceId: ${traceId ?? 'n/a'}`}</div> : null}
      {actionLabel ? (
        <div className="button-row">
          {actionHref ? (
            <Link className="btn danger" href={actionHref}>
              {actionLabel}
            </Link>
          ) : handleRetry ? (
            <button className="btn danger" type="button" onClick={handleRetry}>
              {actionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function ForbiddenState({
  title = '无权限访问',
  description = '当前账号没有访问该页面的权限。',
  actionLabel = '返回工作台',
  actionHref = '/dashboard',
}: { title?: string; description?: string; actionLabel?: string; actionHref?: string }) {
  return (
    <section className="state-card">
      <div className="badge danger">403 Forbidden</div>
      <h3 className="state-title">{title}</h3>
      <p>{description}</p>
      <div className="button-row">
        <Link className="btn" href={actionHref}>
          {actionLabel}
        </Link>
      </div>
    </section>
  );
}
