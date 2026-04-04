'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { LogoutButton } from '@/components/business/logout-button';
import { ToastProvider } from '@/components/business/toast-provider';
import { pruneNavSections } from '@/components/business/permission-guard';
import { getRoleLabel, isNavItemActive, navSections } from '@/lib/navigation';
import type { CurrentUser } from '@/lib/current-user';

export function AppShell({ children, currentUser }: { children: ReactNode; currentUser: CurrentUser }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const sections = useMemo(() => pruneNavSections(navSections, currentUser.permissions), [currentUser.permissions]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <ToastProvider>
      <a className="skip-link" href="#main-content">
        跳到主内容
      </a>
      <div className="dashboard-shell shell">
        <button
          type="button"
          className={`sidebar-backdrop${menuOpen ? ' visible' : ''}`}
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setMenuOpen(false)}
        />
        <aside id="dashboard-sidebar" className={`sidebar${menuOpen ? ' open' : ''}`} aria-label="侧边导航">
          <div className="sidebar-brand">
            <div>
              <h1>Growth-Pilot</h1>
              <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>
                洪基托管成长中心
              </div>
            </div>
            <button type="button" className="btn ghost sidebar-close" onClick={() => setMenuOpen(false)}>
              关闭
            </button>
          </div>

          <section className="panel sidebar-profile">
            <div className="sidebar-profile-name">{currentUser.name}</div>
            <div className="muted">{getRoleLabel(currentUser.role)}</div>
            <div className="muted">{currentUser.campusName}</div>
          </section>

          <nav className="sidebar-nav">
            {sections.map((section) => (
              <div key={section.title}>
                <div className="nav-section-title">
                  {section.icon ? `${section.icon} ` : ''}
                  {section.title}
                </div>
                <div className="nav-group">
                  {section.items.map((item) => {
                    const active = isNavItemActive(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        className={`nav-link${active ? ' active' : ''}`}
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div className="main">
          <header className="topbar panel" role="banner">
            <div className="topbar-brand">
              <button
                type="button"
                className="btn sidebar-toggle"
                aria-label={menuOpen ? '关闭菜单' : '打开菜单'}
                aria-expanded={menuOpen}
                aria-controls="dashboard-sidebar"
                onClick={() => setMenuOpen((value) => !value)}
              >
                ☰
              </button>
              <div>
                <strong>管理后台</strong>
                <div className="muted">当前账号：{currentUser.displayName}</div>
              </div>
            </div>
            <div className="button-row">
              <Link className="btn" href="/dashboard">
                首页
              </Link>
              <LogoutButton />
            </div>
          </header>

          <main id="main-content" className="main-content" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
