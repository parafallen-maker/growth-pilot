import type { ReactNode } from 'react';
import type { AsyncState } from '@/features/shared/types';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '@/components/business/page-states';

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
    return <LoadingState title={title} />;
  }

  if (state === 'empty') {
    return <EmptyState title={title} actionLabel="创建首条数据" actionHref="#" />;
  }

  if (state === 'error') {
    return <ErrorState title={title} actionLabel={actionLabel} traceId="req_mock_wave1" code="SYS_500" />;
  }

  if (state === 'forbidden') {
    return <ForbiddenState title={title} />;
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
