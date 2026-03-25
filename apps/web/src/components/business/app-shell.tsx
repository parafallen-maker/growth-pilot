'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { pruneNavSections } from '@/components/business/permission-guard';
import { navSections } from '@/lib/navigation';
import type { CurrentUser } from '@/lib/current-user';
import { LogoutButton } from '@/components/business/logout-button';

export function AppShell({ children, currentUser }: { children: ReactNode; currentUser: CurrentUser }) {
  const pathname = usePathname();
  const sections = pruneNavSections(navSections, currentUser.permissions);

  return (
    <div className="dashboard-shell shell">
      <aside className="sidebar">
        <div>
          <h1>Growth Pilot</h1>
          <div className="muted">Authenticated Admin Shell</div>
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
            <div className="subtle">当前用户由 GET /auth/me 获取，菜单按 permissions 真裁剪。</div>
          </div>
          <div className="button-row">
            <Link className="btn" href="/dashboard">Dashboard</Link>
            <LogoutButton />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
