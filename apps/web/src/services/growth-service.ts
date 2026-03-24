import type { PageResult, QueryBase } from '@/features/shared/types';

export type RubricTemplateItem = {
  rubricId: string;
  name: string;
  scope: string;
  version: string;
  status: string;
  dimensions: number;
  updatedAt: string;
};

export type ObservationItem = {
  observationId: string;
  observedAt: string;
  studentName: string;
  teacherName: string;
  scene: string;
  totalScore: string;
  reportPublished: string;
  status: string;
};

export type GoalItem = {
  goalId: string;
  studentName: string;
  goalType: string;
  title: string;
  progress: string;
  targetValue: string;
  dueDate: string;
  status: string;
};

export type ReportQueueItem = {
  reportId: string;
  studentName: string;
  reportType: string;
  period: string;
  owner: string;
  status: string;
  actionHint: string;
};

export type GrowthQuery = QueryBase & {
  studentId?: string;
  teacherId?: string;
  dateFrom?: string;
  dateTo?: string;
  scene?: string;
  reportPublished?: string;
  reportType?: string;
  publishStatus?: string;
};

const rubricTemplates: RubricTemplateItem[] = [
  { rubricId: 'rubric-weekly-core', name: '周度成长主模板', scope: '全校区 / 通用', version: 'v1.3', status: 'active', dimensions: 5, updatedAt: '2026-03-23 18:30' },
  { rubricId: 'rubric-lower-grade', name: '低年级习惯模板', scope: '1-2 年级', version: 'v0.9', status: 'draft', dimensions: 4, updatedAt: '2026-03-22 21:10' },
  { rubricId: 'rubric-stem-intensive', name: 'STEM 强化模板', scope: '数学 / 科学班', version: 'v1.0', status: 'active', dimensions: 6, updatedAt: '2026-03-20 14:00' },
];

const observations: ObservationItem[] = [
  { observationId: 'obs-2401', observedAt: '2026-03-24', studentName: '张小北', teacherName: '周老师', scene: '课堂观察', totalScore: '22 / 25', reportPublished: '待纳入', status: 'draft' },
  { observationId: 'obs-2398', observedAt: '2026-03-23', studentName: '林一诺', teacherName: '吴老师', scene: '作业讲评', totalScore: '19 / 25', reportPublished: '已纳入', status: 'published' },
  { observationId: 'obs-2393', observedAt: '2026-03-21', studentName: '赵安安', teacherName: '王老师', scene: '家校会谈', totalScore: '21 / 25', reportPublished: '待纳入', status: 'reviewing' },
];

const goals: GoalItem[] = [
  { goalId: 'goal-1001', studentName: '张小北', goalType: '习惯', title: '连续 3 周课后复盘打卡', progress: '2 / 3 周', targetValue: '3 周', dueDate: '2026-04-05', status: 'active' },
  { goalId: 'goal-1002', studentName: '林一诺', goalType: '成绩', title: '数学计算正确率提升到 95%', progress: '91%', targetValue: '95%', dueDate: '2026-04-12', status: 'active' },
  { goalId: 'goal-0994', studentName: '赵安安', goalType: '表达', title: '每周完成 1 次英文复述', progress: 'done', targetValue: '4 次', dueDate: '2026-03-20', status: 'closed' },
];

const reportsQueued: ReportQueueItem[] = [
  { reportId: 'report-w12-zxb', studentName: '张小北', reportType: '周报', period: '2026 W12', owner: '周老师', status: '待生成', actionHint: '可直接生成草稿' },
  { reportId: 'report-w12-lyn', studentName: '林一诺', reportType: '周报', period: '2026 W12', owner: '吴老师', status: '待补观察', actionHint: '缺 1 条观察素材' },
];

const reportsDrafts: ReportQueueItem[] = [
  { reportId: 'report-draft-zxy', studentName: '赵安安', reportType: '月报', period: '2026-03', owner: '王老师', status: '草稿', actionHint: '待补家庭任务总结' },
  { reportId: 'report-draft-lyr', studentName: '李亦然', reportType: '周报', period: '2026 W12', owner: '陈老师', status: '待复核', actionHint: '等待顾问审核' },
];

const reportsPublished: ReportQueueItem[] = [
  { reportId: 'report-pub-lnn', studentName: '卢南南', reportType: '周报', period: '2026 W11', owner: '周老师', status: '已发布', actionHint: '已推送家长' },
  { reportId: 'report-pub-cqy', studentName: '陈启元', reportType: '月报', period: '2026-02', owner: '吴老师', status: '已发布', actionHint: '可查看发布历史' },
];

