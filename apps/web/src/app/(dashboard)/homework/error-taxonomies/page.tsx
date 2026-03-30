import { PermissionGuard } from '@/components/business/permission-guard';
import { DataTable, FilterBar, PageHeader, PaginationBar, StateBlock } from '@/components/business/page-blocks';
import { SubmitButton } from '@/components/business/submit-button';
import { homeworkPermissions } from '@/features/homework/constants';
import { requireCurrentUser } from '@/lib/current-user';
import { homeworkService } from '@/services/homework-service';
import { createErrorTaxonomy, updateErrorTaxonomy } from './actions';

const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '草稿', value: 'draft' },
  { label: '启用', value: 'active' },
  { label: '停用', value: 'inactive' },
];

const subjectOptions = [
  { label: '全部学科', value: 'all' },
  { label: '语文', value: 'chinese' },
  { label: '数学', value: 'math' },
  { label: '英语', value: 'english' },
  { label: '通用', value: 'general' },
];

export default async function HomeworkErrorTaxonomiesPage({
  searchParams,
}: {
  searchParams?: Promise<{ keyword?: string; status?: string; subjectScope?: string; taxonomyId?: string; created?: string; updated?: string; error?: string; pageNo?: string; pageSize?: string }>;
}) {
  const currentUser = await requireCurrentUser();
  const query = await searchParams;
  const filters = {
    pageNo: Number(query?.pageNo ?? '1') || 1,
    pageSize: Number(query?.pageSize ?? '20') || 20,
    keyword: query?.keyword ?? '',
    status: query?.status ?? 'all',
    subjectScope: query?.subjectScope ?? 'all',
    sortBy: 'sortOrder',
    sortOrder: 'asc' as const,
  };
  const result = await homeworkService.taxonomyQuery(filters);
  const selectedTaxonomy = result.list.find((item) => item.id === query?.taxonomyId) ?? result.list[0] ?? null;
  const canManage = currentUser.permissions.includes(homeworkPermissions.taxonomyManage);

  return (
    <PermissionGuard allowed={currentUser.permissions.includes(homeworkPermissions.errorTaxonomiesView)}>
      <div className="stack">
        <PageHeader
          title="错因词典维护"
          description="支持按学科筛选、创建和编辑错因标签，教师复核页可直接消费同一份词典。"
          actions={
            <>
              <a className="btn primary" href="#taxonomy-create-form">新建错因</a>
              {selectedTaxonomy ? <a className="btn" href={`#taxonomy-edit-form`}>编辑当前项</a> : null}
            </>
          }
        />

        {query?.created ? <section className="panel"><div className="badge success">错因已创建：{query.created}</div></section> : null}
        {query?.updated ? <section className="panel"><div className="badge success">错因已更新：{query.updated}</div></section> : null}
        {query?.error ? <section className="panel"><div className="badge warning">{decodeURIComponent(query.error)}</div></section> : null}

        <FilterBar
          baseUrl="/homework/error-taxonomies"
          fields={[
            { name: 'keyword', label: '关键词', defaultValue: filters.keyword, placeholder: 'code / 名称 / 分类' },
            { name: 'subjectScope', label: '学科范围', kind: 'select', defaultValue: filters.subjectScope, options: subjectOptions },
            { name: 'status', label: '状态', kind: 'select', defaultValue: filters.status, options: statusOptions },
          ]}
        />

        <div className="grid-2">
          <section className="panel stack" id="taxonomy-create-form">
            <div className="page-header">
              <div>
                <h3>新建错因</h3>
              </div>
            </div>
            <form className="form-grid" action={createErrorTaxonomy}>
              <div className="field"><label>错因编码</label><input className="input" name="code" placeholder="MATH-CALC-001" required disabled={!canManage} /></div>
              <div className="field"><label>错因名称</label><input className="input" name="name" placeholder="竖式计算漏进位" required disabled={!canManage} /></div>
              <div className="field"><label>分类</label><input className="input" name="category" placeholder="计算错误 / 审题错误" disabled={!canManage} /></div>
              <div className="field"><label>学科范围</label><select className="select" name="subjectScope" defaultValue="math" disabled={!canManage}>{subjectOptions.filter((item) => item.value !== 'all').map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
              <div className="field"><label>学段范围</label><input className="input" name="stageScope" placeholder="grade-1-3 / 小学低段" disabled={!canManage} /></div>
              <div className="field"><label>排序</label><input className="input" type="number" name="sortOrder" defaultValue="10" min="0" step="1" disabled={!canManage} /></div>
              <div className="field"><label>状态</label><select className="select" name="status" defaultValue="active" disabled={!canManage}>{statusOptions.filter((item) => item.value !== 'all').map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
              <div className="button-row form-span-2">
                <SubmitButton className="btn primary" pendingLabel="创建中..." disabled={!canManage}>提交创建</SubmitButton>
                <button className="btn" type="reset" disabled={!canManage}>清空</button>
              </div>
            </form>
          </section>

          <section className="panel stack" id="taxonomy-edit-form">
            <div className="page-header">
              <div>
                <h3>编辑错因</h3>
                <p>{selectedTaxonomy ? `当前编辑：${selectedTaxonomy.code} / ${selectedTaxonomy.name}` : '当前页暂无词典项可编辑。'}</p>
              </div>
            </div>
            {selectedTaxonomy ? (
              <form className="form-grid" action={updateErrorTaxonomy}>
                <input type="hidden" name="taxonomyId" value={selectedTaxonomy.id} />
                <div className="field"><label>错因编码</label><input className="input" name="code" defaultValue={selectedTaxonomy.code} required disabled={!canManage} /></div>
                <div className="field"><label>错因名称</label><input className="input" name="name" defaultValue={selectedTaxonomy.name} required disabled={!canManage} /></div>
                <div className="field"><label>分类</label><input className="input" name="category" defaultValue={selectedTaxonomy.category === '--' ? '' : selectedTaxonomy.category} disabled={!canManage} /></div>
                <div className="field"><label>学科范围</label><input className="input" name="subjectScope" defaultValue={selectedTaxonomy.subjects === '--' ? '' : selectedTaxonomy.subjects} disabled={!canManage} /></div>
                <div className="field"><label>排序</label><input className="input" type="number" name="sortOrder" defaultValue={selectedTaxonomy.sort} min="0" step="1" disabled={!canManage} /></div>
                <div className="field"><label>状态</label><select className="select" name="status" defaultValue={selectedTaxonomy.enabled} disabled={!canManage}>{statusOptions.filter((item) => item.value !== 'all').map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
                <div className="button-row form-span-2">
                  <SubmitButton className="btn primary" pendingLabel="保存中..." disabled={!canManage}>保存修改</SubmitButton>
                  <a className="btn" href="/homework/error-taxonomies">取消选择</a>
                </div>
              </form>
            ) : (
              <StateBlock state="empty" title="暂无可编辑错因" actionLabel="返回列表" />
            )}
          </section>
        </div>

        <DataTable
          title="错因词典"
          description="按学科和阶段管理错因标签，支持从列表选择后直接进入右侧编辑区。"
          columns={['code', '名称', '分类', '学科范围', '启用状态', '排序', '动作']}
          rows={result.list.map((item) => [
            item.code,
            item.name,
            item.category,
            item.subjects,
            item.enabled,
            item.sort,
            <div key={item.id} className="button-row"><a className="btn" href={`/homework/error-taxonomies?taxonomyId=${item.id}#taxonomy-edit-form`}>编辑</a></div>,
          ])}
        />
        <PaginationBar pageNo={result.page.pageNo} pageSize={result.page.pageSize} total={result.page.total} baseUrl="/homework/error-taxonomies" />
      </div>
    </PermissionGuard>
  );
}
