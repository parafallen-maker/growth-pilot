# P0 功能优化执行总结

## 变更概览

本次执行完成了功能设计 V2 中的 **P0 优先级** 核心改动，包括 4 大类共 20+ 个文件的修改。

---

## 1. 导航重构 — `navigation.ts`

**之前**: 9 个分组，英文标签（`Homework Submissions`、`Error Taxonomies`、`Users & Roles`）
**之后**: 10 个业务域，全中文标签 + emoji icon

render_diffs(file:///Users/Ljc_1/Downloads/growth-pilot/apps/web/src/lib/navigation.ts)

关键变化：
- `主数据` → 拆分为 `学生中心`、`家庭中心`、`教师中心`
- `作业` + `成长` → 合并为 `教学管理`
- `出勤` + `沟通` → 合并为 `校务管理`
- 新增 `任务预警` 分组（含 任务中心 + 预警中心）
- 新增 `roleLabels` 映射表（6 角色 → 中文显示名）

## 2. AppShell 更新 — `app-shell.tsx`

render_diffs(file:///Users/Ljc_1/Downloads/growth-pilot/apps/web/src/components/business/app-shell.tsx)

变化：
- 品牌文案：`Authenticated Admin Shell` → `洪基托管成长中心`
- 用户角色：显示 `成长顾问` 而非 `growth_advisor`
- 导航 section title 带 emoji icon：`📝 教学管理`
- 顶栏：删除调试文案，`Admin Console` → `管理后台`

## 3. 调试文案清理

**涉及 30+ 个页面文件**，主要类型：

| 类型 | 示例 (之前 → 之后) |
|---|---|
| PageHeader description | `真实数据来自 GET /students` → `学生档案管理与状态查看` |
| 表单说明 `<p>` | `FE-19 已接真` → `选择学生，上传作业图片` |
| 技术 badge | `POST /review`、`schema fields: 7` → 删除 |
| 表单 label | `reviewResult` → `复核结论` |
| 选项文案 | `approved/adjusted/rejected` → `通过/修正/退回` |
| 指标 hint | `pending / queued` → `等待系统分析` |
| 登录页 | `现在不是摆拍页了...` → `请输入账号和密码登录管理后台` |

## 4. 新增 3 个页面

### `/tasks` — 我的待办
render_diffs(file:///Users/Ljc_1/Downloads/growth-pilot/apps/web/src/app/(dashboard)/tasks/page.tsx)

- 按角色差异化显示待办（教师看复核/跟进，校长看全局）
- 紧急/一般分组展示
- 快捷跳转到对应操作页面（复核/沟通/账单等）

### `/alerts` — 预警中心
render_diffs(file:///Users/Ljc_1/Downloads/growth-pilot/apps/web/src/app/(dashboard)/alerts/page.tsx)

- 4 条预警规则：欠费(7天) / 学业(3次<60%) / 缺勤(3天) / 目标逾期(7天)
- 颜色分级预警卡片（红/黄/灰）
- 预警规则说明面板

### `/tasks/list` — 任务中心
render_diffs(file:///Users/Ljc_1/Downloads/growth-pilot/apps/web/src/app/(dashboard)/tasks/list/page.tsx)

- 全校任务管理视图
- 筛选：类型/优先级/负责人/状态
- DataTable + 详情卡片双视图

## 验证

- ✅ TypeScript 编译通过（`npx tsc --noEmit` 无报错）

## 下一步

- **P1**: 教师工作台首页（Dashboard 角色差异化渲染）
- **P1**: 作业复核 UX 优化（图片预览/键盘快捷键/自动跳下一条）
- **P1**: 剩余 ~15 个页面的内嵌调试文案清理
