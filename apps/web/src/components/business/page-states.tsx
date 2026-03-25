import Link from 'next/link';

export function LoadingState({ title = '加载中', description = '正在拉取最新数据，请稍候。' }: { title?: string; description?: string }) {
  return (
    <section className="state-card stack">
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

export function EmptyState({ title = '暂无数据', description = '当前筛选条件下还没有结果。', actionLabel, actionHref }: { title?: string; description?: string; actionLabel?: string; actionHref?: string }) {
  return (
    <section className="state-card">
      <div className="empty-illustration">🗂️</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel && actionHref ? <div className="button-row"><Link className="btn primary" href={actionHref}>{actionLabel}</Link></div> : null}
    </section>
  );
}

export function ErrorState({ title = '请求失败', description = '接口没给面子，但重试按钮还在。', actionLabel = '重试', traceId, code }: { title?: string; description?: string; actionLabel?: string; traceId?: string; code?: string }) {
  return (
    <section className="state-card">
      <div className="badge danger">Error</div>
      <h3 style={{ marginTop: 12 }}>{title}</h3>
      <p>{description}</p>
      {(code || traceId) ? <div className="code">{`code: ${code ?? 'UNKNOWN'}\ntraceId: ${traceId ?? 'n/a'}`}</div> : null}
      <div className="button-row"><button className="btn danger" type="button">{actionLabel}</button></div>
    </section>
  );
}

export function ForbiddenState({ title = '无权限访问', description, actionHref = '/dashboard' }: { title?: string; description?: string; actionHref?: string }) {
  return (
    <section className="state-card">
      <div className="badge danger">403 Forbidden</div>
      <h3 style={{ marginTop: 12 }}>{title}</h3>
      <p>{description ?? '你能看见入口，不代表你能进门。缺权限就别硬撞。'}</p>
      <div className="button-row"><Link className="btn" href={actionHref}>返回工作台</Link></div>
    </section>
  );
}
