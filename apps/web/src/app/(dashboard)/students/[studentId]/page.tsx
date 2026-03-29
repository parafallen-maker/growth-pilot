import Link from 'next/link';
import { MetricGrid, PageHeader, SummaryPanel, TimelinePanel } from '@/components/business/page-blocks';
import { studentService } from '@/services/students-service';
import { PageBreadcrumbs } from '../../_components/page-breadcrumbs';

function currency(amountCents: number) {
  return `¥${(amountCents / 100).toLocaleString('zh-CN')}`;
}

function statusText(status?: string | null) {
  switch (status) {
    case 'active':
      return '在读';
    case 'trial':
      return '试听';
    case 'inactive':
      return '停读';
    default:
      return status ?? '--';
  }
}

export default async function Student360Page({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const aggregate = await studentService.detail360(studentId);

  return (
    <div className="stack">
      <PageBreadcrumbs items={[{ label: '学生列表', href: '/students' }, { label: aggregate.student.name }]} />
      <PageHeader
        title={`Student 360 · ${aggregate.student.name}`}
        description={`${aggregate.student.studentNo} / ${aggregate.student.gradeLabel} / ${aggregate.currentEnrollment?.campusId ?? '--'} / 状态 ${statusText(aggregate.student.status)}`}
        actions={<><Link className="btn" href="/students">返回列表</Link><Link className="btn primary" href="/communication/records">查看沟通台账</Link></>}
      />

      <MetricGrid
        items={[
          { label: '已复核作业', value: String(aggregate.homeworkSummary.reviewedCount), hint: `待复核 ${aggregate.homeworkSummary.pendingReviewCount}` },
          { label: '平均正确率', value: aggregate.homeworkSummary.averageAccuracyPct != null ? `${aggregate.homeworkSummary.averageAccuracyPct}%` : '--', hint: aggregate.homeworkSummary.latestHomeworkDate ?? '暂无作业记录' },
          { label: '成长观察', value: String(aggregate.growthSummary.observationCount), hint: `活跃目标 ${aggregate.growthSummary.activeGoalCount}` },
          { label: '未收金额', value: currency(aggregate.billingSummary.outstandingAmount), hint: `未结账单 ${aggregate.billingSummary.unpaidInvoiceCount}` },
        ]}
      />

      <div className="grid-2">
        <SummaryPanel
          title="基础档案"
          items={[
            { name: '学生主档', detail: `${aggregate.student.name} / ${aggregate.student.studentNo} / ${aggregate.student.gradeLabel}` },
            { name: '在读档', detail: aggregate.currentEnrollment ? `${aggregate.currentEnrollment.campusId} / ${aggregate.currentEnrollment.termId} / ${aggregate.currentEnrollment.primaryTeacherId ?? '未分配老师'}` : '暂无在读档' },
            { name: '家庭', detail: aggregate.family ? `${aggregate.family.familyName ?? aggregate.family.primaryContactName ?? aggregate.family.id}` : '未关联家庭' },
            { name: '监护人', detail: aggregate.guardians.length ? aggregate.guardians.map((guardian) => `${guardian.name}（${guardian.relation}）`).join('、') : '暂无监护人' },
          ]}
        />

        <SummaryPanel
          title="360 摘要"
          items={[
            { name: '最近反馈', detail: aggregate.homeworkSummary.latestFeedback ?? '暂无作业反馈' },
            { name: '最近成长亮点', detail: aggregate.growthSummary.latestStrengths ?? '暂无成长亮点' },
            { name: '最近改进建议', detail: aggregate.growthSummary.latestImprovementNotes ?? '暂无改进建议' },
            { name: '最近支付', detail: aggregate.billingSummary.latestPaymentDate ?? '暂无支付记录' },
            { name: '最近出勤', detail: aggregate.attendanceSummary.lastAttendanceDate ?? '暂无出勤记录' },
          ]}
        />
      </div>

      <div className="grid-2">
        <SummaryPanel
          title="趋势与经营"
          items={[
            { name: '作业趋势', detail: aggregate.homeworkSummary.trend.length ? aggregate.homeworkSummary.trend.map((item) => `${item.date}:${item.accuracyPct}%`).join(' / ') : '暂无趋势数据' },
            { name: '成长报告周期', detail: aggregate.growthSummary.latestReportPeriod ?? '暂无成长报告' },
            { name: '出勤统计', detail: `到校 ${aggregate.attendanceSummary.presentDays} / 缺勤 ${aggregate.attendanceSummary.absentDays} / 平均学习 ${aggregate.attendanceSummary.averageStudyMinutes} 分钟` },
            { name: '合同与余额', detail: `有效合同 ${aggregate.billingSummary.activeContractCount} / 余额 ${currency(aggregate.billingSummary.balanceAmount)}` },
          ]}
        />

        <TimelinePanel
          title="最近时间线"
          items={aggregate.recentTimeline.map((item) => ({
            title: `${item.type} · ${item.title}`,
            detail: `${item.occurredAt}${item.status ? ` / ${item.status}` : ''}${item.summary ? ` / ${item.summary}` : ''}`,
          }))}
        />
      </div>
    </div>
  );
}
