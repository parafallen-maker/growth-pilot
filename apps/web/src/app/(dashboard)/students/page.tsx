import Link from 'next/link';
import { DataTable, PageHeader } from '@/components/business/page-blocks';
import { familyService } from '@/services/families-service';
import { queryKeys } from '@/features/shared/query-keys';
import { studentService, type StudentQuery } from '@/services/students-service';
import { createStudent } from './actions';
import { SubmitButton } from '@/components/business/submit-button';
import { CsvExportButton } from '../_components/csv-export-button';

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const SORT_OPTIONS = [
  { value: 'updatedAt', label: '最近更新' },
  { value: 'studentNo', label: '学号' },
  { value: 'name', label: '姓名' },
  { value: 'gradeLabel', label: '年级' },
  { value: 'status', label: '状态' },
] as const;

function normalizeSearchParams(query?: { [key: string]: string | undefined }): StudentQuery {
  const pageNo = Number(query?.pageNo ?? '1');
  const pageSize = Number(query?.pageSize ?? '20');
  return {
    pageNo: Number.isFinite(pageNo) && pageNo > 0 ? pageNo : 1,
    pageSize: PAGE_SIZE_OPTIONS.includes(pageSize as (typeof PAGE_SIZE_OPTIONS)[number]) ? pageSize : 20,
    keyword: query?.keyword?.trim() ?? '',
    campusId: query?.campusId?.trim() || 'all',
    termId: query?.termId?.trim() || '2026-spring',
    status: query?.status?.trim() || 'active',
    sortBy: query?.sortBy?.trim() || 'updatedAt',
    sortOrder: query?.sortOrder === 'asc' ? 'asc' : 'desc',
  };
}

function buildStudentsHref(filters: StudentQuery, overrides: Partial<StudentQuery> = {}) {
  const search = new URLSearchParams();
  const next = { ...filters, ...overrides };
  Object.entries(next).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return `/students${qs ? `?${qs}` : ''}`;
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; error?: string; pageNo?: string; pageSize?: string; keyword?: string; campusId?: string; termId?: string; status?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }>;
}) {
  const query = await searchParams;
  const filters = normalizeSearchParams(query);
  const [result, families] = await Promise.all([
    studentService.query(filters),
    familyService.query({ pageNo: 1, pageSize: 50, status: 'active' }),
  ]);
  const totalPages = Math.max(1, Math.ceil(result.page.total / result.page.pageSize));
  const prevPage = Math.max(1, result.page.pageNo - 1);
  const nextPage = Math.min(totalPages, result.page.pageNo + 1);

  return (
    <div className="stack">
      <PageHeader
        title="学生列表"
        description="学生档案管理与状态查看"
        actions={<><a className="btn primary" href="#new-student-form">新建学生</a><Link className="btn" href="/students/import">导入学生</Link><a className="btn" href="#student-bulk-hint">批量打标签说明</a><CsvExportButton filename="students.csv" headers={['学号', '姓名', '年级', '校区', '当前老师', '家庭主联系人', '最近作业正确率', '本周成长观察', '当前未收余额', '状态']} rows={result.list.map((item) => [item.studentNo, item.name, item.grade, item.campus, item.teacher, item.family, item.accuracy, item.observation, item.balance, item.status])} /></>}
      />
      {query?.created ? <section className="panel"><div className="badge success">学生已创建：{query.created}</div></section> : null}
      {query?.error ? <section className="panel"><div className="badge warning">{decodeURIComponent(query.error)}</div></section> : null}
      <section className="panel stack" id="new-student-form">
        <div className="page-header">
          <div>
            <h3>新建学生</h3>
            <p>已接 POST /students，先覆盖基础档案创建。</p>
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
          <div className="button-row form-span-2"><SubmitButton pendingLabel="创建中...">提交创建</SubmitButton><Link className="btn" href="/students">清空表单</Link></div>
        </form>
      </section>

      <section className="filter-bar">
        <form className="filter-bar" action="/students">
          <div className="field"><label>关键词</label><input className="input" name="keyword" defaultValue={filters.keyword ?? ''} placeholder="姓名 / 学号 / 家庭 / 老师" /></div>
          <div className="field"><label>校区</label><select className="select" name="campusId" defaultValue={filters.campusId ?? 'all'}><option value="all">全部校区</option><option value="campus-guiyang">贵阳主校区</option></select></div>
          <div className="field"><label>学期</label><select className="select" name="termId" defaultValue={filters.termId ?? '2026-spring'}><option value="all">全部学期</option><option value="2026-spring">2026 春季</option></select></div>
          <div className="field"><label>状态</label><select className="select" name="status" defaultValue={filters.status ?? 'active'}><option value="all">全部</option><option value="active">在读</option><option value="trial">试听</option><option value="inactive">停读</option></select></div>
          <div className="field"><label>排序字段</label><select className="select" name="sortBy" defaultValue={filters.sortBy ?? 'updatedAt'}>{SORT_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
          <div className="field"><label>排序方向</label><select className="select" name="sortOrder" defaultValue={filters.sortOrder ?? 'desc'}><option value="desc">降序</option><option value="asc">升序</option></select></div>
          <div className="field"><label>每页条数</label><select className="select" name="pageSize" defaultValue={String(filters.pageSize ?? 20)}>{PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={String(size)}>{size} 条</option>)}</select></div>
          <input type="hidden" name="pageNo" value="1" />
          <div className="button-row">
            <button className="btn primary" type="submit">查询</button>
            <Link className="btn" href="/students">重置</Link>
          </div>
        </form>
      </section>

      <DataTable
        title={`学生列表（共 ${result.page.total} 条）`}
        description={`当前第 ${result.page.pageNo} / ${totalPages} 页，分页 / 搜索 / 排序参数已直连列表查询。`}
        columns={['学号', '姓名', '年级', '校区', '当前老师', '家庭主联系人', '最近作业正确率', '本周成长观察', '当前未收余额', '状态', '详情']}
        rows={result.list.map((item) => [
          item.studentNo,
          item.name,
          item.grade,
          item.campus,
          item.teacher,
          item.family,
          item.accuracy,
          item.observation,
          item.balance,
          item.status,
          <Link key={`${item.id}-detail`} className="btn" href={item.detailHref}>查看 360</Link>,
        ])}
        actions={<div className="button-row"><span className="badge">page {result.page.pageNo}/{totalPages}</span><a className="btn" href="#student-bulk-hint">批量动作说明</a></div>}
      />

      <section className="panel" id="student-bulk-hint">
        <div className="page-header">
          <div>
            <h3>分页导航 / 批量动作说明</h3>
            <p>当前页码、每页条数、排序字段都会透传回列表查询；批量标签仍等待后端 bulk API，因此页面明确展示说明而不保留假按钮。</p>
          </div>
          <div className="button-row">
            <Link className="btn" aria-disabled={result.page.pageNo <= 1} href={buildStudentsHref(filters, { pageNo: prevPage })}>上一页</Link>
            <Link className="btn" aria-disabled={result.page.pageNo >= totalPages} href={buildStudentsHref(filters, { pageNo: nextPage })}>下一页</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
