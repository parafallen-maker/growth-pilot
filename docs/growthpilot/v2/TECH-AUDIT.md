# GrowthPilot v2 技术落地审计

> 目标：回答 **“这个 repo 从哪里开始，才能最快跑通 Phase A 闭环”**
> 审计对象：`/Users/kgiot/.openclaw/workspace/growth-pilot`
> 参考文档：`PRD.md`、`Roadmap.md`、`PM-REVIEW-SUMMARY.md`
> 结论口径：只做技术审计与落地方案，不做大规模代码改造

---

## 一、执行结论（先看这个）

**最快跑通 Phase A 闭环的起点，不是从“新建 v2 产品”开始，而是从“把现有 v1 仓库收敛成一个教师闭环骨架”开始。**

最短路径是：

1. **先修 V1 基座里的真实阻塞项**，尤其是安全版本、健康检查口径、前后端 schema/样式基线不统一这几件事；
2. **直接复用现有 Homework / Growth / Students 360 / Analytics Teacher Workbench 能力**，不要推翻重做；
3. **以 V2 Today 为新的教师默认入口**，但后端先用现有 `analytics teacher workbench + tasks + alerts + growth observations + homework queue` 拼出第一版聚合；
4. **V3 不做“全量成长档案重构”，先把现有 `students/:id/360` 升级成“分层展示 + 明确 next step”**；
5. **V5 周报引擎优先复用现有 `growth reports` 生成/复核/发布链路**，把“成长报告”收口成“Weekly Digest”；
6. **V8 Excel 导入只做 lite 幂等增强，用已有 `students import + migration scripts` 扩，不另起炉灶。**

**一句话判断：这个 repo 不是“没有基座”，而是“有一套偏 v1 信息架构的可运行骨架”；Phase A 应该做的是重排主路径，不是重写系统。**

---

## 二、当前技术栈 / 目录结构 / 关键模块

## 2.1 技术栈识别

### 前端
- **Next.js 15.2.4**
- **React 19**
- App Router 结构
- 当前主要是 **自定义样式 / 全局 CSS**，**没有看到 `tailwind.config.*`**
- 服务访问方式是服务层直调 API（`apps/web/src/services/*`）

### 后端
- **NestJS 11**
- TypeScript
- Drizzle ORM / PostgreSQL
- Redis / BullMQ（任务队列）
- S3/MinIO 兼容对象存储

### 测试与工程化
- API 单测/契约测试：Node test runner
- E2E：Playwright
- Monorepo：npm workspaces
- packages：`schema` / `ui` / `config`

### 运行形态
- `docker-compose.yml` / `docker-compose.prod.yml`
- 生产编排包括：`api + web + postgres + redis + minio + nginx`

---

## 2.2 目录结构判断

### Monorepo 主结构
- `apps/api`：NestJS API
- `apps/web`：Next.js Web
- `packages/schema`：共享 schema 包（目前存在，但还不够强）
- `packages/ui`：共享 UI primitive
- `packages/config`：配置包
- `deploy`：部署脚本、nginx、备份/回滚脚本
- `docs/growthpilot`：产品与迁移文档
- `e2e`：跨模块 Playwright 用例

### 当前前端信息架构（偏 v1）
`navigation.ts` 里还是明显的管理系统分区：
- 工作台
- 学生中心
- 家庭中心
- 教师中心
- 教学管理
- 校务管理
- 财务中心
- 任务预警
- 数据分析
- 系统设置

这和 PRD 里的 **Today / Children / Weekly / Operations** 差距很大。说明：

**代码层已经有很多业务模块，但产品入口仍然是 v1 管理视角。**

---

## 2.3 关键模块现状

### 已有、且可直接复用的后端模块
- `auth`
- `students`
- `families`
- `teachers`
- `homework`
- `growth`
- `attendance`
- `billing`
- `communication`
- `tasks`
- `alerts`
- `analytics`
- `files`
- `health`
- `jobs`
- `settings`
- `users`

### 已有、且对 Phase A 最关键的能力

#### 1) 作业闭环已具备骨架
- `files/upload`
- `homework/submissions`
- `analyze`
- `review draft`
- `submit review`
- `error taxonomies`

这说明 **Observe → Understand 的“学业侧输入”已存在**。

#### 2) 习惯观察 / 成长报告已具备骨架
- `growth/observations`
- `growth/goals`
- `growth/reports`
- `reports/generate`
- `reports/review`
- `reports/publish`

这说明 **Track / 输出链已经不是从零开始**。

