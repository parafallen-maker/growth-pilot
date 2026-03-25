import Link from 'next/link';
import { PermissionGuard } from '@/components/business/permission-guard';
import { DataTable, FilterBar, MetricGrid, PageHeader } from '@/components/business/page-blocks';
import { homeworkPermissions } from '@/features/homework/constants';
import { queryKeys } from '@/features/shared/query-keys';
import { requireCurrentUser } from '@/lib/current-user';
import { homeworkService } from '@/services/homework-service';

export default async function HomeworkSubmissionsPage() {
  const currentUser = await requireCurrentUser();
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
  const result = await homeworkService.query(filters);
  const pendingAi = result.list.filter((item) => item.aiStatus === 'pending' || item.aiStatus === 'queued').length;
  const reviewing = result.list.filter((item) => ['reviewing', 'unreviewed', 'draft'].includes(item.reviewStatus)).length;
  const reviewed = result.list.filter((item) => ['reviewed', 'published'].includes(item.reviewStatus)).length;

  return (
    <PermissionGuard allowed={currentUser.permissions.includes(homeworkPermissions.submissionsView)}>
      <div className="stack">
        <PageHeader
          title="作业提交队列"
          description={`真实列表接口已接：${JSON.stringify(queryKeys.homeworkSubmissions(filters))}`}
          actions={
            <>
              <button className="btn primary">上传作业</button>
              <button className="btn">批量触发分析</button>
              <button className="btn">导出</button>
            </>
          }
        />

        <MetricGrid
          items={[
            { label: '当前页记录', value: String(result.list.length), hint: `total ${result.page.total}` },
            { label: '待 AI', value: String(pendingAi), hint: 'pending / queued' },
            { label: '待复核', value: String(reviewing), hint: 'reviewing / unreviewed / draft' },
            { label: '已完成', value: String(reviewed), hint: 'reviewed / published' },
          ]}
        />

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
          rows={result.list.map((item) => [
            item.submissionNo,
            item.studentName,
            item.subject,
            item.submittedAt,
            item.aiStatus,
            item.finalAccuracy,
            item.reviewStatus,
            item.teacherName,
            item.actions,
          ])}
        />

        <section className="panel">
          <h3>行内动作</h3>
          <div className="summary-list" style={{ marginTop: 12 }}>
            {result.list.map((item) => (
              <div className="summary-item" key={item.submissionId}>
                <strong>{item.submissionNo}</strong>
                <div className="subtle">{item.studentName} / {item.subject} / {item.actions}</div>
                <div className="button-row" style={{ marginTop: 10 }}>
                  <button className="btn">预览附件</button>
                  <button className="btn">触发 AI</button>
                  <Link className="btn primary" href={`/homework/review/${item.submissionId}`}>
                    进入复核台
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PermissionGuard>
  );
}
