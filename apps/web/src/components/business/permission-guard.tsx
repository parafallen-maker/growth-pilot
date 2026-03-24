import type { ReactNode } from 'react';
import type { NavSection } from '@/lib/navigation';

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
    <section className="state-card">
      <div className="badge danger">403 Permission Denied</div>
      <h3 style={{ marginTop: 12 }}>你能看见入口，不代表你能进门。</h3>
      <p>
        当前账号缺少 <strong>{resource}</strong> 所需权限：<code>{permissionCode}</code>
      </p>
      <div className="button-row">
        <button className="btn">申请权限（占位）</button>
      </div>
    </section>
  );
}
