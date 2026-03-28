# 04 开发规格书

## 1. 目标
本规格书不是泛泛而谈的“技术建议”，而是为了让大模型直接输出工程代码时，**边界清晰、命名统一、重复最少**。

## 2. 工程标准
### 2.1 命名规则
- 表名：`snake_case` 复数，如 `homework_submissions`
- 字段名：`snake_case`
- TypeScript 类型：`PascalCase`
- DTO：`CreateStudentDto` / `UpdateStudentDto`
- React 组件：`StudentBasicCard.tsx`
- 路由段：小写复数，如 `/students/[studentId]/growth`
- Query Key：`['students', filters]`、`['student-detail', studentId]`

### 2.2 时间/金额/百分比
- 日期字段：`YYYY-MM-DD`
- 时间字段：ISO 8601
- 金额字段：后端统一 `numeric(12,2)`；前端统一格式化两位小数
- 百分比字段：数据库直接存 `0~100`，前端展示 `%`

### 2.3 统一响应结构
```json
{
  "code": "OK",
  "message": "success",
  "data": {},
  "requestId": "req_xxx"
}
```

### 2.4 统一分页结构
```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "list": [],
    "page": 1,
    "pageSize": 20,
    "total": 0
  }
}
```

## 3. Monorepo 目录建议
```text
apps/
  admin-web/
    app/
    components/
    features/
    lib/
    services/
    hooks/
    store/
    types/
  api/
    src/
      modules/
        auth/
        students/
        families/
        teachers/
        homework/
        growth/
        attendance/
        billing/
        tasks/
        alerts/
        settings/
        analytics/
      common/
      prisma/
      jobs/
  worker/
    src/
      jobs/
      queues/
packages/
  ui/
  shared-types/
  shared-utils/
```

## 4. 后端模块规范
每个模块固定包含以下目录：
```text
modules/students/
  students.controller.ts
  students.service.ts
  students.repository.ts
  students.module.ts
  dto/
    create-student.dto.ts
    update-student.dto.ts
    query-students.dto.ts
  mapper/
    student.mapper.ts
  types/
    student.types.ts
```

### 4.1 Controller 规范
- 只做：
  - 参数解析
  - 鉴权
  - 调用 service
  - 返回统一响应
- 不做：
  - SQL 拼接
  - 复杂业务规则
  - 跨模块写事务

### 4.2 Service 规范
- 负责跨表事务
- 负责规则判断
- 负责写入任务/预警
- 负责触发队列任务
- 负责返回聚合 DTO

### 4.3 Repository 规范
- 只负责 DB 查询与保存
- 允许封装复杂 SQL
- 严禁在 Repository 里调用其他模块 Service

## 5. 前端开发规范
### 5.1 页面骨架固定模式
#### 列表页
- 顶部：标题 + 新建按钮
- 二级：筛选条（关键词、学期、教师、状态、日期）
- 中部：表格
- 右上：导出 / 批量操作（如有）
- 底部：分页

#### 详情页
- 顶部：实体头部卡片
- 中部：Tabs
- 右侧或底部：时间线 / 任务 / 预警

#### 编辑页
- 表单分组
- 保存草稿 / 提交
- 字段级错误提示
- 离开未保存提醒

#### 工作台页
- KPI 卡片
- 待处理队列
- 快捷操作
- 趋势图

### 5.2 组件建议
| 组件名 | 用途 |
| --- | --- |
| `PageHeader` | 标题、返回、操作按钮 |
| `FilterBar` | 列表页统一筛选条 |
| `DataTable` | 支持排序/分页/多选 |
| `StatCard` | KPI 卡片 |
| `EntityHeaderCard` | 学生/家庭/教师详情头部 |
| `TabSection` | 详情页 Tab 区 |
| `TimelinePanel` | 家庭沟通、任务、账单操作时间线 |
| `AttachmentGallery` | 作业图片预览 |
| `AccuracyBadge` | 正确率显示 |
| `RiskLevelTag` | 预警等级标签 |
| `HabitScoreMatrix` | 习惯评分矩阵 |
| `GoalProgressCard` | 成长目标进度 |
| `InvoiceSummaryCard` | 账单汇总 |
| `EmptyState` | 空态组件 |
| `ConfirmDialog` | 关键操作二次确认 |

### 5.3 前端状态管理
- 服务端状态：TanStack Query
- 表单：React Hook Form + Zod
- 轻量 UI 状态：Zustand（可选）
- 不要把服务端列表结果长期塞进全局 store

