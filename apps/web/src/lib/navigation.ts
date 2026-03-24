export type AppRole = 'super_admin' | 'campus_admin' | 'growth_advisor' | 'subject_teacher' | 'service_staff' | 'finance';

export type NavItem = {
  label: string;
  href: string;
  permission: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    title: '工作台',
    items: [
      { label: 'Dashboard', href: '/dashboard', permission: 'dashboard:view' },
    ],
  },
  {
    title: '主数据',
    items: [
      { label: 'Teachers', href: '/teachers', permission: 'teachers:view' },
      { label: 'Students', href: '/students', permission: 'students:view' },
      { label: 'Families', href: '/families', permission: 'families:view' },
    ],
  },
  {
    title: '系统设置',
    items: [
      { label: 'Users & Roles', href: '/settings/users', permission: 'users:view' },
      { label: 'System Settings', href: '/settings/system', permission: 'settings:view' },
    ],
  },
];

export const rolePermissions: Record<AppRole, string[]> = {
  super_admin: ['dashboard:view', 'teachers:view', 'students:view', 'families:view', 'users:view', 'settings:view', 'danger:reset-password'],
  campus_admin: ['dashboard:view', 'teachers:view', 'students:view', 'families:view', 'users:view', 'settings:view'],
  growth_advisor: ['dashboard:view', 'students:view', 'families:view'],
  subject_teacher: ['students:view'],
  service_staff: ['families:view'],
  finance: ['dashboard:view', 'families:view'],
};

export const mockCurrentUser = {
  id: 'u-super-admin',
  name: '运营总控台',
  role: 'super_admin' as AppRole,
  campusName: '贵阳主校区',
  permissions: rolePermissions.super_admin,
};
