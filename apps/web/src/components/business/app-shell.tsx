'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navSections, mockCurrentUser } from '@/lib/navigation';
import { pruneNavSections } from '@/components/business/permission-guard';

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const sections = pruneNavSections(navSections, mockCurrentUser.permissions);

  return (
    <div className="dashboard-shell shell">
      <aside className="sidebar">
        <div>
          <h1>Growth Pilot</h1>
          <div className="muted">Wave 1 Frontend Shell</div>
        </div>
        <div className="panel" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.08)', color: 'white' }}>
          <div>{mockCurrentUser.name}</div>
          <div className="muted">{mockCurrentUser.role}</div>
          <div className="muted">{mockCurrentUser.campusName}</div>
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
            <div className="subtle">已预埋导航裁剪、权限占位、统一页面状态组件。</div>
          </div>
          <div className="button-row">
            <Link className="btn" href="/login">切到登录页</Link>
            <button className="btn">切校区（占位）</button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