## 6. 数据校验规则
### 6.1 学生/家庭
- `student_no` 唯一
- 同一学生同一学期仅允许 1 条 `student_enrollments`
- 家庭至少 1 个监护人
- 主联系人最多 1 个

### 6.2 教师
- `teacher_no` 唯一
- 同一学期同一学生同一角色分配不可重复

### 6.3 作业
- 一条作业必须属于 1 个学生、1 个日期、1 个科目
- 一条作业至少 1 个附件
- 一条作业只有 1 条最终复核记录
- 错因标签允许多选但不可重复

### 6.4 习惯评分
- 维度分数必须在 1~5
- 总分不能手填，应由后端或前端实时计算
- 评分规则版本不可覆盖历史记录

### 6.5 收费
- 合同编号唯一
- 账单编号唯一
- `received_amount` 不允许大于 `receivable_amount + 允许超收阈值`
- 退款金额累计不得超过已收金额

## 7. 任务与预警自动化规则
### 7.1 作业复核后
- `risk_level = watch`：创建 alert，不强制任务
- `risk_level = coaching`：创建 alert + task
- `risk_level = critical`：创建高优先级 alert + task

### 7.2 账单扫描
- 距离到期 3 天未付款：创建 `billing_watch`
- 已逾期：创建 `billing_overdue`
- 逾期 15 天以上：升级优先级并加入校长仪表盘

### 7.3 成长目标
- 目标临近到期且未完成：生成教师待办
- 周报未完成：生成教务待办

## 8. 页面交互细则
### 8.1 列表页筛选参数统一
- `keyword`
- `page`
- `pageSize`
- `status`
- `termId`
- `teacherId`
- `grade`
- `dateFrom`
- `dateTo`
- `sortBy`
- `sortOrder`

### 8.2 表格列操作统一
- 查看详情
- 编辑
- 归档 / 停用（按模块）
- 复制 / 生成（按模块）
- 删除：仅限系统配置类字典；业务表尽量不用物理删除

### 8.3 空态
每个列表页必须有：
- 无数据空态
- 无搜索结果空态
- 无权限空态
- 加载失败态

## 9. 上传与文件处理
### 9.1 文件上传规则
- 单次支持多图
- 后端先拿上传凭证，再直传对象存储
- 业务表只保存 URL / 文件名 / 类型 / 排序

### 9.2 图片展示
- 默认展示缩略图
- 点击进入原图预览
- 作业详情页支持左右切换图片

## 10. AI 集成规则
### 10.1 AI 的职责
- 从图片提取作业内容
- 输出初步正确率和错因
- 生成建议文案草稿
- 生成周报草稿
- 生成家庭建议草稿

### 10.2 AI 的边界
- 不直接修改正式记录
- 不自动对外发送
- 不跳过教师复核
- 不创建“心理结论”

### 10.3 Prompt 版本化
AI 调用必须记录：
- provider
- model_name
- prompt_version
- created_at

## 11. 统计口径
### 11.1 作业正确率
- 数据源：`homework_reviews.final_accuracy`
- 无教师复核时，允许回退到最近一条 AI 结果
- 仪表盘展示以教师复核优先

### 11.2 习惯均分
- 数据源：`habit_observations.total_score`
- 默认统计周期：最近 30 天

### 11.3 学习时长
- 数据源：`study_sessions.duration_minutes`
- 默认按学生 / 学科 / 周 / 月聚合

### 11.4 欠费金额
- 口径：`receivable_amount - received_amount`
- 仅统计 `status in (issued, partial, overdue)`

## 12. 测试要求
### 12.1 单元测试
- Service 规则函数
- 金额计算
- 风险等级计算
- 目标进度计算
- 账单状态流转

### 12.2 API 测试
至少覆盖：
- 新建学生
- 新建家庭与监护人
- 上传作业
- 复核作业
- 创建习惯观察
- 创建成长目标
- 创建合同
- 生成账单
- 记录收款
- 生成周报

### 12.3 E2E 测试
至少覆盖 6 条主流程：
1. 学生建档
2. 作业上传到复核
3. 习惯观察到周报
4. 合同到收款
5. 设备绑定到学习时长
6. 预警到任务关闭

## 13. 初始环境变量
```env
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
AI_PROVIDER=
AI_MODEL_HOMEWORK=
AI_MODEL_REPORT=
```

## 14. Definition of Done
一个模块开发完成，至少满足：
- DDL 已落库
- API 可跑通
- Swagger / OpenAPI 可见
- 列表页 + 详情页 + 编辑页完成
- 基础校验完成
- 至少 1 条 E2E 主流程通过
- 页面空态/错误态已处理
- 关键按钮有 loading / disabled 状态
