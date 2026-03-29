export type AppRole = 'super_admin' | 'campus_admin' | 'growth_advisor' | 'subject_teacher' | 'service_staff' | 'finance';

/** 角色中文显示名 */
export const roleLabels: Record<AppRole, string> = {
  super_admin: '超级管理员',
  campus_admin: '校区负责人',
  growth_advisor: '成长顾问',
  subject_teacher: '学科教师',
  service_staff: '前台/教务',
  finance: '财务人员',
};

export type NavItem = {
  label: string;
  href: string;
  permission: string;
};

export type NavSection = {
  title: string;
  icon?: string;
  items: NavItem[];
};

export function getRoleLabel(role: string) {
  return roleLabels[role as AppRole] ?? role;
}

export function isNavItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const navSections: NavSection[] = [
  {
    title: '工作台',
    icon: '📊',
    items: [
      { label: '首页总览', href: '/dashboard', permission: 'dashboard:view' },
      { label: '我的待办', href: '/tasks', permission: 'tasks:view' },
    ],
  },
  {
    title: '学生中心',
    icon: '👤',
    items: [
      { label: '学生管理', href: '/students', permission: 'students:view' },
      { label: '学生导入', href: '/students/import', permission: 'students:view' },
    ],
  },
  {
    title: '家庭中心',
    icon: '👨‍👩‍👧',
    items: [
      { label: '家庭管理', href: '/families', permission: 'families:view' },
    ],
  },
  {
    title: '教师中心',
    icon: '👩‍🏫',
    items: [
      { label: '教师管理', href: '/teachers', permission: 'teachers:view' },
    ],
  },
  {
    title: '教学管理',
    icon: '📝',
    items: [
      { label: '作业管理', href: '/homework/submissions', permission: 'homework:view' },
      { label: '错因标签', href: '/homework/error-taxonomies', permission: 'homework:error-taxonomies:view' },
      { label: '习惯观察', href: '/growth/observations', permission: 'growth:observations:view' },
      { label: '成长目标', href: '/growth/goals', permission: 'growth:goals:view' },
      { label: '成长报告', href: '/growth/reports', permission: 'growth:reports:view' },
      { label: '评价模板', href: '/growth/rubrics', permission: 'growth:rubrics:view' },
    ],
  },
  {
    title: '校务管理',
    icon: '🏫',
    items: [
      { label: '考勤看板', href: '/attendance/board', permission: 'attendance:board:view' },
      { label: '设备管理', href: '/attendance/devices', permission: 'attendance:devices:view' },
      { label: '学习时长', href: '/attendance/homework-time', permission: 'attendance:homework-time:view' },
      { label: '沟通记录', href: '/communication/records', permission: 'communication:records:view' },
      { label: '消息任务', href: '/communication/messages', permission: 'communication:messages:view' },
    ],
  },
  {
    title: '财务中心',
    icon: '💰',
    items: [
      { label: '收费方案', href: '/billing/products', permission: 'billing:products:view' },
      { label: '合同管理', href: '/billing/contracts', permission: 'billing:contracts:view' },
      { label: '账单管理', href: '/billing/invoices', permission: 'billing:invoices:view' },
      { label: '续费跟进', href: '/billing/renewals', permission: 'billing:renewals:view' },
    ],
  },
  {
    title: '任务预警',
    icon: '⚡',
    items: [
      { label: '任务中心', href: '/tasks/list', permission: 'tasks:view' },
      { label: '预警中心', href: '/alerts', permission: 'alerts:view' },
    ],
  },
  {
    title: '数据分析',
    icon: '📈',
    items: [
      { label: '经营总览', href: '/analytics/overview', permission: 'analytics:overview:view' },
      { label: '教学分析', href: '/analytics/teaching', permission: 'analytics:teaching:view' },
      { label: '财务分析', href: '/analytics/billing', permission: 'analytics:billing:view' },
    ],
  },
  {
    title: '系统设置',
    icon: '⚙️',
    items: [
      { label: '用户与角色', href: '/settings/users', permission: 'users:view' },
      { label: '基础字典', href: '/settings/system', permission: 'settings:view' },
    ],
  },
];

