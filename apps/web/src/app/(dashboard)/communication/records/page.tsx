import { DataTable, FilterBar, MetricGrid, PageHeader, StateBlock, SummaryPanel, TimelinePanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { communicationPermissions } from '@/features/communication/constants';
import { queryKeys } from '@/features/shared/query-keys';
import { getCurrentUser } from '@/lib/current-user';
import { communicationService } from '@/services/communication-service';

export default async function CommunicationRecordsPage() {
  const currentUser = await getCurrentUser();
  const allowed = hasPermission(currentUser.permissions, communicationPermissions.recordsView);
  const filters = { pageNo: 1, pageSize: 20, campusId: 'campus-guiyang', keyword: '张家', channel: 'all', direction: 'all', dateFrom: '2026-03-20', dateTo: '2026-03-25', sortBy: 'occurredAt', sortOrder: 'desc' as const };
  const result = await communicationService.queryRecords(filters);
  const detail = result.list[0] ? await communicationService.detailRecord(result.list[0].recordId) : { timeline: [], linkedActions: [], subject: '--' };

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="沟通记录" permissionCode={communicationPermissions.recordsView} />}>
      <div className="stack">
        <PageHeader
          title="沟通记录"
          description={`P24 已从本地假数据切到 communication records 真接口。query key: ${JSON.stringify(queryKeys.communicationRecords(filters))}`}
          actions={<><button className="btn primary">新建沟通</button><button className="btn">关联会谈</button><button className="btn">创建家庭任务</button></>}
        />
        <MetricGrid items={[
          { label: '当前记录数', value: String(result.page.total), hint: 'communication/records 持久化台账' },
          { label: '当前筛选首条主题', value: result.list[0]?.subject ?? '--', hint: '来自真接口首条记录' },
          { label: '高频渠道', value: result.list[0]?.channel ?? '--', hint: '后续可补真实聚合统计' },
          { label: '明确留坑', value: 'meeting/task 聚合未接', hint: '详情页先展示 nextAction，不伪造反查闭环' },
        ]} />
        <FilterBar fields={[
          { label: '家庭筛选', value: '全部家庭', kind: 'select' },
          { label: '学生筛选', value: '全部学生', kind: 'select' },
          { label: '关键词', value: '家庭 / 学生 / 主题' },
          { label: '渠道', value: '全部渠道', kind: 'select' },
          { label: '方向', value: '全部方向', kind: 'select' },
          { label: '开始时间', value: '2026-03-20' },
          { label: '结束时间', value: '2026-03-25' },
        ]} />
        <div className="grid-billing-layout">
          <DataTable title="沟通记录列表" columns={['时间', '家庭', '学生', '渠道', '方向', '主题', '记录人', '动作']} rows={result.list.map((item) => [item.occurredAt, item.familyName, item.studentName, item.channel, item.direction, item.subject, item.recorder, item.actions])} />
          <div className="stack">
            <TimelinePanel title="沟通时间线" items={detail.timeline} />
            <SummaryPanel title="关联动作位" items={detail.linkedActions} />
          </div>
        </div>
        <div className="grid-2"><StateBlock state="loading" title="沟通记录 loading" /><StateBlock state="empty" title="沟通记录 empty" /></div>
      </div>
    </PermissionGuard>
  );
}
