import Link from 'next/link';
import { PermissionGuard } from '@/components/business/permission-guard';
import { DataTable, FilterBar, MetricGrid, PageHeader, PaginationBar } from '@/components/business/page-blocks';
import { EmptyState } from '@/components/ui/empty-state';
import { homeworkPermissions } from '@/features/homework/constants';
import { requireCurrentUser } from '@/lib/current-user';
import { homeworkService } from '@/services/homework-service';
import { studentService } from '@/services/students-service';
import { teacherService } from '@/services/teachers-service';
import { bulkApplyHomeworkTags, bulkTriggerHomeworkAnalysis, createHomeworkSubmission, submitHomeworkReviewFromList } from './actions';
import { SubmitButton } from '@/components/business/submit-button';
import { CsvExportButton } from '../../_components/csv-export-button';
import { QueryStatusToast } from '../../_components/query-status-toast';

export default async function HomeworkSubmissionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; fileId?: string; reviewed?: string; error?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const query = await searchParams;
  const filters = {
    pageNo: 1,
    pageSize: 20,
    keyword: '',
    subject: 'all',
    teacherId: 'all',
    aiStatus: 'all',
    reviewStatus: 'all',
    dateFrom: '2026-03-18',
    dateTo: '2026-03-24',
    sortBy: 'submittedAt',
    sortOrder: 'desc' as const,
  };
  const [result, students, teachers, taxonomies] = await Promise.all([
    homeworkService.query(filters),
    studentService.query({ pageNo: 1, pageSize: 50, status: 'active' }),
    teacherService.query({ pageNo: 1, pageSize: 50, status: 'active' }),
    homeworkService.taxonomyQuery({ pageNo: 1, pageSize: 20 }),
  ]);
  const pendingAi = result.list.filter((item) => item.aiStatus === 'pending' || item.aiStatus === 'queued').length;
  const reviewing = result.list.filter((item) => ['reviewing', 'unreviewed', 'draft'].includes(item.reviewStatus)).length;
  const reviewed = result.list.filter((item) => ['reviewed', 'published'].includes(item.reviewStatus)).length;
  const defaultSubmission = result.list[0];

  return (
    <PermissionGuard allowed={currentUser.permissions.includes(homeworkPermissions.submissionsView)}>
      <div className="stack">
        <QueryStatusToast successKeys={['created', 'reviewed']} />
        <PageHeader
          title="作业提交队列"
          description="作业提交记录与复核管理"
          actions={
            <>
              <a className="btn primary" href="#homework-upload-form">上传作业</a>
              <a className="btn" href="#review-submit-form">快速复核</a>
              <CsvExportButton filename="homework-submissions.csv" headers={['提交编号', '学生', '学科', '日期', 'AI 状态', '最终正确率', '复核状态', '责任老师']} rows={result.list.map((item) => [item.submissionNo, item.studentName, item.subject, item.submittedAt, item.aiStatus, item.finalAccuracy, item.reviewStatus, item.teacherName])} />
            </>
          }
        />

        {query?.created ? <section className="panel"><div className="badge success">作业已上传成功</div></section> : null}
        {query?.reviewed ? <section className="panel"><div className="badge success">复核已提交：{query.reviewed}</div></section> : null}
        {query?.error ? <section className="panel"><div className="badge warning">{decodeURIComponent(query.error)}</div></section> : null}

        <MetricGrid items={[
          { label: '当前页记录', value: String(result.list.length), hint: `共 ${result.page.total} 条` },
          { label: '待 AI 分析', value: String(pendingAi), hint: '等待系统分析' },
          { label: '待复核', value: String(reviewing), hint: '等待教师复核' },
          { label: '已完成', value: String(reviewed), hint: '复核已提交' },
        ]} />

        <section className="panel stack" id="homework-upload-form">
          <div className="page-header"><div><h3>上传作业</h3><p>选择学生，上传作业图片，系统将自动触发 AI 分析。</p></div></div>
          <form className="form-grid" action={createHomeworkSubmission}>
            <div className="field"><label>学生</label><select className="select" name="studentId" required defaultValue={students.list[0]?.id ?? ''}>{students.list.map((student) => <option key={student.id} value={student.id}>{student.name} / {student.studentNo}</option>)}</select></div>
            <div className="field"><label>责任老师</label><select className="select" name="teacherId" defaultValue={teachers.list[0]?.id ?? ''}>{teachers.list.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name} / {teacher.subject}</option>)}</select></div>
            <div className="field"><label>校区 ID（可选）</label><input className="input" name="campusId" placeholder="campus-guiyang" /></div>
            <div className="field"><label>学期 ID（可选）</label><input className="input" name="termId" placeholder="term-2026-spring" /></div>
            <div className="field"><label>学科</label><input className="input" name="subject" defaultValue="math" required /></div>
            <div className="field"><label>作业日期</label><input className="input" type="date" name="homeworkDate" required /></div>
            <div className="field"><label>来源类型</label><select className="select" name="sourceType" defaultValue="manual_upload"><option value="manual_upload">手动上传</option><option value="camera_scan">拍照扫描</option><option value="wechat">微信提交</option></select></div>
            <div className="field"><label>作业文件</label><input className="input" type="file" name="file" required /></div>
            <div className="field form-span-2"><label>备注</label><textarea className="textarea" name="remark" placeholder="可填写批次、来源、页面数、特殊说明" /></div>
            <div className="button-row form-span-2"><SubmitButton pendingLabel="上传中...">上传并创建提交</SubmitButton></div>
          </form>
        </section>

        <section className="panel stack" id="review-submit-form">
          <div className="page-header"><div><h3>快速提交复核</h3><p>无需进入详情页，在列表直接提交复核结果。</p></div></div>
          <form className="form-grid" action={submitHomeworkReviewFromList}>
            <div className="field"><label>提交单</label><select className="select" name="submissionId" defaultValue={defaultSubmission?.submissionId ?? ''}>{result.list.map((item) => <option key={item.submissionId} value={item.submissionId}>{item.submissionNo} / {item.studentName} / {item.subject}</option>)}</select></div>
            <div className="field"><label>复核结论</label><select className="select" name="reviewResult" defaultValue="adjusted"><option value="approved">通过</option><option value="adjusted">修正</option><option value="rejected">退回</option></select></div>
            <div className="field"><label>最终正确率</label><input className="input" type="number" min="0" max="100" name="finalAccuracyPct" defaultValue="92" /></div>
            <div className="field form-span-2"><label>错因标签</label><div className="chip-row">{taxonomies.list.slice(0, 8).map((taxonomy) => <label className="tab" key={taxonomy.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><input type="checkbox" name="errorTaxonomyId" value={taxonomy.id} defaultChecked={taxonomy.id === taxonomies.list[0]?.id} /><span>{taxonomy.name}</span></label>)}</div></div>
            <div className="field form-span-2"><label>错因总结</label><textarea className="textarea" name="finalErrorSummary" placeholder="本次主要问题与改进方向" /></div>
            <div className="field form-span-2"><label>家长反馈建议</label><textarea className="textarea" name="finalSuggestion" placeholder="给家长的建议与陪练提示" /></div>
            <div className="field form-span-2"><label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" name="publishToFamily" /><span>同步发布给家庭</span></label></div>
            <div className="button-row form-span-2"><SubmitButton pendingLabel="提交中...">提交复核</SubmitButton>{defaultSubmission ? <Link className="btn" href={`/homework/review/${defaultSubmission.submissionId}`}>进入完整工作台</Link> : null}</div>
          </form>
        </section>

        <section className="panel stack">
          <div className="page-header">
            <div>
              <h3>批量作业动作</h3>
              <p>按批次触发 AI 分析或将错因标签写入复核草稿。</p>
            </div>
          </div>
          <form className="stack">
            <div className="summary-list">
              {result.list.slice(0, 8).map((item) => (
                <label key={item.submissionId} className="summary-item bulk-item">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <input type="checkbox" name="submissionIds" value={item.submissionId} defaultChecked={item.aiStatus === 'pending' || item.reviewStatus === 'unreviewed'} />
                    <div>
                      <strong>{item.submissionNo} / {item.studentName}</strong>
                      <div className="subtle">{item.subject} · AI {item.aiStatus} · 复核 {item.reviewStatus}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="grid-2">
              <div className="field">
                <label>批量标签</label>
                <div className="chip-row">
                  {taxonomies.list.slice(0, 6).map((taxonomy) => (
                    <label className="tab" key={taxonomy.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <input type="checkbox" name="errorTaxonomyId" value={taxonomy.id} defaultChecked={taxonomy.id === taxonomies.list[0]?.id} />
                      <span>{taxonomy.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>标签写入方式</label>
                <select className="select" name="mode" defaultValue="merge">
                  <option value="merge">merge：追加到现有草稿</option>
                  <option value="replace">replace：替换当前标签</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>批量说明</label>
              <textarea className="textarea" name="finalErrorSummary" placeholder="例如：本批次普遍存在审题偏差与计算粗心。" />
            </div>
            <div className="button-row">
              <SubmitButton formAction={bulkTriggerHomeworkAnalysis} pendingLabel="批量触发中...">批量触发 AI</SubmitButton>
              <SubmitButton formAction={bulkApplyHomeworkTags} className="btn" pendingLabel="批量写入中...">批量打错因标签</SubmitButton>
            </div>
          </form>
        </section>

        {result.list.length === 0 && <EmptyState icon="📝" title="暂无作业提交" description="当前没有作业提交记录。" actionLabel="上传作业" actionHref="#homework-upload-form" />}
        <FilterBar
          fields={[
            { label: '关键词', value: '学生 / 提交编号' },
            { label: '学科', value: filters.subject, kind: 'select' },
            { label: '责任老师', value: filters.teacherId, kind: 'select' },
            { label: 'AI 状态', value: filters.aiStatus, kind: 'select' },
            { label: '复核状态', value: filters.reviewStatus, kind: 'select' },
            { label: '开始日期', value: filters.dateFrom },
            { label: '结束日期', value: filters.dateTo },
          ]}
        />

        <DataTable
          title={`作业提交列表 · 第 ${result.page.pageNo} 页`}
          columns={['提交编号', '学生', '学科', '日期', 'AI 状态', '最终正确率', '复核状态', '责任老师', '行动作']}
          rows={result.list.map((item) => [item.submissionNo, item.studentName, item.subject, item.submittedAt, item.aiStatus, item.finalAccuracy, item.reviewStatus, item.teacherName, item.actions])}
          emptyLabel="当前筛选下暂无作业提交记录。"
        />
        <PaginationBar pageNo={result.page.pageNo} pageSize={result.page.pageSize} total={result.page.total} baseUrl="/homework/submissions" />
      </div>
    </PermissionGuard>
  );
}
