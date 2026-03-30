import Link from 'next/link';
import { DataTable, FilterBar, PageHeader, PaginationBar } from '@/components/business/page-blocks';
import { SubmitButton } from '@/components/business/submit-button';
import { CsvExportButton } from '../_components/csv-export-button';
import { QueryStatusToast } from '../_components/query-status-toast';
import { teacherService } from '@/services/teachers-service';
import { createTeacher } from './actions';

export default async function TeachersPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; error?: string }>;
}) {
  const query = await searchParams;
  const filters = { pageNo: 1, pageSize: 20, keyword: '', status: 'active', sortBy: 'updatedAt', sortOrder: 'desc' } as const;
  const result = await teacherService.query(filters);

  return (
    <div className="stack">
      <QueryStatusToast successKeys={['created']} />
      <PageHeader
        title="教师列表"
        description="教师档案与工作管理"
        actions={
          <>
            <a className="btn primary" href="#new-teacher-form">新建教师</a>
            <CsvExportButton filename="teachers.csv" headers={['工号', '姓名', '主学科', '校区', '在带学生数', '待复核作业', '观察覆盖率', '状态']} rows={result.list.map((item) => [item.employeeNo, item.name, item.subject, item.campus, item.students, item.reviews, item.coverage, item.status])} />
          </>
        }
      />
      {query?.created ? <section className="panel"><div className="badge success">教师已创建：{query.created}</div></section> : null}
      {query?.error ? <section className="panel"><div className="badge warning">{decodeURIComponent(query.error)}</div></section> : null}

      <section className="panel stack" id="new-teacher-form">
        <div className="page-header">
          <div>
            <h3>新建教师</h3>
          </div>
        </div>
        <form className="form-grid" action={createTeacher}>
          <div className="field"><label>校区 ID</label><input className="input" name="campusId" placeholder="campus-guiyang" required /></div>
          <div className="field"><label>工号</label><input className="input" name="employeeNo" placeholder="T-2026-001" required /></div>
          <div className="field"><label>姓名</label><input className="input" name="name" placeholder="教师姓名" required /></div>
          <div className="field"><label>主学科（可选）</label><input className="input" name="leadSubject" placeholder="数学 / 英语 / 语文" /></div>
          <div className="field"><label>手机号（可选）</label><input className="input" name="mobile" placeholder="13800000000" /></div>
          <div className="field"><label>邮箱（可选）</label><input className="input" name="email" type="email" placeholder="teacher@example.com" /></div>
          <div className="field"><label>入职日期（可选）</label><input className="input" name="hireDate" type="date" /></div>
          <div className="field"><label>状态</label><select className="select" name="status" defaultValue="active"><option value="active">在岗</option><option value="inactive">离岗</option></select></div>
          <div className="button-row form-span-2"><SubmitButton pendingLabel="创建中...">提交创建</SubmitButton><button className="btn" type="reset">清空</button></div>
        </form>
      </section>

      <FilterBar fields={[{ label: '关键词', value: '姓名 / 工号' }, { label: '校区', value: '全部校区', kind: 'select' }, { label: '状态', value: '在岗', kind: 'select' }, { label: '学科', value: '全部学科', kind: 'select' }]} />
      <DataTable
        title={`教师列表（共 ${result.page.total} 条）`}
        columns={['工号', '姓名', '主学科', '校区', '在带学生数', '待复核作业', '观察覆盖率', '状态', '操作']}
        rows={result.list.map((item) => [item.employeeNo, item.name, item.subject, item.campus, item.students, item.reviews, item.coverage, item.status, <Link key={item.id} className="btn" href={`/teachers/${item.id}`}>查看详情</Link>])}
        emptyLabel="当前筛选下暂无教师档案。"
      />
      <PaginationBar pageNo={result.page.pageNo} pageSize={result.page.pageSize} total={result.page.total} baseUrl="/teachers" />
      {result.list[0] ? <div className="button-row"><Link className="btn" href={`/teachers/${result.list[0].id}`}>打开首位教师详情</Link></div> : null}
    </div>
  );
}
