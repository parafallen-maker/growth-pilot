/**
 * 枚举值中文映射
 */

/** 学生状态 */
export const studentStatusLabels: Record<string, string> = {
  trial: '试听',
  active: '在读',
  paused: '暂停',
  left: '离开',
  graduated: '毕业',
  inactive: '停读',
};

/** 学生状态流转（合法下一步） */
export const studentStatusTransitions: Record<string, string[]> = {
  trial: ['active', 'left'],
  active: ['paused', 'left', 'graduated'],
  paused: ['active', 'left'],
  left: ['active', 'trial'],
  graduated: [],
  inactive: ['active'],
};

/** 账单状态 */
export const invoiceStatusLabels: Record<string, string> = {
  draft: '草稿',
  issued: '已开具',
  partial_paid: '部分收款',
  partial: '部分缴费',
  paid: '已缴费',
  overdue: '逾期',
  canceled: '已取消',
  refunded: '已退款',
};

/** 账单状态流转（合法下一步） */
export const invoiceStatusTransitions: Record<string, string[]> = {
  draft: ['issued', 'canceled'],
  issued: ['partial_paid', 'paid', 'overdue', 'canceled'],
  partial_paid: ['paid', 'overdue', 'canceled'],
  paid: ['refunded'],
  overdue: ['paid', 'refunded', 'canceled'],
  refunded: [],
  canceled: [],
};

/** 支付状态 */
export const paymentStatusLabels: Record<string, string> = {
  success: '成功',
  failed: '失败',
  canceled: '已取消',
  pending: '处理中',
  refunded: '已退款',
};

/** 退款状态 */
export const refundStatusLabels: Record<string, string> = {
  pending: '待处理',
  completed: '已完成',
  rejected: '已驳回',
  canceled: '已取消',
};

/** 支付渠道 */
export const paymentChannelLabels: Record<string, string> = {
  wechat_pay: '微信支付',
  alipay: '支付宝',
  bank_transfer: '银行转账',
  cash: '现金',
};

/** 作业 AI 状态 */
export const homeworkAiStatusLabels: Record<string, string> = {
  pending: '待处理',
  queued: '排队中',
  processing: '处理中',
  completed: '已完成',
  failed: '失败',
};

/** 作业复核状态 */
export const homeworkReviewStatusLabels: Record<string, string> = {
  draft: '草稿',
  unreviewed: '待复核',
  reviewing: '复核中',
  reviewed: '已复核',
  published: '已发布',
};

/** 任务状态 */
export const taskStatusLabels: Record<string, string> = {
  open: '待办',
  in_progress: '进行中',
  done: '已完成',
};
