import { DataTable, FilterBar, PageHeader, SummaryPanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { billingPermissions } from '@/features/billing/constants';
import { queryKeys } from '@/features/shared/query-keys';
import { requireCurrentUser } from '@/lib/current-user';
import { billingService } from '@/services/billing-service';
import { familyService } from '@/services/families-service';
import { studentService } from '@/services/students-service';
import { createBillingContract } from './actions';

const lineItemSlots = [1, 2, 3] as const;

export default async function BillingContractsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; error?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const query = await searchParams;
  const allowed = hasPermission(currentUser.permissions, billingPermissions.contractsView);
  const filters = { pageNo: 1, pageSize: 20, status: 'all', sortBy: 'expiryDate', sortOrder: 'asc' as const };
  const [result, families, students, products] = await Promise.all([
    billingService.queryContracts(filters),
    familyService.query({ pageNo: 1, pageSize: 50, status: 'active' }),
    studentService.query({ pageNo: 1, pageSize: 50, status: 'active' }),
    billingService.queryProducts({ pageNo: 1, pageSize: 50, status: 'active' }),
  ]);
  const detail = result.list[0] ? await billingService.detailContract(result.list[0].contractId) : null;

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="合同列表" permissionCode={billingPermissions.contractsView} />}>
      <div className="stack">
        <PageHeader
          title="合同列表"
          description="学生合同签订与管理"
          actions={<><a className="btn primary" href="#contract-create-form">新建合同</a><button className="btn">创建账单</button><button className="btn">创建续费任务</button></>}
        />
        {query?.created ? <section className="panel"><div className="badge success">合同已创建：{query.created}</div></section> : null}
        {query?.error ? <section className="panel"><div className="badge warning">{decodeURIComponent(query.error)}</div></section> : null}
        <section className="panel stack" id="contract-create-form">
          <div className="page-header">
            <div>
              <h3>新建合同</h3>
              <p>表单已接入 POST /billing/contracts，当前支持最多 3 条收费项一次提交，直接匹配后端 items[] 结构。</p>
            </div>
            <span className="badge success">POST /billing/contracts</span>
          </div>
          <form className="form-grid" action={createBillingContract}>
            <div className="field"><label>合同编号</label><input className="input" name="contractNo" placeholder="CT-202603-001" required /></div>
            <div className="field"><label>状态</label><select className="select" name="status" defaultValue="active"><option value="draft">draft</option><option value="active">active</option><option value="expired">expired</option></select></div>
            <div className="field"><label>家庭</label><select className="select" name="familyId" required defaultValue={families.list[0]?.id ?? ''}>{families.list.length ? families.list.map((family) => <option key={family.id} value={family.id}>{family.name} / {family.code}</option>) : <option value="">暂无可选家庭</option>}</select></div>
            <div className="field"><label>学生</label><select className="select" name="studentId" required defaultValue={students.list[0]?.id ?? ''}>{students.list.length ? students.list.map((student) => <option key={student.id} value={student.id}>{student.name} / {student.studentNo}</option>) : <option value="">暂无可选学生</option>}</select></div>
            <div className="field"><label>校区 ID（可选）</label><input className="input" name="campusId" placeholder={currentUser.campusIds[0] ?? '按后端有效 campusId 填写'} /></div>
            <div className="field"><label>学期 ID（可选）</label><input className="input" name="termId" placeholder="按后端有效 termId 填写" /></div>
            <div className="field"><label>签约日期</label><input className="input" type="date" name="signDate" required /></div>
            <div className="field"><label>生效日期</label><input className="input" type="date" name="startDate" required /></div>
            <div className="field"><label>到期日期</label><input className="input" type="date" name="endDate" required /></div>
            <div className="field"><label>优惠金额（元）</label><input className="input" type="number" step="0.01" min="0" name="discountAmount" defaultValue="0" /></div>
            <div className="field form-span-2">
              <label>收费项（最多 3 条）</label>
              <div className="stack">
                {lineItemSlots.map((index) => (
                  <article key={index} className="selection-card">
                    <div className="page-header" style={{ marginBottom: 12 }}>
                      <strong>收费项 {index}</strong>
                      <span className={`badge${index === 1 ? ' success' : ''}`}>{index === 1 ? '必填首项' : '可选追加项'}</span>
                    </div>
                    <div className="form-grid">
                      <div className="field">
                        <label>收费产品</label>
                        <select className="select" name={`productId_${index}`} defaultValue="">
                          <option value="">自定义收费项</option>
                          {products.list.map((product) => (
                            <option key={`${index}-${product.productId}`} value={product.productId}>
                              {product.name} / {product.productCode} / {product.unitPriceYuan}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label>收费项名称</label>
                        <input className="input" name={`itemName_${index}`} placeholder={index === 1 ? '春季课程包' : '可选：教材费 / 延时服务 / 其他'} required={index === 1} />
                      </div>
                      <div className="field">
                        <label>单价（元）</label>
                        <input className="input" type="number" step="0.01" min="0" name={`unitPrice_${index}`} defaultValue="0" required={index === 1} />
                      </div>
                      <div className="field">
                        <label>数量</label>
                        <input className="input" type="number" min="1" name={`quantity_${index}`} defaultValue="1" required={index === 1} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <div className="field form-span-2"><label>备注</label><textarea className="textarea" name="remark" placeholder="补充约定、折扣说明、签约渠道等" /></div>
            <div className="button-row form-span-2"><button className="btn primary" type="submit">创建合同</button></div>
          </form>
        </section>
        <FilterBar fields={[
          { label: '家庭', value: '全部家庭', kind: 'select' },
          { label: '学生', value: '全部学生', kind: 'select' },
          { label: '关键词', value: '合同编号 / 家庭 / 学生' },
          { label: '状态', value: '全部状态', kind: 'select' },
          { label: '校区', value: '当前先不做前端硬编码预筛', kind: 'select' },
          { label: '学期', value: '当前先不做前端硬编码预筛', kind: 'select' },
          { label: '到期开始', value: '按后端 query 参数传入' },
          { label: '到期结束', value: '按后端 query 参数传入' },
        ]} />
        <div className="grid-billing-layout">
          <DataTable title="合同列表" columns={['合同编号', '家庭', '学生', '生效时间', '到期时间', '合同金额（元）', '状态', '行动作']} rows={result.list.map((item) => [item.contractNo, item.familyName, item.studentName, item.effectiveDate, item.expiryDate, item.contractAmountYuan, item.status, item.actions])} />
          <aside className="panel stack">
            <div className="page-header">
              <div><h3>合同详情侧栏</h3><p>当前直接读取合同详情接口；后续如切 client drawer 或 tabs，不动 service 分层。</p></div>
              <span className="badge">contract detail</span>
            </div>
            {detail ? (
              <>
                <SummaryPanel title="合同摘要" items={detail.summary} />
                <SummaryPanel title="动作位" items={detail.actions} />
              </>
            ) : (
              <SummaryPanel title="合同摘要" items={[{ name: '暂无记录', detail: '当前筛选条件下没有可读取的合同详情。' }]} />
            )}
          </aside>
        </div>
      </div>
    </PermissionGuard>
  );
}
