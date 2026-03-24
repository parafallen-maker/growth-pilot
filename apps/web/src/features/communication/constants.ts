export const communicationPermissions = {
  recordsView: 'communication:records:view',
  recordsManage: 'communication:records:manage',
  messagesView: 'communication:messages:view',
  messagesManage: 'communication:messages:manage',
  templatesView: 'communication:templates:view',
  templatesManage: 'communication:templates:manage',
} as const;

export const messageStatusTabs = ['模板', '草稿消息', '待发送', '已发送', '失败 / 回执'] as const;
