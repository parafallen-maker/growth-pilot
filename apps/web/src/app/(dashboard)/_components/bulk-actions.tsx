'use client';

import { useState } from 'react';
import { useToast } from '@/components/business/toast-provider';

type BulkAction = {
  id: string;
  label: string;
  description: string;
};

export function BulkActionDemo({
  title,
  itemLabel,
  items,
  actions,
}: {
  title: string;
  itemLabel: string;
  items: Array<{ id: string; label: string; detail?: string }>;
  actions: BulkAction[];
}) {
  const [selected, setSelected] = useState<string[]>(items.slice(0, Math.min(2, items.length)).map((item) => item.id));
  const toast = useToast();

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <section className="panel stack">
      <div className="page-header">
        <div>
          <h3>{title}</h3>
          <p>先在前端完成批量选择与动作入口，避免页面继续只有单条处理。</p>
        </div>
        <span className="badge">已选 {selected.length}</span>
      </div>
      <div className="summary-list">
        {items.length ? items.map((item) => (
          <label key={item.id} className={`summary-item bulk-item${selected.includes(item.id) ? ' active-card' : ''}`}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} />
              <div>
                <strong>{item.label}</strong>
                {item.detail ? <div className="subtle">{item.detail}</div> : null}
              </div>
            </div>
          </label>
        )) : <div className="summary-item">暂无可批量处理的{itemLabel}。</div>}
      </div>
      <div className="button-row">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className="btn"
            disabled={!selected.length}
            onClick={() => {
              toast.info({ title: `${action.label}已加入执行清单`, description: `${selected.length} 个${itemLabel}：${action.description}` });
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
}
