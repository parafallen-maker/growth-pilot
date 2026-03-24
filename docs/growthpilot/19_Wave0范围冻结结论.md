# 19 Wave 0 范围冻结结论

> 用途：给 Wave 0 和 Wave 1 作为统一开工边界，避免边做边改模块定义、优先级和发布口径。

---

## 1. 结论先行

Wave 0 的目标不是“开始写业务”，而是把 **范围、契约、脚手架、数据底座** 一次性钉牢。

因此本轮范围冻结后，项目进入如下执行规则：

1. **MVP 首发只做能上线的最小闭环**
2. **P0 只保留建档、作业、成长、收费、迁移、验收的主链路**
3. **P1 全部后置，不得挤占 P0 资源**
4. **模块命名与边界冻结，不再允许同义异名漂移**
5. **Wave 1 以前，不进入“美化型开发”**

一句话：**先把会赚钱、会沉淀数据、会上线的骨架打通，再谈锦上添花。**

---

## 2. MVP 首发范围

### 2.1 纳入 MVP（必须做）
- 工程与协议底座
  - monorepo
  - CI / lint / typecheck / test 基线
  - DDL baseline
  - OpenAPI baseline
- 组织与权限
  - auth
  - settings
  - users / roles / permissions 基础能力
- 主数据
  - teachers
  - students
  - families
  - files
- 核心业务闭环
  - homework：提交 -> AI -> 教师复核
  - growth：rubric -> observation -> goal
  - billing：product -> contract -> invoice -> payment
- 迁移与发布门槛
  - migration staging
  - E2E 主流程
  - release / backup / rollback

### 2.2 明确不纳入首发（后置）
- attendance 全量闭环
- communication 全量消息中心
- analytics 全量看板
- renewals 自动化
- growth report 发布链路的完整运营化页面
- 错因词典与高级设置类运营页面

---

## 3. P0 / P1 切分

## 3.1 P0（发布阻塞项）

P0 的定义：**缺任意一项，不能上线。**

### P0 模块/能力
- `auth`
  - login
  - refresh token
  - current user
  - 权限裁剪基础能力
- `settings`
  - campuses
  - terms
  - dictionaries
- `teachers`
  - 教师主表 CRUD 基础接口与页面
- `students`
  - 学生主档
  - 在读档
  - 学生列表
  - 学生 360 聚合骨架
- `families`
  - 家庭
  - 监护人
  - 家庭详情基础页
- `files`
  - 上传并回传 fileId
- `homework`
  - submission
  - ai_jobs
  - AI adapter
  - review transaction
  - 作业列表页
  - 复核工作台
- `growth`
  - rubric 模板
  - observation
  - goal / check-in
- `billing`
  - product
  - contract
  - invoice
  - payment
- `migration`
  - staging 脚本
  - 首批数据校验
- `qa / release`
  - 主流程 E2E
  - 备份 / 回滚方案

## 3.2 P1（后置项）
- `attendance`
  - 设备绑定
  - 签到
  - 时长聚合
  - 出勤看板
- `communication`
  - 沟通记录
  - 消息中心
- `analytics`
  - overview / teaching / billing 看板
- `growth`
  - report 发布链路的运营化收口
- `billing`
  - renewals 跟进自动化
- `homework`
  - 错因词典运营化页面

### 3.3 P1 的启动条件
只有当以下都成立，P1 才允许大规模启动：
- P0 DDL / OpenAPI 已冻结
- auth / students / families / homework / billing 主链路已贯通
- 主流程 E2E 已至少有 smoke 版本
- 基础数据迁移路径已验证

---

## 4. 模块边界矩阵

