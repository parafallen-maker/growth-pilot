export const homeworkPermissions = {
  submissionsView: 'homework:view',
  review: 'homework:review',
  errorTaxonomiesView: 'homework:error-taxonomies:view',
  analyze: 'homework:analyze',
  export: 'homework:export',
  taxonomyManage: 'homework:error-taxonomies:manage',
} as const;

export const reviewViewModes = ['Markdown', 'Structured JSON'] as const;
