'use client';

import { useState } from 'react';

const CAMPUSES = [
  { value: 'campus-guiyang', label: '贵阳主校区' },
];

const TERMS = [
  { value: '2026-spring', label: '2026 春季' },
  { value: '2025-fall', label: '2025 秋季' },
  { value: '2025-spring', label: '2025 春季' },
];

export function TermSwitcher({ campusId: _campusId, termId }: { campusId: string; termId: string }) {
  const [open, setOpen] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState(_campusId);
  const [selectedTerm, setSelectedTerm] = useState(termId);

  const handleApply = () => {
    const params = new URLSearchParams({ campusId: selectedCampus, termId: selectedTerm });
    window.location.href = `/dashboard?${params.toString()}`;
  };

  return (
    <>
      <button className="btn primary" onClick={() => setOpen(true)}>切学期</button>
      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setOpen(false)}>
          <div className="panel stack" style={{ width: 400, padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <h3>切换学期 / 校区</h3>
            <div className="field">
              <label>校区</label>
              <select className="select" value={selectedCampus} onChange={(e) => setSelectedCampus(e.target.value)}>
                {CAMPUSES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label>学期</label>
              <select className="select" value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)}>
                {TERMS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="button-row">
              <button className="btn primary" onClick={handleApply}>应用</button>
              <button className="btn" onClick={() => setOpen(false)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