export const rolePermissions: Record<AppRole, string[]> = {
  super_admin: ['dashboard:view', 'tasks:view', 'alerts:view', 'teachers:view', 'students:view', 'families:view', 'homework:view', 'homework:review', 'homework:analyze', 'homework:export', 'homework:error-taxonomies:view', 'homework:error-taxonomies:manage', 'growth:rubrics:view', 'growth:rubrics:manage', 'growth:observations:view', 'growth:observations:manage', 'growth:goals:view', 'growth:goals:manage', 'growth:reports:view', 'growth:reports:manage', 'attendance:board:view', 'attendance:board:manage', 'attendance:devices:view', 'attendance:devices:manage', 'attendance:homework-time:view', 'attendance:homework-time:manage', 'billing:products:view', 'billing:products:manage', 'billing:contracts:view', 'billing:contracts:manage', 'billing:invoices:view', 'billing:payments:manage', 'billing:refunds:manage', 'billing:renewals:view', 'billing:renewals:manage', 'communication:records:view', 'communication:records:manage', 'communication:messages:view', 'communication:messages:manage', 'communication:templates:view', 'communication:templates:manage', 'analytics:overview:view', 'analytics:teaching:view', 'analytics:billing:view', 'users:view', 'settings:view', 'danger:reset-password'],
  campus_admin: ['dashboard:view', 'tasks:view', 'alerts:view', 'teachers:view', 'students:view', 'families:view', 'homework:view', 'homework:analyze', 'homework:export', 'homework:error-taxonomies:view', 'homework:error-taxonomies:manage', 'growth:rubrics:view', 'growth:rubrics:manage', 'growth:observations:view', 'growth:observations:manage', 'growth:goals:view', 'growth:goals:manage', 'growth:reports:view', 'growth:reports:manage', 'attendance:board:view', 'attendance:board:manage', 'attendance:devices:view', 'attendance:devices:manage', 'attendance:homework-time:view', 'attendance:homework-time:manage', 'billing:products:view', 'billing:contracts:view', 'billing:contracts:manage', 'billing:invoices:view', 'billing:payments:manage', 'billing:refunds:manage', 'billing:renewals:view', 'billing:renewals:manage', 'communication:records:view', 'communication:records:manage', 'communication:messages:view', 'communication:messages:manage', 'communication:templates:view', 'communication:templates:manage', 'analytics:overview:view', 'analytics:teaching:view', 'analytics:billing:view', 'users:view', 'settings:view'],
  growth_advisor: ['dashboard:view', 'tasks:view', 'alerts:view', 'students:view', 'families:view', 'homework:view', 'homework:review', 'growth:observations:view', 'growth:observations:manage', 'growth:goals:view', 'growth:goals:manage', 'growth:reports:view', 'growth:reports:manage', 'attendance:homework-time:view', 'communication:records:view', 'communication:records:manage'],
  subject_teacher: ['tasks:view', 'alerts:view', 'students:view', 'homework:view', 'homework:review', 'growth:observations:view', 'growth:observations:manage', 'growth:goals:view', 'growth:goals:manage', 'attendance:homework-time:view'],
  service_staff: ['tasks:view', 'alerts:view', 'families:view', 'billing:contracts:view', 'billing:renewals:view', 'attendance:board:view', 'attendance:devices:view', 'communication:records:view', 'communication:records:manage', 'communication:messages:view', 'communication:messages:manage', 'communication:templates:view'],
  finance: ['dashboard:view', 'tasks:view', 'alerts:view', 'families:view', 'billing:products:view', 'billing:products:manage', 'billing:contracts:view', 'billing:contracts:manage', 'billing:invoices:view', 'billing:payments:manage', 'billing:refunds:manage', 'billing:renewals:view', 'billing:renewals:manage', 'communication:messages:view', 'communication:messages:manage', 'communication:templates:view', 'analytics:billing:view'],
};