export const growthService = {
  queryRubrics(params: QueryBase = {}): PageResult<RubricTemplateItem> {
    return {
      list: rubricTemplates,
      page: { pageNo: params.pageNo ?? 1, pageSize: params.pageSize ?? 20, total: rubricTemplates.length },
    };
  },
  detailRubric(rubricId: string) {
    return {
      rubricId,
      name: '周度成长主模板',
      schemaVersion: 'rubric-template-v1',
      status: 'active',
      dimensions: [
        { code: 'focus', name: '专注投入', weight: 30, scoreRange: '1-5', description: '课堂专注、任务切换、持续投入。', sort: 10 },
        { code: 'execution', name: '执行闭环', weight: 25, scoreRange: '1-5', description: '任务理解、行动完成、复盘闭环。', sort: 20 },
        { code: 'expression', name: '表达反馈', weight: 20, scoreRange: '1-5', description: '复述、提问、反馈质量。', sort: 30 },
      ],
      editorNotice: '动态 schema 已预埋，后续接 A6 的模板/维度 CRUD 与生成 schema。',
    };
  },
  queryObservations(params: GrowthQuery = {}): PageResult<ObservationItem> {
    return {
      list: observations,
      page: { pageNo: params.pageNo ?? 1, pageSize: params.pageSize ?? 20, total: observations.length },
    };
  },
  createObservation() {
    return {
      schemaKey: 'observation.dynamic.rubric-template-v1',
      createPermission: 'growth:observations:manage',
      idempotencyHint: '创建观察时可复用 requestId，避免重复提交。',
    };
  },
  queryGoals(params: GrowthQuery = {}): PageResult<GoalItem> {
    return {
      list: goals,
      page: { pageNo: params.pageNo ?? 1, pageSize: params.pageSize ?? 20, total: goals.length },
    };
  },
  detailGoal(goalId: string) {
    return {
      goalId,
      profile: [
        { name: '目标类型', detail: '习惯 / 短周期目标' },
        { name: '关联学生', detail: '张小北 / 春季学期 / 贵阳主校区' },
        { name: '截止时间', detail: '2026-04-05' },
      ],
      followups: [
        { title: '2026-03-18 第 1 次 check-in', detail: '完成 1 / 3 周复盘，老师提醒家长协助签到。' },
        { title: '2026-03-24 第 2 次 check-in', detail: '完成 2 / 3 周，新增关联观察 obs-2401。' },
      ],
      linkedItems: [
        { name: '关联观察', detail: 'obs-2401 / obs-2393' },
        { name: '关联家庭任务', detail: 'task-family-881 / 晚间复盘打卡' },
      ],
      nextAction: '保留 check-in 动作位，接 A6 的 /growth/goals/{goalId}/checkins。',
    };
  },
  actionGoal(goalId: string) {
    return {
      goalId,
      action: 'check-in',
      permissionCode: 'growth:goals:manage',
      idempotencyKeyRequired: true,
    };
  },
  queryReports(params: GrowthQuery = {}) {
    return {
      filters: params,
      queued: reportsQueued,
      drafts: reportsDrafts,
      published: reportsPublished,
      editor: {
        materialPool: [
          { name: '作业复核摘要', detail: 'submission HW-20260324-001 / 正确率 91%' },
          { name: '成长观察', detail: 'obs-2401 / 课堂专注提升' },
          { name: '成长目标', detail: 'goal-1001 / 复盘打卡进度 2/3' },
          { name: '表扬素材', detail: '本周主动复述 2 次，课堂表达更稳定' },
        ],
        draftSections: [
          { title: '正文编辑区', detail: 'Markdown / 富文本二选一，当前为三段式占位。' },
          { title: '预览分离', detail: '发布前需单独 preview，不与编辑保存混用。' },
        ],
        publishSettings: [
          { name: '发送渠道', detail: '微信 / 企业微信 / 系统消息（占位）' },
          { name: '发布状态', detail: 'draft -> reviewing -> published' },
          { name: '发布人', detail: 'growth advisor / campus admin' },
        ],
      },
    };
  },
  actionReport() {
    return {
      generateJob: { jobId: 'job_growth_report_001', status: 'queued' },
      publishPermission: 'growth:reports:manage',
      note: '报告生成与发布分离，发布按钮仅在预览确认后开启。',
    };
  },
};
