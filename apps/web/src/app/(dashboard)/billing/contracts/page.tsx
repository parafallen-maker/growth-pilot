import { DataTable, FilterBar, PageHeader, SummaryPanel } from '@/components/business/page-blocks';
import { PermissionDeniedState, PermissionGuard, hasPermission } from '@/components/business/permission-guard';
import { billingPermissions } from '@/features/billing/constants';
import { queryKeys } from '@/features/shared/query-keys';
import { requireCurrentUser } from '@/lib/current-user';
import { billingService } from '@/services/billing-service';
import { familyService } from '@/services/families-service';
import { studentService } from '@/services/students-service';
import { createBillingContract } from './actions';

export default async function BillingContractsPage({
  searchParams,
}: {
  searchParams?: Promise<{ created?: string; error?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const query = await searchParams;
  const allowed = hasPermission(currentUser.permissions, billingPermissions.contractsView);
  const filters = { pageNo: 1, pageSize: 20, status: 'active', campusId: 'campus-guiyang', termId: '2026-spring', sortBy: 'expiryDate', sortOrder: 'asc' as const };
  const [result, families, students, products] = await Promise.all([
    billingService.queryContracts(filters),
    familyService.query({ pageNo: 1, pageSize: 50, status: 'active' }),
    studentService.query({ pageNo: 1, pageSize: 50, status: 'active' }),
    billingService.queryProducts({ pageNo: 1, pageSize: 50, status: 'active' }),
  ]);
  const detail = await billingService.detailContract(result.list[0]?.contractId ?? 'contract-001');

  return (
    <PermissionGuard allowed={allowed} fallback={<PermissionDeniedState resource="合同列表" permissionCode={billingPermissions.contractsView} />}>
      <div className="stack">
        <PageHeader
          title="合同列表"
          description={`当前展示 billing/contracts 与合同详情真实数据。query key: ${JSON.stringify(queryKeys.billingContracts(filters))}`}
          actions={<><a className="btn primary" href="#contract-create-form">新建合同</a><button className="btn">创建账单</button><button className="btn">创建续费任务</button></>}
        />
        {query?.created ? <section className="panel"><div className="badge success">合同已创建：{query.created}</div></section> : null}
        {query?.error ? <section className="panel"><div className="badge warning">{decodeURIComponent(query.error)}</div></section> : null}
        <section className="panel stack" id="contract-create-form">
          <div className="page-header">
            <div>
              <h3>新建合同</h3>
              <p>表单已接入 POST /billing/contracts。当前先支持单条收费项，覆盖最常见的签约动作。</p>
            </div>
            <span className="badge success">POST /billing/contracts</span>
          </div>
          <form className="form-grid" action={createBillingContract}>
            <div className="field"><label>合同编号</label><input className="input" name="contractNo" placeholder="CT-202603-001" required /></div>
            <div className="field"><label>状态</label><select className="select" name="status" defaultValue="active"><option value="draft">draft</option><option value="active">active</option><option value="expired">expired</option></select></div>
            <div className="field"><label>家庭</label><select className="select" name="familyId" required defaultValue={families.list[0]?.id ?? ''}>{families.list.map((family) => <option key={family.id} value={family.id}>{family.name} / {family.code}</option>)}</select></div>
            <div className="field"><label>学生</label><select className="select" name="studentId" required defaultValue={students.list[0]?.id ?? ''}>{students.list.map((student) => <option key={student.id} value={student.id}>{student.name} / {student.studentNo}</option>)}</select></div>
            <div className="field"><label>校区 ID（可选）</label><input className="input" name="campusId" placeholder="campus-guiyang" /></div>
            <div className="field"><label>学期 ID（可选）</label><input className="input" name="termId" placeholder="term-2026-spring" /></div>
            <div className="field"><label>签约日期</label><input className="input" type="date" name="signDate" required /></div>
            <div className="field"><label>生效日期</label><input className="input" type="date" name="startDate" required /></div>
            <div className="field"><label>到期日期</label><input className="input" type="date" name="endDate" required /></div>
            <div className="field"><label>优惠金额（元）</label><input className="input" type="number" step="0.01" min="0" name="discountAmount" defaultValue="0" /></div>
            <div className="field"><label>收费产品</label><select className="select" name="productId" defaultValue=""><option value="">自定义收费项</option>{products.list.map((product) => <option key={product.productCode} value={product.productCode}>{product.name} / {product.unitPriceYuan}</option>)}</select></div>
            <div className="field"><label>收费项名称</label><input className="input" name="itemName" placeholder="春季课程包" required /></div>
            <div className="field"><label>单价（元）</label><input className="input" type="number" step="0.01" min="0" name="unitPrice" defaultValue="0" required /></div>
            <div className="field"><label>数量</label><input className="input" type="number" min="1" name="quantity" defaultValue="1" required /></div>
            <div className="field form-span-2"><label>备注</label><textarea className="textarea" name="remark" placeholder="补充约定、折扣说明、签约渠道等" /></div>
            <div className="button-row form-span-2"><button className="btn primary" type="submit">创建合同</button></div>
          </form>
        </section>
        <FilterBar fields={[
          { label: '家庭', value: '全部家庭', kind: 'select' },
          { label: '学生', value: '全部学生', kind: 'select' },
          { label: '关键词', value: '合同编号 / 家庭 / 学生' },
          { label: '状态', value: '全部状态', kind: 'select' },
          { label: '校区', value: '贵阳主校区', kind: 'select' },
          { label: '学期', value: '2026 春季', kind: 'select' },
          { label: '到期开始', value: '2026-03-24' },
          { label: '到期结束', value: '2026-06-30' },
        ]} />
        <div className="grid-billing-layout">
          <DataTable title="合同列表" columns={['合同编号', '家庭', '学生', '生效时间', '到期时间', '合同金额（元）', '状态', '行动作']} rows={result.list.map((item) => [item.contractNo, item.familyName, item.studentName, item.effectiveDate, item.expiryDate, item.contractAmountYuan, item.status, item.actions])} />
          <aside className="panel stack">
            <div className="page-header">
              <div><h3>合同详情侧栏</h3><p>当前直接读取合同详情接口；后续如切 client drawer 或 tabs，不动 service 分层。</p></div>
              <span className="badge">contract detail</span>
            </div>
            <SummaryPanel title="合同摘要" items={detail.summary} />
            <SummaryPanel title="动作位" items={detail.actions} />
          </aside>
        </div>
      </div>
    </PermissionGuard>
  );
}
