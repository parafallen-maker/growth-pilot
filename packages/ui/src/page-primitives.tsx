import type { ReactNode } from 'react';

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
          {field.kind === 'select' ? (
            <select className="select" defaultValue={field.value}>
              <option>{field.value}</option>
            </select>
          ) : (
            <input className="input" defaultValue={field.value} />
          )}
        </div>
      ))}
      <div className="button-row">
        {actions ?? (
          <>
            <button className="btn primary">查询</button>
            <button className="btn">重置</button>
            <button className="btn">保存筛选</button>
          </>
        )}
      </div>
    </section>
  );
}

export function DataTable({
  title,
  columns,
  rows,
  description,
  actions,
}: {
  title: string;
  columns: string[];
  rows: ReactNode[][];
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <section className="table-card">
      <div className="page-header" style={{ marginBottom: 12 }}>
        <div>
          <h3>{title}</h3>
          <p>{description ?? '当前展示真实数据列表。'}</p>
        </div>
        <div className="button-row">
          {actions ?? (
            <>
              <button className="btn">列显隐</button>
              <button className="btn">导出</button>
            </>
          )}
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

export function ChartPanel({
  title,
  description,
  items,
}: {
  title: string;
  description?: string;
  items: { label: string; value: number; detail: string; valueLabel?: string; tone?: 'brand' | 'success' | 'warning' | 'danger' }[];
}) {
  const maxValue = items.reduce((current, item) => Math.max(current, item.value), 0) || 1;

  return (
    <section className="panel chart-panel">
      <div className="page-header" style={{ marginBottom: 12 }}>
        <div>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </div>
        <span className="badge">{items.length} bars</span>
      </div>
      <div className="chart-list">
        {items.length ? items.map((item) => {
          const widthPct = Math.max(8, Math.round((item.value / maxValue) * 100));
          return (
            <div key={`${title}-${item.label}`} className="chart-item">
              <div className="chart-item-head">
                <strong>{item.label}</strong>
                <span>{item.valueLabel ?? String(item.value)}</span>
              </div>
              <div className="chart-bar-track">
                <div
                  className={`chart-bar-fill ${item.tone ?? 'brand'}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <div className="subtle">{item.detail}</div>
            </div>
          );
        }) : (
          <div className="summary-item">
            <strong>暂无图表数据</strong>
            <div className="subtle">当前筛选范围没有可绘制的数据。</div>
          </div>
        )}
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