#### 3) Student 360 已具备聚合雏形
- `GET /students/:studentId/360`
- 聚合了 homework / growth / attendance / billing / family / timeline

虽然离 v2 的“成长档案”还差很远，但 **Children 页最难的一步——跨模块汇总——已经有现成入口**。

#### 4) Teacher Workbench 已有雏形
- `analytics/teacher-workbench`
- dashboard 中已经针对教师角色做了专门视图

这说明 **Today 并不是从零设计 API，而是先把 workbench 正名、收口、减负即可。**

#### 5) 导入与迁移并非空白
- `students/import`
- `scripts/migration/*`
- `artifacts/migration/*`

V8 不是从 0 到 1，而是从“可导入”升级到“可试运行”。

---

## 三、现状验证：这个 repo 是否已经可运行？

结论：**是，且基础功能链条比 PRD 假设的更完整。**

### 证据
- API 测试已执行：**48 tests，33 pass，0 fail，15 todo**
- 覆盖了：
  - Auth
  - 学生建档链
  - 作业复核链
  - 成长目标链
  - 账单收款链
  - 考勤链
  - API gap / 契约检查 / 权限边界

这意味着：

1. 当前仓库不是“概念稿”；
2. 它已经有一套可跑的业务链；
3. 真正的问题是 **主入口、信息架构、聚合方式、MVP 收口**，而不是 CRUD 缺失。

---

## 四、V1 基座问题是否真实存在？

结论：**真实存在，但不是所有 V1 问题都同优先级。**

我把它拆成三类：

---

## 4.1 P0：必须先修，否则会拖慢 Phase A

### P0-1 安全基线问题真实存在
**证据：** `npm audit --omit=dev` 仍有 **1 critical / 3 high**
- `next` 当前版本 `15.2.4`，存在已知 critical/high advisories
- `@nestjs/core` / `@nestjs/platform-express` 受 `path-to-regexp` 高危影响

**判断：真实存在，优先级最高。**

**原因：**
Phase A 要尽快进入试运行，不能带着明显已知高危版本继续叠业务。

**建议：**
- 先升 `next` 到当前安全 patch（审计结果建议 `15.5.14`）
- 升 NestJS 相关 patch，消掉 `path-to-regexp` 风险
- 这项应该放 Week 1 Day 1

---

### P0-2 共享 schema 基座不完整，真实存在
**证据：**
- `packages/schema` 已存在
- 但 Roadmap 要求“添加 Zod 到 packages/schema，前后端共享校验”
- 当前 `zod` 依赖只明确出现在 web/package.json，schema 包本身还没体现出“前后端统一校验中心”的角色

**判断：真实存在。**

**影响：**
V2/V3/V5 都是聚合接口和结构化输出，如果 schema 不先统一，前后端会继续各写各的 view model，返工概率高。

**建议：**
- 把 Today / ChildProfile / WeeklyDigest 的 DTO 和 view model 放进 `packages/schema`
- 用它定义“Phase A 的冻结 contract”

---

### P0-3 前端样式基线问题真实存在，但优先级低于安全与 schema
**证据：**
- Roadmap 提到“添加 Tailwind 配置”
- 当前 repo 未见 `tailwind.config.*`
- 前端页面使用大量自定义 class / inline style

**判断：问题真实存在，但不是 Phase A 的第一阻塞。**

**影响：**
不是功能阻塞，而是 V2 新信息架构落地时页面搭建成本会偏高、复用性差。

**建议：**
- 可以在 Week 1 建样式基线
- 但不要先搞全站视觉迁移
- Phase A 只要求 **Today / Children / Weekly 三个新主路径** 有可维护 UI 结构即可

---

## 4.2 P1：需要处理，但可以伴随 V2/V3/V5 落地一起收

### P1-1 Health 端点问题：原问题已被修掉，但仍需统一口径
**证据：**
- `main.ts` 配置了全局前缀 `api/v1`
- `health` 与 `health/ready` 被排除在前缀外
- `health.service.ts` 已返回 `db / redis / storage` readiness

**结论：**
Roadmap 中“`GET /api/v1/health` 返回 404”这个历史问题，**从当前代码看大概率已经修过**。

但这里还有一个口径问题：
- 现在实际健康接口是 `/health` 和 `/health/ready`
- 不是统一挂在 `/api/v1/health`

**建议：**
- 不一定非改回 `/api/v1/health`
- 但需要在文档、探针、前端/运维约定里统一
- 生产 healthcheck 目前也不是直接打 `health`，而是打 `/api/v1` 根路径，这个口径有点散

