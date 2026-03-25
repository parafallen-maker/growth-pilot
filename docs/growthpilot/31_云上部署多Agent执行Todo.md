# 31 云上部署多 Agent 执行 Todo

> 用途：把 Growth Pilot 从“仓库内已基本打通”推进到“云上可运行、可预发、可回滚、可签收”。
> 原则：严格遵守 `15_多Agent协作任务总文件.md` 的角色边界与 Source of Truth，不把外部依赖假装成已完成。

---

## 0. 当前判断

当前仓库状态：
- 仓库内可完成的核心开发项已基本扫完
- 主线已通过：
  - `npm run typecheck --workspaces --if-present`
  - `npm run test --workspace @growthpilot/api`
  - `npm run build --workspace @growthpilot/web`
- 仍未完成的关键项，已收敛为外部依赖：
  - 正式 DB
  - 正式 S3
  - 正式 Redis/BullMQ
  - preprod
  - rollback
  - signoff

一句话：**屋里活干得差不多了，剩下是楼道总闸和物业签字。**

---

## 1. Source of Truth

发生冲突时，按以下优先级执行：
1. `05_数据库DDL.sql`
2. `07_OpenAPI.yaml`
3. `06_API文档.md`
4. `08_页面原型清单.md`
5. `09_前端开发规格.md`
6. `10_后端开发规格.md`
7. `17_联调与验收清单.md`
8. `26_预发上线与回滚清单.md`
9. `29_核心多Agent协同总Todo.md`
10. 本文件

---

## 2. 角色分工（沿用 15 文档边界）

| Agent | 职责 | 不做 |
|---|---|---|
| A1 | 发布边界、优先级、Go/No-Go 拍板 | 不直接改实现代码 |
| A2 | DDL / staging / migration / 数据一致性 | 不擅自改页面流程 |
| A3 | API / DTO / 错误体 / 权限契约守门 | 不自创字段/权限码 |
| A4 | auth/files/jobs/infra glue/云依赖接线 | 不越权改业务规则 |
| A5 | 主数据后端 | 不负责外部云资源申请 |
| A6 | homework/growth/attendance 后端 | 不越权改财务口径 |
| A7 | billing/communication/analytics 后端 | 不越权改 DDL 真源 |
| A8 | 前端核心壳与主数据页 | 不自行发明接口字段 |
| A9 | 前端业务页联调 | 不伪造不存在的后端能力 |
| A10 | QA / preprod / rollback / signoff 材料 | 不擅自拍板放行 |

---

## 3. 执行波次

## Wave-C1｜云基础设施准备

### 目标
把 DB / Redis / S3 / provider / env 这些“能不能跑”的底座先搭起来。

### A4 Todo
- [ ] 确认部署方式（PM2 / Docker Compose / 容器平台）
- [ ] 输出生产环境变量清单
- [ ] 准备 PostgreSQL 连接信息
- [ ] 准备 Redis 连接信息
- [ ] 准备 S3 兼容对象存储连接信息
- [ ] 准备 AI provider 配置
- [ ] 配置日志 / traceId / 错误上报
- [ ] 输出服务健康检查命令

### A1 配合
- [ ] 确认本次云上目标环境（测试云机 / preprod / 正式云机）
- [ ] 确认谁负责申请和保管凭据

### DoD
- [ ] 所有外部依赖有明确 endpoint/账号/密钥归属
- [ ] API / Web / DB / Redis / S3 / Provider 可在目标环境被访问

---

## Wave-C2｜正式数据库落地

### 目标
从 JSON/file-backed 过渡层升级到正式数据库。

### A2 Todo
- [ ] 根据 `05_数据库DDL.sql` 输出落地清单
- [ ] 定义 staging schema
- [ ] 定义 final load / upsert 规则
- [ ] 定义 migration 回滚边界

### A4 Todo
- [ ] 接 DB client / repository 基础设施
- [ ] 落 migration runner
- [ ] 接 sessions / jobs / file assets 数据表

### A5 Todo
- [ ] students / families / teachers / enrollments 改走 DB
- [ ] Student360 查询改走 DB

### A6 Todo
- [ ] homework / growth / attendance 改走 DB

### A7 Todo
- [ ] billing / communication / analytics 改走 DB

### A10 验证
- [ ] DB 模式下 API tests 通过
- [ ] 关键唯一约束 / 外键 / 索引验证通过

### DoD
- [ ] 不再依赖 JSON 文件作为主存储
- [ ] migration 可执行
- [ ] 关键表与 DDL 一致

---

## Wave-C3｜文件链路真化

### 目标
把上传链路切到真实对象存储。

### A4 Todo
- [ ] 接 S3 SDK
- [ ] 实现 presign 上传
- [ ] 实现 multipart initiate/upload/complete/abort
- [ ] 校验 bucket / CORS / 生命周期策略

### A6 Todo
- [ ] homework submission 真 fileId 链路联调

### A8 / A9 Todo
- [ ] 前端上传组件切真上传
- [ ] 上传失败 / 重试 / 取消态收口
- [ ] 上传后 fileId 真回写

