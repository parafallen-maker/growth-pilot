import { DataTable, FilterBar, MetricGrid, PageHeader, SummaryPanel, TabStrip } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { communicationPermissions, messageStatusTabs } from '@/features/communication/constants';
import { queryKeys } from '@/features/shared/query-keys';
import { requireCurrentUser } from '@/lib/current-user';
import { communicationService } from '@/services/communication-service';

function MessageStatusTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: string[][];
}) {
  return <DataTable title={title} columns={columns} rows={rows} />;
}

export default async function CommunicationMessagesPage() {
  const currentUser = await requireCurrentUser();
  const allowed = hasPermission(currentUser.permissions, communicationPermissions.messagesView);
  const filters = { pageNo: 1, pageSize: 20, campusId: 'campus-guiyang', channel: 'all', dateFrom: '2026-03-20', dateTo: '2026-03-25', sortBy: 'scheduledAt', sortOrder: 'desc' as const };
  const result = await communicationService.queryMessages(filters);
  const action = communicationService.actionMessage();

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="消息中心" permissionCode={communicationPermissions.messagesView} />}>
      <div className="stack">
        <PageHeader
          title="消息中心"
          description={`当前展示 communication/templates 与 message_tasks 真实数据。query key: ${JSON.stringify(queryKeys.communicationMessages(filters))}`}
          actions={<><button className="btn primary">创建消息</button><button className="btn">立即发送</button><button className="btn">重试失败</button><button className="btn">查看回执</button></>}
        />
        <MetricGrid items={[
          { label: '模板数量', value: String(result.templates.page.total), hint: 'templates 真接口' },
          { label: '草稿箱', value: String(result.drafts.page.total), hint: 'draft tasks' },
          { label: '待发送', value: String(result.queued.page.total), hint: 'pending tasks' },
          { label: '失败 / 回执', value: `${result.failed.page.total} / ${result.sent.list.filter((item) => item.status === 'read').length}`, hint: 'failed + read 状态来自真接口' },
        ]} />
        <FilterBar fields={[
          { label: '家庭筛选', value: '全部家庭', kind: 'select' },
          { label: '学生筛选', value: '全部学生', kind: 'select' },
          { label: '关键词', value: '消息编号 / 家庭 / 学生' },
          { label: '渠道', value: '全部渠道', kind: 'select' },
          { label: '消息状态', value: '全部状态', kind: 'select' },
          { label: '开始时间', value: '2026-03-20' },
          { label: '结束时间', value: '2026-03-25' },
        ]} />
        <section className="panel stack">
          <TabStrip tabs={[...messageStatusTabs]} active="模板" />
          <MessageStatusTable title="模板区块" columns={['模板名', '类型', '渠道', '最近更新时间', '负责人', '动作']} rows={result.templates.list.map((item) => [item.templateName, item.messageType, item.channel, item.lastUpdatedAt, item.owner, item.actions])} />
        </section>
        <div className="grid-2">
          <MessageStatusTable title="草稿区块" columns={['类型', '家庭', '学生', '渠道', '计划发送时间', '状态', '动作']} rows={result.drafts.list.map((item) => [item.messageType, item.familyName, item.studentName, item.channel, item.scheduledAt, item.status, item.actions])} />
          <MessageStatusTable title="待发送区块" columns={['类型', '家庭', '学生', '渠道', '计划发送时间', '状态', '动作']} rows={result.queued.list.map((item) => [item.messageType, item.familyName, item.studentName, item.channel, item.scheduledAt, item.status, item.actions])} />
        </div>
        <div className="grid-2">
          <MessageStatusTable title="已发送 / 回执区块" columns={['类型', '家庭', '学生', '渠道', '发送时间', '状态', '动作']} rows={result.sent.list.map((item) => [item.messageType, item.familyName, item.studentName, item.channel, item.scheduledAt, item.status, item.actions])} />
          <MessageStatusTable title="失败区块" columns={['类型', '家庭', '学生', '渠道', '失败时间', '状态', '动作']} rows={result.failed.list.map((item) => [item.messageType, item.familyName, item.studentName, item.channel, item.scheduledAt, item.status, item.actions])} />
        </div>
        <SummaryPanel title="状态设计 / 动作位" items={[...result.statusPanels, { name: '统一动作集', detail: action.actions.join(' / ') }, { name: '页面约束', detail: action.note }]} />
      </div>
    </PermissionGuard>
  );
}
