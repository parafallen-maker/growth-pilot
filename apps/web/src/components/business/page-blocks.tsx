import type { ReactNode } from 'react';
import type { AsyncState } from '@/features/shared/types';

export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return (
    <section className="page-header hero-card">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actions ? <div className="button-row">{actions}</div> : null}
    </section>
  );
}

export function MetricGrid({ items }: { items: { label: string; value: string; hint: string }[] }) {
  return (
    <section className="grid-4">
      {items.map((item) => (
        <article key={item.label} className="metric-card">
          <div className="label">{item.label}</div>
          <div className="value">{item.value}</div>
          <div className="hint">{item.hint}</div>
        </article>
      ))}
    </section>
  );
}

export function FilterBar({ fields, actions }: { fields: { label: string; value: string; kind?: 'input' | 'select' }[]; actions?: ReactNode }) {
  return (
    <section className="filter-bar">
      {fields.map((field) => (
        <div className="field" key={field.label}>
          <label>{field.label}</label>
          {field.kind === 'select' ? <select className="select" defaultValue={field.value}><option>{field.value}</option></select> : <input className="input" defaultValue={field.value} />}
        </div>
      ))}
      <div className="button-row">
        {actions ?? (
          <>
            <button className="btn primary">查询</button>
            <button className="btn">重置</button>
            <button className="btn">保存筛选（占位）</button>
          </>
        )}
      </div>
    </section>
  );
}

export function DataTable({ title, columns, rows }: { title: string; columns: string[]; rows: string[][] }) {
  return (
    <section className="table-card">
      <div className="page-header" style={{ marginBottom: 12 }}>
        <div>
          <h3>{title}</h3>
          <p>已预留排序 / 勾选 / 行操作 / 导出占位。</p>
        </div>
        <div className="button-row">
          <button className="btn">列显隐</button>
          <button className="btn">导出</button>
        </div>
      </div>
      <table className="data-table">
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${title}-${index}`}>
              {row.map((cell, cellIndex) => <td key={`${index}-${cellIndex}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function StateBlock({ state, title, actionLabel = '重试' }: { state: AsyncState; title: string; actionLabel?: string }) {
  if (state === 'loading') {
    return (
      <section className="state-card stack">
        <h3>{title} / Loading Skeleton</h3>
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

  if (state === 'empty') {
    return (
      <section className="state-card">
        <div className="empty-illustration">🗂️</div>
        <h3>{title} / Empty</h3>
        <p>还没有数据。这里会给出空状态文案和引导动作。</p>
        <div className="button-row"><button className="btn primary">创建首条数据</button></div>
      </section>
    );
  }

  if (state === 'error') {
    return (
      <section className="state-card">
        <div className="badge danger">Error</div>
        <h3 style={{ marginTop: 12 }}>{title} / Error</h3>
        <p>请求失败时，这里会展示 traceId 和重试按钮。</p>
        <div className="code">code: SYS_500\ntraceId: req_mock_wave1</div>
        <div className="button-row"><button className="btn danger">{actionLabel}</button></div>
      </section>
    );
  }

  return null;
}

export function TabStrip({ tabs, active }: { tabs: string[]; active: string }) {
  return <div className="tabs">{tabs.map((tab) => <span key={tab} className={`tab${tab === active ? ' active' : ''}`}>{tab}</span>)}</div>;
}

export function SummaryPanel({ title, items }: { title: string; items: { name: string; detail: string }[] }) {
  return (
    <section className="panel">
      <h3>{title}</h3>
      <div className="summary-list" style={{ marginTop: 12 }}>
        {items.map((item) => (
          <div key={item.name} className="summary-item">
            <strong>{item.name}</strong>
            <div className="subtle">{item.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TimelinePanel({ title, items }: { title: string; items: { title: string; detail: string }[] }) {
  return (
    <section className="panel">
      <h3>{title}</h3>
      <div className="timeline" style={{ marginTop: 12 }}>
        {items.map((item) => (
          <div key={item.title} className="timeline-item">
            <strong>{item.title}</strong>
            <div className="subtle">{item.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