### DoD
- [ ] `upload -> fileId -> submission` 真闭环
- [ ] 附件可在云上持久化并追踪

---

## Wave-C4｜真队列与 Worker

### 目标
把 repo-internal jobs 骨架推进成正式异步执行体系。

### A4 Todo
- [ ] 接 Redis / BullMQ
- [ ] 抽 worker 进程
- [ ] 接 retry/backoff
- [ ] 接 dead-letter / failure visibility

### A6 Todo
- [ ] homework analysis 接 worker
- [ ] growth report draft 接 worker
- [ ] outbox 后续消费策略明确

### A10 Todo
- [ ] worker 宕机 / 重试 / 堆积回归验证

### DoD
- [ ] jobs 真正异步执行
- [ ] queued/running/success/failed 可观测

---

## Wave-C5｜主业务闭环云上联调

### 目标
把 P0 主流程在云上跑通。

### A6 Todo
- [ ] homework 真 provider 验证
- [ ] growth material assembler 去 placeholder
- [ ] growth report review/publish 云上验证
- [ ] attendance roster / 异常修正 workflow 方案收口

### A7 Todo
- [ ] billing payments/refunds/adjustments 列表/聚合补齐
- [ ] communication 真消息渠道 adapter
- [ ] analytics 页面真接口全部接通
- [ ] analytics 指标口径二次校对

### A8 / A9 Todo
- [ ] homework / growth / billing / attendance / communication / analytics 页面云上联调
- [ ] loading / empty / error / permissionDenied 复核

### DoD
- [ ] 登录 -> 建档 -> 作业 -> 成长 -> 收费 主链路云上可跑
- [ ] 关键页面无 mock 假象

---

## Wave-C6｜迁移与样本导入

### 目标
把“dry-run”推进成“真实导入”。

### A2 Todo
- [ ] 清洗/去重/映射规则定版
- [ ] reject / retry / rerun 策略定版

### A4 Todo
- [ ] `.xlsx` 原生解析或正式限定只接受 CSV/JSON
- [ ] 接 staging import
- [ ] 接 final load / upsert

### A10 Todo
- [ ] 首批真实样本导入
- [ ] validation report
- [ ] reject report
- [ ] 修复建议与重跑方案

### DoD
- [ ] staging -> final load 跑通
- [ ] 样本导入结果可信
- [ ] 问题数据可定位可重跑

---

## Wave-C7｜预发、回滚、签收

### 目标
证明系统“能上线，也能回来”。

### A10 Todo
- [ ] 按 `26_预发上线与回滚清单.md` 完整执行
- [ ] 记录发布 commit / tag / 负责人
- [ ] preprod 环境检查
- [ ] P0 主流程回归
- [ ] P1 建议流程回归
- [ ] 数据库备份
- [ ] 对象存储快照
- [ ] 配置备份
- [ ] 数据库恢复演练
- [ ] 对象存储恢复验证
- [ ] 应用回滚演练
- [ ] 发布后观察窗口记录
- [ ] QA 结论输出

### A1 Todo
- [ ] 风险项确认
- [ ] 未关闭缺陷确认
- [ ] Go / No-Go 拍板

### DoD
- [ ] 有预发验证记录
- [ ] 有备份/恢复/回滚记录
- [ ] 有 QA / PM / Owner 签收材料

---

## 4. 最小上线关键路径

### 必须完成的 12 项
- [ ] PostgreSQL 接通
- [ ] Redis 接通
- [ ] S3 接通
- [ ] DB repository 切换完成
- [ ] jobs worker 化
- [ ] file/upload 真闭环
- [ ] homework 主链路云上验证
- [ ] growth 主链路云上验证
- [ ] billing 主链路云上验证
- [ ] 样本迁移跑通
- [ ] 预发回归完成
- [ ] 回滚演练 + Go/No-Go 完成

---

## 5. 外部依赖准备清单

### 由人或运维提供
- [ ] 云服务器 / 容器环境
- [ ] PostgreSQL 实例
- [ ] Redis 实例
- [ ] S3 / 兼容对象存储
- [ ] AI provider key
- [ ] 域名 / TLS / 反向代理（如需要）
- [ ] 预发账号与测试样本
- [ ] 发布窗口与签收人

---

## 6. 验收输出物

上线前至少产出：
- [ ] 环境变量清单
- [ ] DB migration 执行记录
- [ ] 样本导入报告
- [ ] QA 回归报告
- [ ] 缺陷清单
- [ ] 备份/恢复/回滚记录
- [ ] Go / No-Go signoff

---

## 7. 当前状态标签

### 已完成（仓库内）
- [x] 仓库内核心开发与主线集成
- [x] typecheck / api test / web build 通过
- [x] 核心总控盘与上线缺口已文档化

### 未完成（外部依赖）
- [ ] 云环境准备
- [ ] 正式基础设施接入
- [ ] preprod / rollback / signoff

---

## 8. 最后一锤

**到这里，问题已经不是“代码还差多少”，而是“外部条件齐不齐、联调演练做没做、谁来拍板放行”。**

没接上 DB / S3 / Redis，就别叫云上可运行。
没做 preprod / rollback / signoff，就别叫可上线。
