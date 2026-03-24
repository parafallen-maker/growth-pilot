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
    title: '作业',
    items: [
      { label: 'Homework Submissions', href: '/homework/submissions', permission: 'homework:view' },
      { label: 'Error Taxonomies', href: '/homework/error-taxonomies', permission: 'homework:error-taxonomies:view' },
    ],
  },
  {
    title: '出勤',
    items: [
      { label: 'Attendance Board', href: '/attendance/board', permission: 'attendance:board:view' },
      { label: 'Attendance Devices', href: '/attendance/devices', permission: 'attendance:devices:view' },
      { label: 'Homework Time', href: '/attendance/homework-time', permission: 'attendance:homework-time:view' },
    ],
  },
  {
    title: '收费',
    items: [
      { label: 'Billing Products', href: '/billing/products', permission: 'billing:products:view' },
      { label: 'Billing Contracts', href: '/billing/contracts', permission: 'billing:contracts:view' },
      { label: 'Billing Invoices', href: '/billing/invoices', permission: 'billing:invoices:view' },
      { label: 'Billing Renewals', href: '/billing/renewals', permission: 'billing:renewals:view' },
    ],
  },
  {
    title: '成长',
    items: [
      { label: 'Growth Rubrics', href: '/growth/rubrics', permission: 'growth:rubrics:view' },
      { label: 'Growth Observations', href: '/growth/observations', permission: 'growth:observations:view' },
      { label: 'Growth Goals', href: '/growth/goals', permission: 'growth:goals:view' },
      { label: 'Growth Reports', href: '/growth/reports', permission: 'growth:reports:view' },
    ],
  },
  {
    title: '沟通',
    items: [
      { label: 'Communication Records', href: '/communication/records', permission: 'communication:records:view' },
      { label: 'Communication Messages', href: '/communication/messages', permission: 'communication:messages:view' },
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
  super_admin: ['dashboard:view', 'teachers:view', 'students:view', 'families:view', 'homework:view', 'homework:review', 'homework:analyze', 'homework:export', 'homework:error-taxonomies:view', 'homework:error-taxonomies:manage', 'growth:rubrics:view', 'growth:rubrics:manage', 'growth:observations:view', 'growth:observations:manage', 'growth:goals:view', 'growth:goals:manage', 'growth:reports:view', 'growth:reports:manage', 'attendance:board:view', 'attendance:board:manage', 'attendance:devices:view', 'attendance:devices:manage', 'attendance:homework-time:view', 'attendance:homework-time:manage', 'billing:products:view', 'billing:products:manage', 'billing:contracts:view', 'billing:contracts:manage', 'billing:invoices:view', 'billing:payments:manage', 'billing:refunds:manage', 'billing:renewals:view', 'billing:renewals:manage', 'communication:records:view', 'communication:records:manage', 'communication:messages:view', 'communication:messages:manage', 'communication:templates:view', 'communication:templates:manage', 'users:view', 'settings:view', 'danger:reset-password'],
  campus_admin: ['dashboard:view', 'teachers:view', 'students:view', 'families:view', 'homework:view', 'homework:analyze', 'homework:export', 'homework:error-taxonomies:view', 'homework:error-taxonomies:manage', 'growth:rubrics:view', 'growth:rubrics:manage', 'growth:observations:view', 'growth:observations:manage', 'growth:goals:view', 'growth:goals:manage', 'growth:reports:view', 'growth:reports:manage', 'attendance:board:view', 'attendance:board:manage', 'attendance:devices:view', 'attendance:devices:manage', 'attendance:homework-time:view', 'attendance:homework-time:manage', 'billing:products:view', 'billing:contracts:view', 'billing:contracts:manage', 'billing:invoices:view', 'billing:payments:manage', 'billing:refunds:manage', 'billing:renewals:view', 'billing:renewals:manage', 'communication:records:view', 'communication:records:manage', 'communication:messages:view', 'communication:messages:manage', 'communication:templates:view', 'communication:templates:manage', 'users:view', 'settings:view'],
  growth_advisor: ['dashboard:view', 'students:view', 'families:view', 'homework:view', 'homework:review', 'growth:observations:view', 'growth:observations:manage', 'growth:goals:view', 'growth:goals:manage', 'growth:reports:view', 'growth:reports:manage', 'attendance:homework-time:view', 'communication:records:view', 'communication:records:manage'],
  subject_teacher: ['students:view', 'homework:view', 'homework:review', 'growth:observations:view', 'growth:observations:manage', 'growth:goals:view', 'growth:goals:manage', 'attendance:homework-time:view'],
  service_staff: ['families:view', 'billing:contracts:view', 'billing:renewals:view', 'attendance:board:view', 'attendance:devices:view', 'communication:records:view', 'communication:records:manage', 'communication:messages:view', 'communication:messages:manage', 'communication:templates:view'],
  finance: ['dashboard:view', 'families:view', 'billing:products:view', 'billing:products:manage', 'billing:contracts:view', 'billing:contracts:manage', 'billing:invoices:view', 'billing:payments:manage', 'billing:refunds:manage', 'billing:renewals:view', 'billing:renewals:manage', 'communication:messages:view', 'communication:messages:manage', 'communication:templates:view'],
};

export const mockCurrentUser = {
  id: 'u-super-admin',
  name: '运营总控台',
  role: 'super_admin' as AppRole,
  campusName: '贵阳主校区',
  permissions: rolePermissions.super_admin,
};
