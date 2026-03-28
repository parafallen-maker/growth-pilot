import { DataTable, FilterBar, MetricGrid, PageHeader, SummaryPanel, TabStrip } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { communicationPermissions, messageStatusTabs } from '@/features/communication/constants';
import { queryKeys } from '@/features/shared/query-keys';
import type { PageResult } from '@/lib/api-client';
import { requireCurrentUser } from '@/lib/current-user';
import { serverApiRequest } from '@/lib/server-api';
import { communicationService } from '@/services/communication-service';
import { createCommunicationMessageTask, createCommunicationTemplate, updateCommunicationMessageTaskStatus } from './actions';

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

export default async function CommunicationMessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ templateCreated?: string; code?: string; taskCreated?: string; taskUpdated?: string; status?: string; error?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const query = await searchParams;
  const allowed = hasPermission(currentUser.permissions, communicationPermissions.messagesView);
  const filters = { pageNo: 1, pageSize: 20, channel: 'all', sortBy: 'scheduledAt', sortOrder: 'desc' as const };
  const [result, families, students] = await Promise.all([
    communicationService.queryMessages(filters).catch(() => ({
      filters,
      templates: { list: [], page: { pageNo: 1, pageSize: 20, total: 0 } },
      drafts: { list: [], page: { pageNo: 1, pageSize: 20, total: 0 } },
      queued: { list: [], page: { pageNo: 1, pageSize: 20, total: 0 } },
      sent: { list: [], page: { pageNo: 1, pageSize: 20, total: 0 } },
      failed: { list: [], page: { pageNo: 1, pageSize: 20, total: 0 } },
      statusPanels: [{ name: '消息状态', detail: '消息模板与任务发送管理。' }],
    })),
    serverApiRequest<PageResult<{ id: string; familyName?: string | null; primaryContactName?: string | null; familyCode: string }>>('/families?pageNo=1&pageSize=50').catch(() => ({ list: [], page: { pageNo: 1, pageSize: 50, total: 0 } })),
    serverApiRequest<PageResult<{ id: string; name: string; studentNo: string }>>('/students?pageNo=1&pageSize=50').catch(() => ({ list: [], page: { pageNo: 1, pageSize: 50, total: 0 } })),
  ]);
  const action = communicationService.actionMessage();
  const taskOptions = [...result.drafts.list, ...result.queued.list, ...result.sent.list, ...result.failed.list];

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="消息中心" permissionCode={communicationPermissions.messagesView} />}>
      <div className="stack">
        <PageHeader
          title="消息中心"
          description="消息模板与任务管理"
          actions={<><a className="btn primary" href="#communication-message-create-form">创建消息</a><a className="btn" href="#communication-template-create-form">创建模板</a><a className="btn" href="#communication-message-status-form">更新状态</a><button className="btn">查看回执</button></>}
        />
        {query?.templateCreated ? <section className="panel"><div className="badge success">消息模板已创建：{query.templateCreated}{query.code ? ` / ${query.code}` : ''}</div></section> : null}
        {query?.taskCreated ? <section className="panel"><div className="badge success">消息任务已创建：{query.taskCreated}{query.status ? ` / status=${query.status}` : ''}</div></section> : null}
        {query?.taskUpdated ? <section className="panel"><div className="badge success">消息任务状态已更新：{query.taskUpdated}{query.status ? ` / status=${query.status}` : ''}</div></section> : null}
        {query?.error ? <section className="panel"><div className="badge warning">{decodeURIComponent(query.error)}</div></section> : null}
        <MetricGrid items={[
          { label: '模板数量', value: String(result.templates.page.total), hint: 'templates 真接口' },
          { label: '草稿箱', value: String(result.drafts.page.total), hint: 'draft tasks' },
          { label: '待发送', value: String(result.queued.page.total), hint: 'pending tasks' },
          { label: '失败 / 回执', value: `${result.failed.page.total} / ${result.sent.list.filter((item) => item.status === 'read').length}`, hint: 'failed + read 状态来自真接口' },
        ]} />
        <div className="grid-2">
          <section className="panel stack" id="communication-template-create-form">
            <div className="page-header">
              <div>
                <h3>新建模板</h3>
                <p>当前表单直连 POST /communication/templates。</p>
              </div>
              <span className="badge success">POST /communication/templates</span>
            </div>
            <form className="form-grid" action={createCommunicationTemplate}>
              <div className="field"><label>模板编码</label><input className="input" name="code" placeholder="invoice-reminder-custom" required /></div>
              <div className="field"><label>模板名称</label><input className="input" name="name" placeholder="账单提醒模板" required /></div>
              <div className="field"><label>渠道</label><select className="select" name="channel" defaultValue="wechat"><option value="wechat">wechat</option><option value="wecom">wecom</option><option value="sms">sms</option></select></div>
              <div className="field"><label>状态</label><select className="select" name="status" defaultValue="active"><option value="active">active</option><option value="inactive">inactive</option></select></div>
              <div className="field form-span-2"><label>主题</label><input className="input" name="subject" placeholder="3 月账单提醒" /></div>
              <div className="field form-span-2"><label>模板内容</label><textarea className="textarea" name="bodyTemplate" placeholder="家长您好，{studentName} 的账单将于 {dueDate} 到期……" required /></div>
              <div className="field form-span-2"><label>变量（逗号分隔）</label><input className="input" name="variables" placeholder="studentName,dueDate,amount" /></div>
              <div className="button-row form-span-2"><button className="btn primary" type="submit">创建模板</button></div>
            </form>
          </section>
          <section className="panel stack" id="communication-message-create-form">
            <div className="page-header">
              <div>
                <h3>创建消息任务</h3>
                <p>创建消息任务，选择模板并指定接收人。</p>
              </div>
              <span className="badge success">POST /communication/message-tasks</span>
            </div>
            <form className="form-grid" action={createCommunicationMessageTask}>
              <div className="field"><label>模板（可选）</label><select className="select" name="templateId" defaultValue=""><option value="">不使用模板</option>{result.templates.list.map((template) => <option key={template.templateId} value={template.templateId}>{template.templateName} / {template.channel}</option>)}</select></div>
              <div className="field"><label>家庭</label><select className="select" name="familyId" defaultValue={families.list[0]?.id ?? ''} required>{families.list.length ? families.list.map((family) => <option key={family.id} value={family.id}>{family.familyName ?? family.primaryContactName ?? family.familyCode}</option>) : <option value="">暂无家庭</option>}</select></div>
              <div className="field"><label>学生（可选）</label><select className="select" name="studentId" defaultValue=""><option value="">不绑定学生</option>{students.list.map((student) => <option key={student.id} value={student.id}>{student.name} / {student.studentNo}</option>)}</select></div>
              <div className="field"><label>渠道</label><select className="select" name="channel" defaultValue="wechat"><option value="wechat">wechat</option><option value="wecom">wecom</option><option value="sms">sms</option><option value="phone">phone</option></select></div>
              <div className="field"><label>状态</label><select className="select" name="status" defaultValue="draft"><option value="draft">draft</option><option value="pending">pending</option><option value="sent">sent</option><option value="failed">failed</option></select></div>
              <div className="field"><label>计划发送时间</label><input className="input" type="datetime-local" name="scheduledAt" /></div>
              <div className="field form-span-2"><label>消息主题</label><input className="input" name="subject" placeholder="作业提醒 / 账单提醒 / 周报推送" /></div>
              <div className="field form-span-2"><label>消息正文</label><textarea className="textarea" name="body" placeholder="如果不使用模板，可直接填写消息正文。" required /></div>
              <div className="field form-span-2"><label>失败原因（仅 failed 状态使用）</label><input className="input" name="failureReason" placeholder="通道异常 / 黑名单 / 参数错误" /></div>
              <div className="button-row form-span-2"><button className="btn primary" type="submit">创建消息任务</button></div>
            </form>
          </section>
        </div>
        <section className="panel stack" id="communication-message-status-form">
          <div className="page-header">
            <div>
              <h3>更新消息任务状态</h3>
              <p>当前状态更新走 PATCH /communication/message-tasks/{'{id}'}/status。</p>
            </div>
            <span className="badge">PATCH message_tasks</span>
          </div>
          <form className="form-grid" action={updateCommunicationMessageTaskStatus}>
            <div className="field form-span-2"><label>消息任务</label><select className="select" name="taskId" defaultValue={taskOptions[0]?.messageId ?? ''} required>{taskOptions.length ? taskOptions.map((task) => <option key={task.messageId} value={task.messageId}>{task.messageType} / {task.familyName} / {task.status}</option>) : <option value="">暂无消息任务</option>}</select></div>
            <div className="field"><label>目标状态</label><select className="select" name="status" defaultValue="pending"><option value="draft">draft</option><option value="pending">pending</option><option value="sent">sent</option><option value="failed">failed</option><option value="read">read</option></select></div>
            <div className="field"><label>发送时间（sent 可选）</label><input className="input" type="datetime-local" name="sentAt" /></div>
            <div className="field form-span-2"><label>失败原因</label><input className="input" name="failureReason" placeholder="仅 failed 状态需要填写" /></div>
            <div className="button-row form-span-2"><button className="btn primary" type="submit" disabled={!taskOptions.length}>更新状态</button></div>
          </form>
        </section>
        <FilterBar fields={[
          { label: '家庭筛选', value: '全部家庭', kind: 'select' },
          { label: '学生筛选', value: '全部学生', kind: 'select' },
          { label: '关键词', value: '消息编号 / 家庭 / 学生' },
          { label: '渠道', value: '全部渠道', kind: 'select' },
          { label: '消息状态', value: '全部状态', kind: 'select' },
          { label: '开始时间', value: '当前列表未接后端 query 参数' },
          { label: '结束时间', value: '当前列表未接后端 query 参数' },
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
