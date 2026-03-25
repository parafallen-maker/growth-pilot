import type { ReactNode } from 'react';
import type { NavSection } from '@/lib/navigation';
import { ForbiddenState } from '@/components/business/page-states';

export function hasPermission(permissions: string[], permissionCode: string) {
  return permissions.includes(permissionCode);
}

export function pruneNavSections(sections: NavSection[], permissions: string[]) {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => hasPermission(permissions, item.permission)),
    }))
    .filter((section) => section.items.length > 0);
}

export function PermissionGuard({
  allowed,
  fallback,
  children,
}: {
  allowed: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  if (!allowed) {
    return fallback ?? <PermissionDeniedState resource="当前模块" permissionCode="unknown" />;
  }

  return <>{children}</>;
}

export function PermissionDeniedState({ resource, permissionCode }: { resource: string; permissionCode: string }) {
  return (
    <ForbiddenState
      title="无权限访问"
      description={
        `当前账号缺少 ${resource} 所需权限：${permissionCode}`
      }
    />
  );
}
