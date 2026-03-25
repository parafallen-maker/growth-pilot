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
  const result = communicationService.queryRecords(filters);
  const detail = communicationService.detailRecord(result.list[0]?.subject ?? '续费意向确认');

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="沟通记录" permissionCode={communicationPermissions.recordsView} />}>
      <div className="stack">
        <PageHeader
          title="沟通记录骨架"
          description={`P24 已铺筛选栏、时间线、记录列表、动作位和页面状态。query key: ${JSON.stringify(queryKeys.communicationRecords(filters))}`}
          actions={<><button className="btn primary">新建沟通</button><button className="btn">关联会谈</button><button className="btn">创建家庭任务</button></>}
        />
        <MetricGrid items={[
          { label: '今日沟通', value: '18', hint: '电话 / 微信 / 面谈合计' },
          { label: '待跟进家庭', value: '6', hint: '沟通后仍缺闭环动作' },
          { label: '高频渠道', value: '微信', hint: '后续接真实统计' },
          { label: '状态约定', value: '时间线 + 列表', hint: '统一保留详情和闭环位' },
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
            <TimelinePanel title="沟通时间线 / 占位" items={detail.timeline} />
            <SummaryPanel title="关联动作位" items={detail.linkedActions} />
          </div>
        </div>
        <div className="grid-2"><StateBlock state="loading" title="沟通记录 loading" /><StateBlock state="empty" title="沟通记录 empty" /></div>
      </div>
    </PermissionGuard>
  );
}
