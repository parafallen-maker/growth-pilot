import { PermissionGuard } from '@/components/business/permission-guard';
import { DataTable, PageHeader, StateBlock, TabStrip } from '@/components/business/page-blocks';
import { mockCurrentUser } from '@/lib/navigation';
import { queryKeys } from '@/features/shared/query-keys';
import { settingsService } from '@/services/settings-service';

export default function SettingsUsersPage() {
  const result = settingsService.query({ pageNo: 1, pageSize: 20, sortBy: 'createdAt', sortOrder: 'desc' });

  return (
    <PermissionGuard allowed={mockCurrentUser.permissions.includes('users:view')}>
      <div className="stack">
        <PageHeader
          title="用户与角色页面骨架"
          description={`P29 已落路由、tabs、列表、权限点展示位。query key: ${JSON.stringify(queryKeys.users({ pageNo: 1, pageSize: 20 }))}`}
          actions={<><button className="btn primary">创建用户</button><button className="btn">绑定角色</button><button className="btn danger">重置密码</button></>}
        />
        <TabStrip tabs={['用户列表', '角色列表', '权限点']} active="用户列表" />
        <DataTable
          title="用户列表"
          columns={['用户ID', '姓名', '角色', '校区', '状态', '权限范围']}
          rows={result.list.map((item) => [item.id, item.name, item.role, item.campus, item.status, item.permissionScope])}
        />
        <div className="grid-2">
          <StateBlock state="empty" title="角色列表" />
          <StateBlock state="error" title="权限点拉取" />
        </div>
      </div>
    </PermissionGuard>
  );
}