---

### P1-2 Files Upload 500：历史问题当前大概率已修复
**证据：**
- `files.controller.ts` / `files.service.ts` 有完整大小限制、boundary 校验、mimeType 校验、batch/multipart 处理
- 测试输出里 `QA-02 作业复核链：upload -> analyze -> review` 已通过

**结论：**
这个问题在当前 repo 上 **不再是 Phase A 的阻塞项**。

**建议：**
- 从 V1 清单中降级
- 保留回归测试即可

---

### P1-3 `.env` 泄露问题：当前已基本处理，但要补发布面检查
**证据：**
- `git ls-files .env` 为空
- 被跟踪的是 `.env.example` / `.env.prod.example`

**结论：**
历史问题已处理。

**补充建议：**
- 在 CI 增加 secret scan / `.env` deny rule
- 因为当前仓库根目录本地仍存在 `.env` 文件，虽然没 track，但要防误提交

---

### P1-4 MinIO latest：问题真实存在
**证据：**
- `docker-compose.prod.yml` 中仍是 `minio/minio:latest`

**结论：真实存在。**

**建议：**
- 这是很典型的试运行风险项
- 应在 Week 1 一起锁定版本

---

## 4.3 P2：真实问题，但不是 Phase A 最先动的地方

### P2-1 持久化架构“双轨”问题真实存在
**证据：**
- `resolvePersistenceAdapter()` 支持 `file | db`
- 默认是 `file`
- 代码里仍有 `.data/*.json` 数据文件
- 同时又存在 Drizzle / PostgreSQL / migration

**结论：真实存在，而且是当前仓库最大的结构性技术债。**

**但优先级要谨慎判断：**
- 它不是 Phase A 第一周的首刀
- 因为当前很多测试链已经能跑
- 但到 **V8 真实 Excel 导入 + 试点班级跑闭环** 时，这会变成大问题

**建议：**
- Phase A 前半段不全量重构 persistence
- 但必须明确：**试运行环境统一用 DB adapter，禁止 file adapter 进入试点数据链**
- 否则 Today / Weekly / 导入数据一致性会出问题

---

## 五、V2 / V3 / V5 / V8 对现有代码的改动面评估

---

## 5.1 V2 Today 工作台

### 现有可复用能力
- `analytics/teacher-workbench`
- `tasks`
- `alerts`
- `homework` 待复核队列
- `growth observations`
- dashboard 已有教师首页分支

### 还缺什么
- 一个明确的 **`GET /api/v1/today` 聚合 contract**
- 观察提示（observation prompts）独立资源/规则生成
- 首页从“摘要工作台”变成“只保留 3 个优先队列”

### 改动面判断
**中等改动，不是大重构。**

**后端：**
- 新增 Today 聚合 service/controller
- 先拼已有模块结果，不急着建复杂新表
- 观察提示先做规则生成 + 轻量存储即可

**前端：**
- 新增 Today 页面
- 替换教师默认 landing page
- 调整导航结构

### 结论
**V2 是最适合先做的版本。**
因为它几乎不需要推翻现有域模型，只是把已有能力重新组织成教师主路径。

---

## 5.2 V3 孩子成长档案

### 现有可复用能力
- `students/:id/360`
- timeline 已聚合 homework / growth / attendance / billing / family
- 前端已有 `students/[studentId]/page.tsx`

### 主要问题
当前 `Student360` 更像“聚合报表页”，还不是 PRD 里的“先判断，再证据，后明细”的成长档案。

### 改动面判断
**中等偏大，但可以分两步做。**

#### 第一步（Phase A 必做）
在现有 `students/:id/360` 基础上：
- 补第一屏 `变化 / 风险 / 下一步`
- 重整字段组织顺序
- timeline 保留
- growth plan 只做 lite 区块/占位

#### 第二步（Phase B 再做）
- 真正的成长 snapshot / signal / narrative 化聚合
- 复杂趋势与跨维度可视化

### 结论
**V3 不要重写 children domain。**
最快路径是 **升级 Student360，而不是新造 Children Profile 系统**。

---

## 5.3 V5 周报引擎

### 现有可复用能力
- `growth/reports`
- `generate / review / publish / bulk-publish`
- 页面 `growth/reports/page.tsx` 已有生成、复核、发布工作台

### 主要差距
当前更像“成长报告模块”，不是 PRD 定义的 **Weekly Digest 核心产出引擎**。
主要差在：
- 命名与产品心智不统一
- 周报状态机还不完全对齐 PRD（数据不足 / 暂不建议发送）
- 需要从“模块”升级成“系统核心交付”

