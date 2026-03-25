import { PermissionGuard } from '@/components/business/permission-guard';
import { DataTable, FilterBar, PageHeader, StateBlock } from '@/components/business/page-blocks';
import { homeworkPermissions } from '@/features/homework/constants';
import { queryKeys } from '@/features/shared/query-keys';
import { getCurrentUser } from '@/lib/current-user';
import { homeworkService } from '@/services/homework-service';

export default async function HomeworkErrorTaxonomiesPage() {
  const currentUser = await getCurrentUser();
  const filters = { pageNo: 1, pageSize: 20, keyword: '', status: 'enabled', sortBy: 'sort', sortOrder: 'asc' as const };
  const result = await homeworkService.taxonomyQuery(filters);

  return (
    <PermissionGuard allowed={currentUser.permissions.includes(homeworkPermissions.errorTaxonomiesView)}>
      <div className="stack">
        <PageHeader
          title="错因词典维护页骨架"
          description={`P12 已放 code / 分类 / 学科范围 / 启停 / 排序占位。query key: ${JSON.stringify(queryKeys.homeworkErrorTaxonomies(filters))}`}
          actions={
            <>
              <button className="btn primary">新建错因</button>
              <button className="btn">批量排序</button>
              <button className="btn">导出词典</button>
            </>
          }
        />

        <FilterBar
          fields={[
            { label: '关键词', value: 'code / 名称 / 分类' },
            { label: '分类', value: '全部分类', kind: 'select' },
            { label: '学科范围', value: '全部学科', kind: 'select' },
            { label: '状态', value: '启用中', kind: 'select' },
          ]}
        />

        <DataTable
          title="错因词典"
          columns={['code', '名称', '分类', '学科范围', '启用状态', '排序', '动作']}
          rows={result.list.map((item) => [item.code, item.name, item.category, item.subjects, item.enabled, item.sort, item.actions])}
        />

        <div className="grid-2">
          <section className="panel">
            <h3>维护动作占位</h3>
            <div className="summary-list" style={{ marginTop: 12 }}>
              <div className="summary-item"><strong>新建/编辑</strong><div className="subtle">后续接 FormDialog + Zod schema + 只读字段区分。</div></div>
              <div className="summary-item"><strong>启停</strong><div className="subtle">危险动作需单独 permission code 校验。</div></div>
              <div className="summary-item"><strong>排序</strong><div className="subtle">支持上移/下移/批量重排，占位已留。</div></div>
            </div>
          </section>
          <StateBlock state="error" title="词典异常态" actionLabel="重新加载词典" />
        </div>
      </div>
    </PermissionGuard>
  );
}
