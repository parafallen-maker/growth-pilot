import { PermissionGuard } from '@/components/business/permission-guard';
import { DataTable, PageHeader, SummaryPanel, TabStrip } from '@/components/business/page-blocks';
import { requireCurrentUser } from '@/lib/current-user';
import { queryKeys } from '@/features/shared/query-keys';
import { settingsService } from '@/services/settings-service';

export default async function SettingsUsersPage() {
  const currentUser = await requireCurrentUser();
  const [result, accessCatalog] = await Promise.all([
    settingsService.query({ pageNo: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' }),
    settingsService.queryAccessCatalog(),
  ]);

  return (
    <PermissionGuard allowed={currentUser.permissions.includes('users:view')}>
      <div className="stack">
        <PageHeader
          title="用户与角色"
          description={`真实数据来自 GET /users 与 GET /settings/dictionaries?dictType=access_role|access_permission；角色与权限目录不再由 /users 或当前登录态推断。query key: ${JSON.stringify(queryKeys.users({ pageNo: 1, pageSize: 20 }))}`}
          actions={<><button className="btn primary">创建用户</button><button className="btn">绑定角色</button><button className="btn danger">重置密码</button></>}
        />
        <TabStrip tabs={['用户列表', '角色列表', '权限点']} active="用户列表" />
        <DataTable
          title={`用户列表（共 ${result.page.total} 条）`}
          columns={['用户ID', '用户名', '姓名', '角色', '校区', '状态', '权限范围']}
          rows={result.list.map((item) => [item.id, item.username, item.name, item.role, item.campus, item.status, item.permissionScope])}
        />
        <div className="grid-2">
          <SummaryPanel title="角色列表" items={accessCatalog.roles} />
          <SummaryPanel title="权限模块" items={accessCatalog.permissionModules} />
        </div>
        <SummaryPanel title="权限点目录样本" items={accessCatalog.currentPermissions} />
      </div>
    </PermissionGuard>
  );
}
