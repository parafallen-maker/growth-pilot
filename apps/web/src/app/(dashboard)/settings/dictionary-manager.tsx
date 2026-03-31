'use client';

import { useState } from 'react';

export function DictionaryManager({ dictionaries }: { dictionaries: Array<{ name: string; detail: string }> }) {
  const [mode, setMode] = useState<'idle' | 'create' | 'edit'>('idle');
  const [form, setForm] = useState({ dictType: '', code: '', label: '', value: '' });

  const reset = () => { setMode('idle'); setForm({ dictType: '', code: '', label: '', value: '' }); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = mode === 'create' ? 'POST' : 'PUT';
      const res = await fetch('/settings/dictionaries', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        alert('操作失败：' + (await res.text()));
      }
    } catch (err) {
      alert('网络错误');
    }
  };

  const handleDelete = async (dictType: string) => {
    if (!confirm(`确认删除字典类型「${dictType}」？`)) return;
    try {
      const res = await fetch(`/settings/dictionaries?dictType=${encodeURIComponent(dictType)}`, { method: 'DELETE' });
      if (res.ok) {
        window.location.reload();
      } else {
        alert('删除失败：' + (await res.text()));
      }
    } catch {
      alert('网络错误');
    }
  };

  return (
    <div className="stack">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>字典管理</h3>
        <button className="btn primary" onClick={() => { reset(); setMode('create'); }}>新增字典</button>
      </div>

      {(mode === 'create' || mode === 'edit') && (
        <form className="panel stack form-grid" onSubmit={handleSubmit}>
          <h4>{mode === 'create' ? '新增字典条目' : '编辑字典条目'}</h4>
          <div className="field"><label>字典类型 (dictType)</label><input className="input" value={form.dictType} onChange={(e) => setForm((f) => ({ ...f, dictType: e.target.value }))} placeholder="如：subject" required /></div>
          <div className="field"><label>编码 (code)</label><input className="input" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="如：math" required /></div>
          <div className="field"><label>显示名 (label)</label><input className="input" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="如：数学" required /></div>
          <div className="field"><label>值 (value)</label><input className="input" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder="如：math" required /></div>
          <div className="button-row form-span-2">
            <button className="btn primary" type="submit">{mode === 'create' ? '创建' : '保存'}</button>
            <button className="btn" type="button" onClick={reset}>取消</button>
          </div>
        </form>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>字典类型</th>
            <th>字典值</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {dictionaries.map((dict) => (
            <tr key={dict.name}>
              <td>{dict.name}</td>
              <td>{dict.detail}</td>
              <td>
                <button className="btn small" onClick={() => { setForm({ dictType: dict.name, code: '', label: '', value: '' }); setMode('edit'); }}>编辑</button>
                <button className="btn small" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(dict.name)}>删除</button>
              </td>
            </tr>
          ))}
          {dictionaries.length === 0 && <tr><td colSpan={3} className="subtle">暂无字典数据</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