| 模块 | 负责对象 | 进入首发 | 说明 |
|---|---|---:|---|
| auth | 登录、刷新、当前用户、鉴权基础 | 是 | 所有模块前置 |
| settings | 校区、学期、字典、任务中心 | 是 | 首发只做基础配置能力 |
| users | 用户、角色、权限树 | 是 | 与 auth / settings 一起完成 |
| teachers | 教师主档 | 是 | 以主数据为主，不做高级发展记录 |
| students | 学生主档、在读档、360 聚合 | 是 | 360 先做骨架摘要 |
| families | 家庭、监护人、家庭详情 | 是 | 与学生/收费强耦合 |
| files | 文件上传与元数据 | 是 | homework 前置 |
| homework | 提交、AI、复核、错因沉淀 | 是 | 这是 MVP 主航道之一 |
| growth | rubric、观察、目标 | 是 | 首发先不做完整报告运营化 |
| attendance | 设备、签到、时长 | 否 | 后置到 P1 |
| billing | 产品、合同、账单、支付 | 是 | 现金流闭环必须进首发 |
| communication | 沟通记录、消息中心 | 否 | 后置到 P1 |
| analytics | 看板聚合 | 否 | 后置到 P1 |
| jobs | AI 与异步任务支撑 | 是 | 作为基础设施存在 |

---

## 5. 命名规范冻结

下面这些名字冻结，不再做自由发挥：
- 学生：`student`
- 家庭：`family`
- 监护人：`guardian`
- 在读档：`enrollment`
- 作业提交：`homework_submission`
- AI 分析：`homework_ai_analysis`
- 教师复核：`homework_review`
- 成长观察：`growth_observation`
- 成长目标：`growth_goal`
- 成长报告：`growth_report`
- 合同：`contract`
- 账单：`invoice`
- 支付：`payment`
- 退款：`refund`
- 异步任务：`job`

### 禁止项
- 不允许同一对象同时出现 `studentProfile` / `studentRecord` / `studentMaster` 三套叫法
- 不允许页面自己发明接口字段名
- 不允许 DTO 和 OpenAPI 对同一字段叫不同名字

---

## 6. 发布阻塞项（P0 Gate）

以下项目缺任一项，不进入正式上线：

1. 登录与权限未稳定
2. 学生主档 + 在读档未跑通
3. 家庭档案未成型
4. 作业上传 -> AI -> 教师复核链路未打通
5. 成长观察 + 目标未可用
6. 合同 + 账单 + 支付未成闭环
7. DDL baseline / migration 策略未锁定
8. 首批历史数据迁移校验未完成
9. 主流程 E2E 未通过
10. 备份 / 回滚方案未演练

---

## 7. Wave 0 / Wave 1 进入条件

## 7.1 Wave 0 Done 条件
- 范围冻结完成
- DDL 校核完成
- OpenAPI / DTO / 错误规范完成
- monorepo / CI / workspace 骨架完成

## 7.2 Wave 1 启动条件
- `05_数据库DDL.sql` 可作为 baseline 执行
- `07_OpenAPI.yaml` 可作为唯一协议真源
- repo 已具备 apps/web、apps/api、packages 基础结构
- `16_多Agent派工清单.yaml` 中 T-P0-1 / T-P0-2 / T-P0-3 / T-P0-4 已落地完成

### Wave 1 主目标
- auth / settings 基础系统
- teachers / students / families / files 主数据闭环

---

## 8. 对 A2 / A3 / A4 的交接要求

## 8.1 A2 Domain Model
必须接住：
- DDL 主键 / 外键 / 唯一约束 / 索引 / 状态机
- staging 导入策略
- baseline migration 的可执行性
- student / teacher / term / payment 等关键编号策略

## 8.2 A3 API Steward
必须接住：
- OpenAPI 为唯一协议真源
- 分页 / 筛选 / 排序统一结构
- 错误码和错误体统一
- DTO / VO / Entity 分层边界
- 任何字段改动先改 OpenAPI

## 8.3 A4 Foundation
必须接住：
- apps/web + apps/api + packages 的基础骨架
- CI / lint / typecheck / test 最小基线
- 不提前实现业务模块，但为 Wave 1 留好目录和脚本位

---

## 9. 自检结论

- 模块边界已与 `12_开发任务Todo.md` 对齐
- P0 / P1 切分与 `15_多Agent协作任务总文件.md` 一致
- 发布阻塞项可直接被 `17_联调与验收清单.md` 使用
- 可作为 Wave 1 的直接开工边界

---

## 10. 一句话结论

**Wave 0 不是“做了一点文档”，而是把项目从“想做什么”推进到“哪些东西必须先做、谁先做、做到什么程度才算能上线”。**