### 改动面判断
**中等改动，复用度极高。**

### 结论
**V5 不该从零做 weekly_digests 新系统。**
更快路径是：
- 在现有 `growth reports` 上做模型收口
- 逐步把 report 语义切到 weekly digest
- 先保证“自动生成草稿 → 教师复核 → 发布”跑通

这是当前 repo 里 **复用价值最高的一块**。

---

## 5.4 V8 数据迁移 + Excel

### 现有可复用能力
- `students/import`
- `scripts/migration/*`
- `artifacts/migration/*`
- 解析 CSV/JSON、预检、duplicate 检查已经有雏形

### 主要缺口
- 还不是完整导入向导
- 幂等、映射、错误报告、dry-run 结果展示不够产品化
- 更重要的是：要和 Today / Children / Weekly 的试运行链联动验证

### 改动面判断
**中等改动，但依赖前面 V2/V3/V5 的 contract 稳定。**

### 结论
V8 必须后置到 V2/V3/V5 第一版稳定后，否则你导进来的是真实数据，但没有稳定消费路径。

---

## 六、哪些能力能复用，哪些需要新建

## 6.1 可直接复用

### 后端
- Auth / Users / Permission Guard
- Homework submission / analysis / review
- Growth observation / goals / reports
- Student360 聚合接口
- Tasks / Alerts
- Analytics teacher workbench
- Files upload
- Jobs / Queue
- Import 基础解析能力

### 前端
- App Shell / 登录态 / 权限裁剪
- Dashboard 教师页骨架
- 学生详情页骨架
- 成长报告页骨架
- 现有 page blocks / summary / timeline UI primitives

---

## 6.2 需要新建或明确新抽象

### 必须新建的 API / 聚合层
1. **Today 聚合 API**
   - `GET /api/v1/today`
2. **Observation Prompt 资源/规则层**
   - `GET /api/v1/observation-prompts`
   - 完成/忽略动作
3. **Child Profile v2 view model**
   - 不一定新建底层表，但至少要新建一个面向页面的聚合 view model
4. **Weekly Digest 状态机补完**
   - 把“可直接发送 / 数据不足 / 暂不建议发送”补齐
5. **Phase A 冻结 schema 包**
   - today / child profile / weekly digest 三类 contract 统一定义

### 暂时不要新建的东西
- 新的复杂规则平台
- 新的 AI 编排系统
- 新的多校区复杂权限体系
- 独立家长端应用
- 全新 Children 领域模型
- 全新 Weekly 引擎数据库体系（除非现有 report 模型证明完全不适配）

---

## 七、Phase A 最小实现顺序（建议顺序）

## 7.1 推荐顺序

### 第 0 步：先收口技术基线（V1 中必须项）
先做：
- 升安全 patch（Next / Nest）
- 锁 MinIO 版本
- 固化 Phase A schema contract
- 明确试运行统一使用 DB adapter

**理由：**这几项不做，后面所有功能都在漂。

---

### 第 1 步：V2 Today
先让教师“进系统就知道今天干什么”。

**原因：**
- 对外最容易展示产品方向变化
- 对内改动最小、反馈最快
- 能把现有 homework / tasks / alerts / analytics 重新整合成一个入口

---

### 第 2 步：V3 Children（基于 Student360 升级）
不是新建 children 系统，而是把现有 `Student360` 改造成：
- 第一屏：变化 / 风险 / 下一步
- 第二屏：趋势与计划 Lite
- 第三屏：时间线与明细

**原因：**
Today 卡片必须有去处，否则只是首页拼盘。

---

### 第 3 步：V5 Weekly（复用 Growth Reports）
把现有 report 流程收束成 weekly digest。

**原因：**
只有 Today + Children，还不算闭环；
Phase A 的交付价值来自 **教师审阅后输出给家长**。

---

### 第 4 步：V8 Excel lite
最后再接真实历史数据，用试点班级验证：
- Today 是否能出待办
- Children 是否有证据层
- Weekly 是否能生成可审阅草稿

**原因：**
导数据不是目的，跑闭环才是。

---

## 八、第一周最小落地任务顺序

目标：**Week 1 结束时，不求完整闭环，但要把“Phase A 的技术主骨架”钉住。**

### Day 1：基线修复
1. 升 `next` 到安全 patch 版本
2. 升 Nest 相关 patch，消掉 `path-to-regexp` 风险
3. 锁定 `docker-compose.prod.yml` 中 MinIO 版本
4. 明确 `.env` / secret 提交保护规则
5. 约定试运行统一用 DB adapter

