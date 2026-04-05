# GrowthPilot v2 — Week 1 开工单

> 基于：EXECUTION-PACK.md / TECH-AUDIT.md
> 目标：在不重写系统的前提下，最快启动 Phase A 闭环

---

## 1. 本周唯一目标

**把现有 v1 管理骨架，收敛成可承接 Phase A 的教师闭环起点。**

本周不追求完成 Today / Children / Weekly 全闭环。
本周只做两件事：
1. 把真正会拖慢 Phase A 的基座问题先收口
2. 把 Today 所需的共享 contract 与后端聚合入口立起来

---

## 2. 本周完成标准

若本周结束时同时满足以下条件，则 Week 1 视为完成：

- 安全和部署基线已收口：
  - `next` / `nestjs` 高危依赖已处理
  - `docker-compose.prod.yml` 中 MinIO 不再使用 `latest`
- 技术路线已统一：
  - Phase A 试运行明确采用 **DB-only** 持久化口径，不再让 file/db 双轨继续扩散
- 共享 contract 已冻结：
  - Today / ChildProfile / WeeklyDigest 三类 schema 在 `packages/schema` 中有明确定义
- 后端第一入口已建立：
  - `GET /api/v1/today` 有可联调的第一版返回结构
- 产品与业务侧阻塞项已被明确：
  - 试点班级 / 学生唯一标识 / 周报发送定义 / Growth Plan Lite 范围 有结论或默认决策

---

## 3. 本周不做

以下内容本周不进入执行面：
- 重写 Student360
- 正式做 Weekly Digest 全链路 UI
- 正式做关联分析规则引擎
- 正式做 Growth Plan 子系统
- 全站导航重构
- 家长端发送通道接入
- 生产化监控/备份/回滚全量演练

原则：**本周只做闭环起跑动作，不做系统翻新。**

---

## 4. Day 1–Day 5 执行顺序

## Day 1｜基座风险收口

### Coder
- 升级 `next` 到安全 patch 版本
- 升级 NestJS 相关 patch，清理 `path-to-regexp` 相关高危
- 锁定 `docker-compose.prod.yml` 中 MinIO 版本
- 明确并落文档：Phase A 采用 DB-only 持久化口径

### 验收
- 高危依赖显著收敛（至少清掉 current critical / high 主风险）
- MinIO 不再使用 `latest`
- 技术文档中明确写清：试运行不再扩展 file/db 双轨

---

## Day 2｜冻结 Phase A 共享 contract

### PM
- 确认 Today 三类队列的业务定义：
  - 今天必须处理
  - 本周应完成
  - 风险升级
- 确认孩子档案第一屏固定输出：
  - 变化
  - 风险
  - 下一步
- 确认 Weekly Digest 最小结构

### Coder
- 在 `packages/schema` 中建立：
  - `TodayResponse`
  - `ChildProfile`
  - `WeeklyDigest`
- 明确哪些字段直接复用现有模块，哪些是聚合层字段

### 验收
- 前后端对 3 类核心对象的字段口径统一
- 后续 Today / Children / Weekly 不再各写各的 view model

---

## Day 3｜打通 Today 聚合 API

### Coder
- 基于现有能力先拼第一版 `GET /api/v1/today`
- 优先复用：
  - homework queue
  - teacher workbench / analytics
  - tasks
  - alerts
  - growth observations

### 输出要求
返回四个区块：
- `must_do`
- `weekly_due`
- `escalations`
- `completed_today`

### 验收
- 接口可被前端直接消费
- 每个卡片至少具备：标题、学生、原因、动作入口、优先级/状态

---

## Day 4｜Today 页面第一版联调

### Design
- 产出 Today 主态 + 空态 + 完成态

### Coder
- 前端完成 Today 页面
- 教师登录默认跳转 Today
- 卡片支持直达复核 / 观察 / 风险处理

### 验收
- 教师视角默认进入 Today
- 首页只展示 3 个优先队列
- 每队列默认最多 5 项
- 完成动作后 UI 有状态反馈

---

## Day 5｜冻结 Children 升级方案

### PM
- 明确 Student360 → Children Profile 的升级口径：
  - 不推翻 Student360 聚合能力
  - 只重排信息分层与阅读顺序

### Coder
- 基于现有 `students/:id/360` 输出差异分析
- 列出：
  - 可直接复用字段
  - 需要新增的聚合字段
  - 第一屏摘要如何生成

### 验收
- 形成 Children 改造方案，不进入“大拆大建”
- 下周可直接进入 Children 页面实现

---

## 5. Owner 分工

### PM
- 冻结业务定义
- 控制 Phase A 范围不膨胀
- 明确试点班级、周报标准、Growth Plan Lite 范围

### Coder
- 收口安全/部署/contract 基线
- 先做 Today 聚合与默认入口
- 基于已有 Student360 / Growth Reports 做升级，不另起炉灶

### Design
- 只服务闭环主路径：Today / Children / Weekly
- 不做全站重设计

### 业务/运营
- 提供试点班级
- 提供最小可用历史数据
- 参与 Today 试用走查

---

## 6. 当前 4 个阻塞决策（建议默认值）

如果 Tok Tik 暂时不逐条拍板，建议先按以下默认值推进：

### D1. 试点班级与数据源
**建议默认：** 选 1 个数据相对完整、教师配合度高的班级作为唯一试点。

### D2. 学生唯一标识
**建议默认：** 以 `student_no` 作为业务主键；若历史 Excel 无稳定 `student_no`，导入时生成稳定 `import_student_key` 并落库映射，不允许靠姓名做主键。

### D3. 周报“发送”定义
**建议默认：** Phase A 的“发送”= 教师完成审阅后，可导出 / 可复制 / 可人工发送；不把正式消息通道接入当作本阶段阻塞项。

### D4. Growth Plan Lite 范围
**建议默认：** 只做“目标 + 备注 + 进度”的轻量区块，不做动作编排、不做独立子系统。

---

## 7. 我对开工顺序的最终判断

**正确顺序不是：先重构系统，再想闭环。**

而是：
1. 先收口基线
2. 先立 Today
3. 再升级 Children
4. 再收口 Weekly
5. 最后用真实数据试运行

一句话：**先把主路修通，再谈智能化和经营层。**
