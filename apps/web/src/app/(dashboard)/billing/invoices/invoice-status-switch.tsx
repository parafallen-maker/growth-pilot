'use client';

import { useState, useTransition } from 'react';
import { invoiceStatusLabels, invoiceStatusTransitions } from '@/lib/enums';
import { updateInvoiceStatus } from './actions';

export function InvoiceStatusSwitch({ invoiceId, currentStatus }: { invoiceId: string; currentStatus: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const nextStatuses = invoiceStatusTransitions[currentStatus] ?? [];

  const handleChange = (newStatus: string) => {
    setOpen(false);
    startTransition(async () => {
      const result = await updateInvoiceStatus(invoiceId, newStatus);
      if (result.success) window.location.reload();
      else alert(result.error);
    });
  };

  const label = invoiceStatusLabels[currentStatus] ?? currentStatus;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="btn small"
        style={{ fontWeight: 600, minWidth: 64 }}
        onClick={() => setOpen((v) => !v)}
        disabled={pending || nextStatuses.length === 0}
      >
        {label}{nextStatuses.length > 0 ? ' ▾' : ''}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 50, background: 'var(--card, #fff)', border: '1px solid var(--border, #ddd)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,.1)', minWidth: 120 }}>
          {nextStatuses.map((s) => (
            <button
              key={s}
              className="btn"
              style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', borderRadius: 0, padding: '6px 12px' }}
              onClick={() => handleChange(s)}
              disabled={pending}
            >
              {invoiceStatusLabels[s] ?? s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
