import Link from 'next/link';
import { DataTable, FilterBar, PageHeader } from '@/components/business/page-blocks';
import { familyService } from '@/services/families-service';
import { queryKeys } from '@/features/shared/query-keys';
import { studentService } from '@/services/students-service';
import { createStudent } from './actions';

export default async function StudentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; error?: string }>;
}) {
  const query = await searchParams;
  const filters = { pageNo: 1, pageSize: 20, keyword: '', campusId: 'all', termId: '2026-spring', status: 'active', sortBy: 'updatedAt', sortOrder: 'desc' } as const;
  const [result, families] = await Promise.all([
    studentService.query(filters),
    familyService.query({ pageNo: 1, pageSize: 50, status: 'active' }),
  ]);

  return (
    <div className="stack">
      <PageHeader
        title="学生列表"
        description={`真实数据来自 GET /students + GET /students/{id}/360。query key: ${JSON.stringify(queryKeys.students({ pageNo: 1, pageSize: 20, termId: '2026-spring' }))}`}
        actions={<><a className="btn primary" href="#new-student-form">新建学生</a><Link className="btn" href="/students/import">导入学生</Link><button className="btn">批量打标签</button><button className="btn">导出</button></>}
      />
      {query?.created ? <section className="panel"><div className="badge success">学生已创建：{query.created}</div></section> : null}
      {query?.error ? <section className="panel"><div className="badge warning">{decodeURIComponent(query.error)}</div></section> : null}
      <section className="panel stack" id="new-student-form">
        <div className="page-header">
          <div>
            <h3>新建学生</h3>
            <p>FE-18 已接 POST /students。首波先落基础档案，入学/排班等后续再接。</p>
          </div>
          <span className="badge success">POST /students</span>
        </div>
        <form className="form-grid" action={createStudent}>
          <div className="field"><label>学生编号</label><input className="input" name="studentNo" placeholder="STU-202603-001" required /></div>
          <div className="field"><label>姓名</label><input className="input" name="name" placeholder="学生姓名" required /></div>
          <div className="field"><label>年级</label><input className="input" name="gradeLabel" placeholder="一年级" required /></div>
          <div className="field"><label>性别</label><select className="select" name="gender" defaultValue=""><option value="">未填写</option><option value="male">男</option><option value="female">女</option></select></div>
          <div className="field"><label>出生日期</label><input className="input" type="date" name="birthDate" /></div>
          <div className="field"><label>班级</label><input className="input" name="className" placeholder="启航 1 班" /></div>
          <div className="field"><label>学校</label><input className="input" name="schoolName" placeholder="学校名称" /></div>
          <div className="field"><label>家庭</label><select className="select" name="familyId" defaultValue=""><option value="">暂不绑定</option>{families.list.map((family) => <option key={family.id} value={family.id}>{family.name} / {family.code}</option>)}</select></div>
          <div className="field form-span-2"><label>标签</label><input className="input" name="tags" placeholder="逗号分隔，例如：重点关注, 数学强项" /></div>
          <div className="field form-span-2"><label>档案备注</label><textarea className="textarea" name="profileNotes" placeholder="补充说明学生特点、健康情况、家长期待等" /></div>
          <div className="button-row form-span-2"><button className="btn primary" type="submit">提交创建</button><a className="btn" href="#">清空</a></div>
        </form>
      </section>
      <FilterBar fields={[{ label: '关键词', value: '姓名 / 学号 / 家庭' }, { label: '校区', value: '全部校区', kind: 'select' }, { label: '学期', value: '2026 春季', kind: 'select' }, { label: '年级', value: '全部年级', kind: 'select' }, { label: '老师', value: '全部老师', kind: 'select' }, { label: '状态', value: '在读', kind: 'select' }]} />
      <DataTable
        title={`学生列表（共 ${result.page.total} 条）`}
        columns={['学号', '姓名', '年级', '校区', '当前老师', '家庭主联系人', '最近作业正确率', '本周成长观察', '当前未收余额', '状态', '详情']}
        rows={result.list.map((item) => [item.studentNo, item.name, item.grade, item.campus, item.teacher, item.family, item.accuracy, item.observation, item.balance, item.status, item.detailHref])}
      />
    </div>
  );
}
