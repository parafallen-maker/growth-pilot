import { DataTable, FilterBar, MetricGrid, PageHeader, SummaryPanel, TimelinePanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { communicationPermissions } from '@/features/communication/constants';
import { queryKeys } from '@/features/shared/query-keys';
import type { PageResult } from '@/lib/api-client';
import { requireCurrentUser } from '@/lib/current-user';
import { serverApiRequest } from '@/lib/server-api';
import { communicationService } from '@/services/communication-service';
import { createCommunicationRecord } from './actions';

export default async function CommunicationRecordsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; topic?: string; error?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const query = await searchParams;
  const allowed = hasPermission(currentUser.permissions, communicationPermissions.recordsView);
  const filters = { pageNo: 1, pageSize: 20, keyword: '', channel: 'all', sortBy: 'updatedAt', sortOrder: 'desc' as const };
  const [result, families, students] = await Promise.all([
    communicationService.queryRecords(filters).catch(() => ({
      list: [],
      page: { pageNo: 1, pageSize: 20, total: 0 },
    })),
    serverApiRequest<PageResult<{ id: string; familyName?: string | null; primaryContactName?: string | null; familyCode: string }>>('/families?pageNo=1&pageSize=50').catch(() => ({ list: [], page: { pageNo: 1, pageSize: 50, total: 0 } })),
    serverApiRequest<PageResult<{ id: string; name: string; studentNo: string }>>('/students?pageNo=1&pageSize=50').catch(() => ({ list: [], page: { pageNo: 1, pageSize: 50, total: 0 } })),
  ]);
  const detail = result.list[0]
    ? await communicationService.detailRecord(result.list[0].recordId).catch(() => ({ timeline: [], linkedActions: [], subject: '--' }))
    : { timeline: [], linkedActions: [], subject: '--' };
  const channelCount = result.list.reduce<Map<string, number>>((map, item) => {
    map.set(item.channel, (map.get(item.channel) ?? 0) + 1);
    return map;
  }, new Map());
  const topChannel = [...channelCount.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? '--';

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="沟通记录" permissionCode={communicationPermissions.recordsView} />}>
      <div className="stack">
        <PageHeader
          title="沟通记录"
          description="家校沟通记录管理"
          actions={<><a className="btn primary" href="#communication-record-create-form">新建沟通</a><button className="btn">关联会谈</button><button className="btn">创建家庭任务</button></>}
        />
        {query?.created ? <section className="panel"><div className="badge success">沟通记录已创建：{query.created}{query.topic ? ` / ${query.topic}` : ''}</div></section> : null}
        {query?.error ? <section className="panel"><div className="badge warning">{decodeURIComponent(query.error)}</div></section> : null}
        <MetricGrid items={[
          { label: '当前记录数', value: String(result.page.total), hint: 'communication/records 持久化台账' },
          { label: '当前筛选首条主题', value: result.list[0]?.subject ?? '--', hint: '来自真接口首条记录' },
          { label: '高频渠道', value: topChannel, hint: '按当前页真实记录聚合' },
          { label: '后端缺口', value: 'meeting / 家庭任务聚合未开放', hint: '详情页先展示 nextAction，不伪造反查闭环' },
        ]} />
        <section className="panel stack" id="communication-record-create-form">
          <div className="page-header">
            <div>
              <h3>新建沟通记录</h3>
              <p>当前表单直连 POST /communication/records；meeting / 家庭任务反查缺口继续明确展示，不伪造闭环。</p>
            </div>
            <span className="badge success">POST /communication/records</span>
          </div>
          <form className="form-grid" action={createCommunicationRecord}>
            <div className="field"><label>家庭</label><select className="select" name="familyId" defaultValue={families.list[0]?.id ?? ''} required>{families.list.length ? families.list.map((family) => <option key={family.id} value={family.id}>{family.familyName ?? family.primaryContactName ?? family.familyCode}</option>) : <option value="">暂无家庭</option>}</select></div>
            <div className="field"><label>学生（可选）</label><select className="select" name="studentId" defaultValue=""><option value="">不绑定学生</option>{students.list.map((student) => <option key={student.id} value={student.id}>{student.name} / {student.studentNo}</option>)}</select></div>
            <div className="field"><label>渠道</label><select className="select" name="channel" defaultValue="phone"><option value="phone">phone</option><option value="wechat">wechat</option><option value="wecom">wecom</option><option value="sms">sms</option><option value="meeting">meeting</option></select></div>
            <div className="field"><label>方向</label><select className="select" name="direction" defaultValue="outbound"><option value="outbound">outbound</option><option value="inbound">inbound</option><option value="onsite">onsite</option></select></div>
            <div className="field form-span-2"><label>主题</label><input className="input" name="topic" placeholder="月考反馈沟通 / 续费异议解释 / 作业跟进" required /></div>
            <div className="field form-span-2"><label>摘要</label><textarea className="textarea" name="summary" placeholder="本次沟通的核心内容、家长问题、已确认事项" required /></div>
            <div className="field form-span-2"><label>后续动作</label><textarea className="textarea" name="nextAction" placeholder="下一次回访时间、需要拉通的老师、待补资料等" /></div>
            <div className="button-row form-span-2"><button className="btn primary" type="submit">创建沟通记录</button></div>
          </form>
        </section>
        <FilterBar fields={[
          { label: '家庭筛选', value: '全部家庭', kind: 'select' },
          { label: '学生筛选', value: '全部学生', kind: 'select' },
          { label: '关键词', value: '家庭 / 学生 / 主题' },
          { label: '渠道', value: '全部渠道', kind: 'select' },
          { label: '方向', value: '当前列表未接后端 query 参数', kind: 'select' },
          { label: '开始时间', value: '当前列表未接后端 query 参数' },
          { label: '结束时间', value: '当前列表未接后端 query 参数' },
        ]} />
        <div className="grid-billing-layout">
          <DataTable title="沟通记录列表" columns={['时间', '家庭', '学生', '渠道', '方向', '主题', '记录人', '动作']} rows={result.list.map((item) => [item.occurredAt, item.familyName, item.studentName, item.channel, item.direction, item.subject, item.recorder, item.actions])} />
          <div className="stack">
            <TimelinePanel title="沟通时间线" items={detail.timeline} />
            <SummaryPanel title="关联动作位" items={detail.linkedActions} />
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
