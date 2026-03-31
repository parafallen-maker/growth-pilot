'use client';

import { useState } from 'react';

export function StudentEditSection({ student }: { student: { id: string; studentNo: string; name: string; gender?: string; gradeLabel: string; className?: string; schoolName?: string; profileNotes?: string } }) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      {/* Listen for the edit button click */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.addEventListener('click', function(e) {
            if (e.target.matches('[data-toggle-edit]')) {
              document.getElementById('student-edit-section')?.scrollIntoView({ behavior: 'smooth' });
            }
          })`,
        }}
      />
      <section className="panel stack" id="student-edit-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>编辑学生档案</h3>
          <button className="btn small" onClick={() => setVisible((v) => !v)}>{visible ? '收起' : '展开'}</button>
        </div>
        {visible && (
          <form className="form-grid" action={`/api/students/${student.id}`} method="POST">
            <input type="hidden" name="_method" value="PUT" />
            <div className="field"><label>学生编号</label><input className="input" name="studentNo" defaultValue={student.studentNo} required /></div>
            <div className="field"><label>姓名</label><input className="input" name="name" defaultValue={student.name} required /></div>
            <div className="field"><label>年级</label><input className="input" name="gradeLabel" defaultValue={student.gradeLabel} required /></div>
            <div className="field"><label>性别</label><select className="select" name="gender" defaultValue={student.gender ?? ''}><option value="">未填写</option><option value="male">男</option><option value="female">女</option></select></div>
            <div className="field"><label>班级</label><input className="input" name="className" defaultValue={student.className ?? ''} /></div>
            <div className="field"><label>学校</label><input className="input" name="schoolName" defaultValue={student.schoolName ?? ''} /></div>
            <div className="field form-span-2"><label>档案备注</label><textarea className="textarea" name="profileNotes" defaultValue={student.profileNotes ?? ''} /></div>
            <div className="button-row form-span-2">
              <button className="btn primary" type="submit">保存修改</button>
              <button className="btn" type="reset">重置</button>
            </div>
          </form>
        )}
        {!visible && <div className="subtle">点击"展开"编辑学生基础信息</div>}
      </section>
    </>
  );
}
