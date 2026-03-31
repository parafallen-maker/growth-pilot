'use client';

import { useState, useTransition } from 'react';
import { studentStatusLabels, studentStatusTransitions } from '@/lib/enums';
import { updateStudent } from '../actions';

export function StudentEditSection({ student }: { student: { id: string; studentNo: string; name: string; gender?: string; gradeLabel: string; className?: string; schoolName?: string; status: string; profileNotes?: string } }) {
  const [visible, setVisible] = useState(false);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateStudent(student.id, fd);
      if (result.success) {
        setMsg('保存成功');
        setTimeout(() => window.location.reload(), 600);
      } else {
        setMsg(result.error ?? '保存失败');
      }
    });
  };

  const nextStatuses = studentStatusTransitions[student.status] ?? [];
  const statusOptions = nextStatuses.length > 0
    ? nextStatuses
    : Object.keys(studentStatusLabels);

  return (
    <>
      <section className="panel stack" id="student-edit-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>编辑学生档案</h3>
          <button className="btn small" onClick={() => setVisible((v) => !v)}>{visible ? '收起' : '展开'}</button>
        </div>
        {visible && (
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="field"><label>学生编号</label><input className="input" name="studentNo" defaultValue={student.studentNo} disabled /></div>
            <div className="field"><label>姓名</label><input className="input" name="name" defaultValue={student.name} required /></div>
            <div className="field"><label>年级</label><input className="input" name="gradeLabel" defaultValue={student.gradeLabel} required /></div>
            <div className="field"><label>性别</label><select className="select" name="gender" defaultValue={student.gender ?? ''}><option value="">未填写</option><option value="male">男</option><option value="female">女</option></select></div>
            <div className="field"><label>状态</label>
              <select className="select" name="status" defaultValue={student.status}>
                {statusOptions.map((s) => <option key={s} value={s}>{studentStatusLabels[s] ?? s}</option>)}
              </select>
            </div>
            <div className="field"><label>班级</label><input className="input" name="className" defaultValue={student.className ?? ''} /></div>
            <div className="field"><label>学校</label><input className="input" name="schoolName" defaultValue={student.schoolName ?? ''} /></div>
            <div className="field form-span-2"><label>档案备注</label><textarea className="textarea" name="profileNotes" defaultValue={student.profileNotes ?? ''} /></div>
            <div className="button-row form-span-2">
              <button className="btn primary" type="submit" disabled={pending}>保存修改</button>
              <button className="btn" type="reset">重置</button>
              {msg && <span className={msg.includes('成功') ? 'badge success' : 'badge warning'}>{msg}</span>}
            </div>
          </form>
        )}
        {!visible && <div className="subtle">点击"展开"编辑学生基础信息（当前状态：{studentStatusLabels[student.status] ?? student.status}）</div>}
      </section>
    </>
  );
}
