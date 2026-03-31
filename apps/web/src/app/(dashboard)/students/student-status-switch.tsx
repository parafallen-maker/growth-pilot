'use client';

import { useState, useTransition } from 'react';
import { studentStatusLabels, studentStatusTransitions } from '@/lib/enums';
import { updateStudentStatus } from './actions';

export function StudentStatusSwitch({ studentId, currentStatus }: { studentId: string; currentStatus: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const nextStatuses = studentStatusTransitions[currentStatus] ?? [];

  const handleChange = (newStatus: string) => {
    setOpen(false);
    startTransition(async () => {
      const result = await updateStudentStatus(studentId, newStatus);
      if (result.success) {
        window.location.reload();
      } else {
        alert(result.error);
      }
    });
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="btn small"
        style={{ fontWeight: 600, minWidth: 56 }}
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
      >
        {studentStatusLabels[currentStatus] ?? currentStatus} ▾
      </button>
      {open && nextStatuses.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, background: 'var(--card, #fff)', border: '1px solid var(--border, #ddd)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,.1)', minWidth: 100 }}>
          {nextStatuses.map((s) => (
            <button
              key={s}
              className="btn"
              style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', borderRadius: 0, padding: '6px 12px' }}
              onClick={() => handleChange(s)}
              disabled={pending}
            >
              {studentStatusLabels[s] ?? s}
            </button>
          ))}
        </div>
      )}
      {open && nextStatuses.length === 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, background: 'var(--card, #fff)', border: '1px solid var(--border, #ddd)', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,.1)', padding: '8px 12px', whiteSpace: 'nowrap' }}>
          当前状态不可流转
        </div>
      )}
    </div>
  );
}
