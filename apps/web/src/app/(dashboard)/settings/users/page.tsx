import { PermissionGuard } from '@/components/business/permission-guard';
import { DataTable, PageHeader, SummaryPanel, TabStrip } from '@/components/business/page-blocks';
import { requireCurrentUser } from '@/lib/current-user';
import { queryKeys } from '@/features/shared/query-keys';
import { settingsService } from '@/services/settings-service';

export default async function SettingsUsersPage() {
  const currentUser = await requireCurrentUser();
  const result = await settingsService.query({ pageNo: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' });

  return (
    <PermissionGuard allowed={currentUser.permissions.includes('users:view')}>
      <div className="stack">
        <PageHeader
          title="用户与角色"
          description={`真实数据来自 GET /users。query key: ${JSON.stringify(queryKeys.users({ pageNo: 1, pageSize: 20 }))}`}
          actions={<><button className="btn primary">创建用户</button><button className="btn">绑定角色</button><button className="btn danger">重置密码</button></>}
        />
        <TabStrip tabs={['用户列表', '角色列表', '权限点']} active="用户列表" />
        <DataTable
          title={`用户列表（共 ${result.page.total} 条）`}
          columns={['用户ID', '用户名', '姓名', '角色', '校区', '状态', '权限范围']}
          rows={result.list.map((item) => [item.id, item.username, item.name, item.role, item.campus, item.status, item.permissionScope])}
        />
        <div className="grid-2">
          <SummaryPanel title="角色列表" items={[{ name: '当前状态', detail: '后端已返回用户主数据；角色独立列表接口仍待补。' }]} />
          <SummaryPanel title="权限点" items={[{ name: '当前状态', detail: '页面权限守卫已生效；权限点明细接口仍待补。' }]} />
        </div>
      </div>
    </PermissionGuard>
  );
}
