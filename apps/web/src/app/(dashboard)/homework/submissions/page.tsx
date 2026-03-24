import Link from 'next/link';
import { PermissionGuard } from '@/components/business/permission-guard';
import { DataTable, FilterBar, MetricGrid, PageHeader, StateBlock } from '@/components/business/page-blocks';
import { homeworkPermissions } from '@/features/homework/constants';
import { queryKeys } from '@/features/shared/query-keys';
import { mockCurrentUser } from '@/lib/navigation';
import { homeworkService } from '@/services/homework-service';

export default function HomeworkSubmissionsPage() {
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
  const result = homeworkService.query(filters);

  return (
    <PermissionGuard allowed={mockCurrentUser.permissions.includes(homeworkPermissions.submissionsView)}>
      <div className="stack">
        <PageHeader
          title="作业提交队列骨架"
          description={`P10 已铺 submissions 列表、筛选栏、表格与行动作占位。query key: ${JSON.stringify(queryKeys.homeworkSubmissions(filters))}`}
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
            { label: '待 AI', value: '12', hint: 'queued + pending，占位统计卡' },
            { label: '待复核', value: '8', hint: 'reviewStatus=draft / pending' },
            { label: 'AI 失败', value: '2', hint: '支持失败重试入口占位' },
            { label: '今日提交', value: '31', hint: '后续接 overview/列表筛选联动' },
          ]}
        />

        <FilterBar
          fields={[
            { label: '关键词', value: '学生 / 提交编号' },
            { label: '学科', value: '全部学科', kind: 'select' },
            { label: '责任老师', value: '全部老师', kind: 'select' },
            { label: 'AI 状态', value: '全部状态', kind: 'select' },
            { label: '复核状态', value: '全部状态', kind: 'select' },
            { label: '开始日期', value: '2026-03-18' },
            { label: '结束日期', value: '2026-03-24' },
          ]}
        />

        <DataTable
          title="作业提交列表"
          columns={['提交编号', '学生', '学科', '日期', 'AI 状态', '最终正确率', '复核状态', '责任老师', '行动作']}
          rows={result.list.map((item) => [
            item.submissionId,
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

        <div className="grid-2">
          <StateBlock state="loading" title="列表 loading" />
          <StateBlock state="empty" title="筛选结果 empty" />
        </div>

        <section className="panel">
          <h3>行内动作约定</h3>
          <div className="summary-list" style={{ marginTop: 12 }}>
            {result.list.map((item) => (
              <div className="summary-item" key={item.submissionId}>
                <strong>{item.submissionId}</strong>
                <div className="subtle">{item.actions}</div>
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
