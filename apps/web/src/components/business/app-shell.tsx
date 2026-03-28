'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { pruneNavSections } from '@/components/business/permission-guard';
import { navSections, roleLabels } from '@/lib/navigation';
import type { AppRole } from '@/lib/navigation';
import type { CurrentUser } from '@/lib/current-user';
import { LogoutButton } from '@/components/business/logout-button';

function getRoleLabel(role: string): string {
  return roleLabels[role as AppRole] ?? role;
}

export function AppShell({ children, currentUser }: { children: ReactNode; currentUser: CurrentUser }) {
  const pathname = usePathname();
  const sections = pruneNavSections(navSections, currentUser.permissions);

  return (
    <div className="dashboard-shell shell">
      <aside className="sidebar">
        <div>
          <h1>Growth Pilot</h1>
          <div className="muted">洪基托管成长中心</div>
        </div>
        <div className="panel" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.08)', color: 'white' }}>
          <div>{currentUser.name}</div>
          <div className="muted">{getRoleLabel(currentUser.role)}</div>
          <div className="muted">{currentUser.campusName}</div>
        </div>
        <nav>
          {sections.map((section) => (
            <div key={section.title}>
              <div className="nav-section-title">{section.icon ? `${section.icon} ` : ''}{section.title}</div>
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
            <strong>管理后台</strong>
          </div>
          <div className="button-row">
            <Link className="btn" href="/dashboard">首页</Link>
            <LogoutButton />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