**产出：** 安全基线通过，部署基线稳定

---

### Day 2：冻结 Phase A contract
1. 在 `packages/schema` 中定义：
   - `TodayView`
   - `TodayQueueItem`
   - `ObservationPrompt`
   - `ChildProfileSummary`
   - `WeeklyDigestSummary`
2. 后端/前端统一引用
3. 不求一次性很完美，但要先冻结字段口径

**产出：** V2/V3/V5 后续迭代不再各写各的 view model

---

### Day 3：Today API 第一版
1. 新增 `GET /api/v1/today`
2. 数据先来自：
   - teacher workbench
   - tasks
   - alerts
   - homework pending review
3. 队列先做：
   - must_do
   - weekly_due
   - escalations
   - completed_today

**产出：** 后端聚合口成型

---

### Day 4：Today 页面第一版
1. 新增 Today 页面
2. 教师登录默认进入 Today
3. 卡片支持跳转到：
   - homework review
   - growth observation
   - student detail
4. 首页只保留 3 个优先队列

**产出：** 教师主路径开始成立

---

### Day 5：Children 页最小升级方案定稿
1. 基于现有 `students/:id/360` 输出新的页面结构草图
2. 明确第一屏字段来源：
   - 变化
   - 风险
   - 下一步
3. 明确哪些来自现有聚合，哪些暂时用 rule-based placeholder
4. 评估 Weekly 复用 `growth reports` 的字段映射

**产出：** Week 2 可以直接进入 V3 / V5 实作，而不是继续讨论

---

## 九、对 PM 路线图的技术校正建议

## 9.1 V1 不是“再修一遍历史 bug”，而是“把基线切成可承载 Phase A 的形态”
建议把 V1 实际拆成：
- 安全补丁
- 运行/部署口径统一
- schema 冻结
- persistence 策略明确

而不是继续把时间花在已经基本修过的 upload/health 老问题上。

---

## 9.2 V3 必须定义为“Student360 升级”，不要定义成“新 Children 系统”
否则工期会虚高，且复用率太低。

---

## 9.3 V5 应该是“Growth Reports 产品化收口”，不是另起炉灶
这会直接缩短 30%~50% 的实现路径。

---

## 9.4 V8 必须依赖 DB-only 试运行环境
如果继续允许 file persistence 进入试点链路，迁移验证会失真。

---

## 十、最终判断：这个 repo 从哪里开始，才能最快跑通 Phase A 闭环？

**答案：从 V1 的“安全/contract/persistence 基线收口” + V2 Today 开始。**

不是从：
- 重写前端导航
- 重做数据库
- 新建 Children 领域模型
- 重新设计周报引擎

而是从：

1. **修安全与部署基线**
2. **冻结 Today / Children / Weekly 的共享 contract**
3. **先做 Today 聚合 API + 教师默认入口**
4. **把现有 Student360 升级成 Children 第一版**
5. **把现有 Growth Reports 收口成 Weekly Digest**
6. **最后再做 Excel lite 接试点数据**

这条路线的好处是：
- 改动面最小
- 复用度最高
- 最快能让教师真的用起来
- 最快能得到试点反馈
- 最符合 PRD/PM Summary 的“先教师闭环、再智能化和经营层增强”原则

---

## 十一、建议的实施优先级总表

| 优先级 | 事项 | 结论 |
|---|---|---|
| P0 | Next / Nest 安全 patch | 立即做 |
| P0 | Phase A schema 冻结 | 立即做 |
| P0 | 试运行 persistence 统一 DB | 立即定 |
| P0 | Today 聚合 API | 第一功能项 |
| P1 | Today 前端入口替换 | 紧随其后 |
| P1 | Student360 升级为 Children v1 | Week 2 进入 |
| P1 | Growth Reports 收口为 Weekly | Week 2~3 |
| P1 | MinIO 版本锁定 | Week 1 一起做 |
| P2 | Tailwind / 样式基线 | 可并行，但不抢主线 |
| P2 | 复杂分析引擎 | 后置 |
| P2 | 全量 persistence 重构 | 后置但需有边界 |
| P2 | 管理大屏 / BI | 后置 |

---

## 十二、给 CEO / PM 的一句落地建议

**这不是“重做一套 v2”，而是“把现有可运行 v1 骨架，重排成 Today → Children → Weekly 的教师闭环产品”。**

技术上最快的打法是：
**少建新域，多做聚合；少推翻旧模块，多重写主路径。**
