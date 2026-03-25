import { DataTable, FilterBar, PageHeader, SummaryPanel, TimelinePanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { billingPermissions } from '@/features/billing/constants';
import { queryKeys } from '@/features/shared/query-keys';
import type { PageResult } from '@/lib/api-client';
import { requireCurrentUser } from '@/lib/current-user';
import { serverApiRequest } from '@/lib/server-api';
import { billingService } from '@/services/billing-service';
import { createBillingRenewal, updateBillingRenewalFollowUp, updateBillingRenewalStatus } from './actions';

export default async function BillingRenewalsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; statusUpdated?: string; followUpUpdated?: string; status?: string; nextFollowUpAt?: string; error?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const query = await searchParams;
  const allowed = hasPermission(currentUser.permissions, billingPermissions.renewalsView);
  const filters = { pageNo: 1, pageSize: 20, status: 'all', sortBy: 'contractExpiryDate', sortOrder: 'asc' as const };
  const [result, families, students, contracts, users] = await Promise.all([
    billingService.queryRenewals(filters),
    serverApiRequest<PageResult<{ id: string; familyName?: string | null; primaryContactName?: string | null; familyCode: string }>>('/families?pageNo=1&pageSize=50').catch(() => ({ list: [], page: { pageNo: 1, pageSize: 50, total: 0 } })),
    serverApiRequest<PageResult<{ id: string; name: string; studentNo: string }>>('/students?pageNo=1&pageSize=50').catch(() => ({ list: [], page: { pageNo: 1, pageSize: 50, total: 0 } })),
    billingService.queryContracts({ pageNo: 1, pageSize: 50, status: 'all' }),
    serverApiRequest<PageResult<{ id: string; displayName: string }>>('/users?pageNo=1&pageSize=100').catch(() => ({ list: [], page: { pageNo: 1, pageSize: 100, total: 0 } })),
  ]);

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="续费跟进" permissionCode={billingPermissions.renewalsView} />}>
      <div className="stack">
        <PageHeader
          title="续费跟进"
          description={`当前展示 billing/renewals 真实数据，包含续费池与跟进时间线。query key: ${JSON.stringify(queryKeys.billingRenewals(filters))}`}
          actions={<><a className="btn primary" href="#renewal-status-form">更新跟进状态</a><a className="btn" href="#renewal-create-form">新建续费任务</a><a className="btn" href="#renewal-follow-up-form">更新下次跟进</a></>}
        />
        {query?.created ? <section className="panel"><div className="badge success">续费任务已创建：{query.created}{query.status ? ` / status=${query.status}` : ''}</div></section> : null}
        {query?.statusUpdated ? <section className="panel"><div className="badge success">续费状态已更新：{query.statusUpdated}{query.status ? ` / status=${query.status}` : ''}</div></section> : null}
        {query?.followUpUpdated ? <section className="panel"><div className="badge success">下次跟进已更新：{query.followUpUpdated}{query.nextFollowUpAt ? ` / ${query.nextFollowUpAt}` : ''}</div></section> : null}
        {query?.error ? <section className="panel"><div className="badge warning">{decodeURIComponent(query.error)}</div></section> : null}
        <section className="panel stack" id="renewal-create-form">
          <div className="page-header">
            <div>
              <h3>新建续费任务</h3>
              <p>当前表单直连 POST /billing/renewals，用已有家庭、学生、负责人做真实选择。</p>
            </div>
            <span className="badge success">POST /billing/renewals</span>
          </div>
          <form className="form-grid" action={createBillingRenewal}>
            <div className="field"><label>家庭</label><select className="select" name="familyId" defaultValue={families.list[0]?.id ?? ''} required>{families.list.length ? families.list.map((family) => <option key={family.id} value={family.id}>{family.familyName ?? family.primaryContactName ?? family.familyCode}</option>) : <option value="">暂无家庭</option>}</select></div>
            <div className="field"><label>学生</label><select className="select" name="studentId" defaultValue={students.list[0]?.id ?? ''} required>{students.list.length ? students.list.map((student) => <option key={student.id} value={student.id}>{student.name} / {student.studentNo}</option>) : <option value="">暂无学生</option>}</select></div>
            <div className="field"><label>关联合同（可选）</label><select className="select" name="contractId" defaultValue=""><option value="">不关联合同</option>{contracts.list.map((contract) => <option key={contract.contractId} value={contract.contractId}>{contract.contractNo} / {contract.studentName}</option>)}</select></div>
            <div className="field"><label>负责人（可选）</label><select className="select" name="ownerUserId" defaultValue=""><option value="">暂不分配</option>{users.list.map((user) => <option key={user.id} value={user.id}>{user.displayName}</option>)}</select></div>
            <div className="field"><label>校区 ID（可选）</label><input className="input" name="campusId" placeholder={currentUser.campusIds[0] ?? 'campus-001'} /></div>
            <div className="field"><label>学期 ID（可选）</label><input className="input" name="termId" placeholder="term-2026-spring" /></div>
            <div className="field"><label>预估到期日</label><input className="input" type="date" name="expectedEndDate" /></div>
            <div className="field"><label>当前状态</label><select className="select" name="status" defaultValue="todo"><option value="todo">todo</option><option value="contacting">contacting</option><option value="won">won</option><option value="lost">lost</option></select></div>
            <div className="field"><label>最近联系时间</label><input className="input" type="datetime-local" name="lastContactAt" /></div>
            <div className="field"><label>下次跟进时间</label><input className="input" type="datetime-local" name="nextFollowUpAt" /></div>
            <div className="field form-span-2"><label>备注</label><textarea className="textarea" name="note" placeholder="续费风险、优惠策略、家庭反馈等" /></div>
            <div className="button-row form-span-2"><button className="btn primary" type="submit">创建续费任务</button></div>
          </form>
        </section>
        <div className="grid-2">
          <section className="panel stack" id="renewal-status-form">
            <div className="page-header">
              <div>
                <h3>更新跟进状态</h3>
                <p>状态更新走 PATCH /billing/renewals/{'{id}'}/status。</p>
              </div>
              <span className="badge">PATCH status</span>
            </div>
            <form className="form-grid" action={updateBillingRenewalStatus}>
              <div className="field form-span-2"><label>续费任务</label><select className="select" name="renewalId" defaultValue={result.list[0]?.renewalId ?? ''} required>{result.list.length ? result.list.map((item) => <option key={item.renewalId} value={item.renewalId}>{item.studentName} / {item.familyName} / {item.status}</option>) : <option value="">暂无续费任务</option>}</select></div>
              <div className="field"><label>状态</label><select className="select" name="status" defaultValue={result.list[0]?.status ?? 'contacting'}><option value="todo">todo</option><option value="contacting">contacting</option><option value="won">won</option><option value="lost">lost</option></select></div>
              <div className="field"><label>最近联系时间</label><input className="input" type="datetime-local" name="lastContactAt" /></div>
              <div className="field form-span-2"><label>备注</label><textarea className="textarea" name="note" placeholder="本次跟进反馈、风险判断、下一步动作" /></div>
              <div className="button-row form-span-2"><button className="btn primary" type="submit" disabled={!result.list.length}>更新状态</button></div>
            </form>
          </section>
          <section className="panel stack" id="renewal-follow-up-form">
            <div className="page-header">
              <div>
                <h3>更新下次跟进</h3>
                <p>下次跟进走 PATCH /billing/renewals/{'{id}'}/follow-up。</p>
              </div>
              <span className="badge">PATCH follow-up</span>
            </div>
            <form className="form-grid" action={updateBillingRenewalFollowUp}>
              <div className="field form-span-2"><label>续费任务</label><select className="select" name="renewalId" defaultValue={result.list[0]?.renewalId ?? ''} required>{result.list.length ? result.list.map((item) => <option key={item.renewalId} value={item.renewalId}>{item.studentName} / {item.nextFollowUpAt}</option>) : <option value="">暂无续费任务</option>}</select></div>
              <div className="field form-span-2"><label>下次跟进时间</label><input className="input" type="datetime-local" name="nextFollowUpAt" required /></div>
              <div className="field form-span-2"><label>备注</label><textarea className="textarea" name="note" placeholder="本次安排的联系计划、负责同事、话术提醒" /></div>
              <div className="button-row form-span-2"><button className="btn primary" type="submit" disabled={!result.list.length}>更新下次跟进</button></div>
            </form>
          </section>
        </div>
        <FilterBar fields={[
          { label: '家庭', value: '全部家庭', kind: 'select' },
          { label: '学生', value: '全部学生', kind: 'select' },
          { label: '关键词', value: '家庭 / 学生 / 负责人' },
          { label: '状态', value: '全部状态', kind: 'select' },
          { label: '负责人', value: '全部负责人（真实 owner 已解析展示）', kind: 'select' },
        ]} />
        <div className="grid-billing-layout">
          <DataTable title="续费跟进池" columns={['家庭', '学生', '合同到期日', '当前状态', '负责人', '下次跟进时间', '动作']} rows={result.list.map((item) => [item.familyName, item.studentName, item.contractExpiryDate, item.status, item.owner, item.nextFollowUpAt, item.actions])} />
          <div className="stack">
            <TimelinePanel title="跟进时间线" items={result.list.map((item) => ({ title: `${item.studentName} · ${item.status}`, detail: `${item.owner} · 下次跟进 ${item.nextFollowUpAt}` }))} />
            <SummaryPanel title="页面说明" items={[{ name: '无数据时', detail: '若当前没有临期合同，保留时间线区域与筛选项，并明确展示空结果。' }]} />
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}
