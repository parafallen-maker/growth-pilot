export const growthPermissions = {
  rubricsView: 'growth:rubrics:view',
  rubricsManage: 'growth:rubrics:manage',
  observationsView: 'growth:observations:view',
  observationsManage: 'growth:observations:manage',
  goalsView: 'growth:goals:view',
  goalsManage: 'growth:goals:manage',
  reportsView: 'growth:reports:view',
  reportsManage: 'growth:reports:manage',
} as const;

export const growthStates = {
  draft: 'draft',
  active: 'active',
  published: 'published',
} as const;
