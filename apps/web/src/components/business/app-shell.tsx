'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { pruneNavSections } from '@/components/business/permission-guard';
import { navSections } from '@/lib/navigation';
import type { CurrentUser } from '@/lib/current-user';

export function AppShell({ children, currentUser }: { children: ReactNode; currentUser: CurrentUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const sections = pruneNavSections(navSections, currentUser.permissions);

  async function handleLogout() {
    await fetch('/api/auth/session/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="dashboard-shell shell">
      <aside className="sidebar">
        <div>
          <h1>Growth Pilot</h1>
          <div className="muted">Wave 1 Frontend Shell</div>
        </div>
        <div className="panel" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.08)', color: 'white' }}>
          <div>{currentUser.name}</div>
          <div className="muted">{currentUser.role}</div>
          <div className="muted">{currentUser.campusName}</div>
        </div>
        <nav>
          {sections.map((section) => (
            <div key={section.title}>
              <div className="nav-section-title">{section.title}</div>
              <div className="nav-group">
                {section.items.map((item) => (
                  <Link key={item.href} className={`nav-link${pathname === item.href || pathname.startsWith(`${item.href}/`) ? ' active' : ''}`} href={item.href}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar panel">
          <div>
            <strong>Admin Console</strong>
            <div className="subtle">当前用户来自 /auth/me，菜单已按 permissions 裁剪。</div>
          </div>
          <div className="button-row">
            <button className="btn" onClick={() => router.refresh()}>刷新权限</button>
            <button className="btn danger" onClick={handleLogout}>退出登录</button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
