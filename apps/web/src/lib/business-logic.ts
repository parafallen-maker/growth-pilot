/**
 * Business Logic Constants & Helpers
 * Centralized source of truth for labels, priorities, and status mapping.
 */

export const TASK_PRIORITY_LABELS: Record<string, string> = {
  high: '🔴 紧急',
  medium: '🟡 一般',
  low: '⚪ 低',
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  todo: '待办',
  doing: '进行中',
  done: '已完成',
  canceled: '已取消',
};

export const TASK_TYPE_LABELS: Record<string, string> = {
  homework_followup: '作业跟进',
  overdue_payment: '欠费提醒',
  parent_communication: '家长沟通',
  goal_followup: '目标跟进',
  custom: '自定义',
};

export const ALERT_LEVEL_LABELS: Record<string, string> = {
  high: '🔴 严重',
  medium: '🟡 注意',
  low: '⚪ 提示',
};

export const ALERT_TYPE_LABELS: Record<string, string> = {
  overdue_payment: '欠费预警',
  academic_risk: '学业预警',
  absent_streak: '缺勤预警',
  goal_overdue: '目标逾期',
};

/**
 * Returns a color or style object for a given priority/level
 */
export function getPriorityStyle(level: string) {
  switch (level) {
    case 'high':
      return { borderLeft: '4px solid #ef4444' };
    case 'medium':
      return { borderLeft: '4px solid #f59e0b' };
    default:
      return { borderLeft: '4px solid #94a3b8' };
  }
}
