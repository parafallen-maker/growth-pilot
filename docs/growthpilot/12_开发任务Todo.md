# 12 开发任务 Todo

> 建议直接导入 Jira / Linear / 飞书项目。

| WBS | Phase | Module | Task | Owner | Priority | 依赖 | DoD |
|---|---|---|---|---|---|---|---|
| WBS-001 | 0 | project | 冻结范围、模块、命名规范 | Product | P0 | - | 范围文档确认 |
| WBS-002 | 0 | project | 建立 monorepo、CI、lint、format | Fullstack | P0 | WBS-001 | 仓库可运行 |
| WBS-003 | 0 | db | 建立 PostgreSQL schema 与迁移机制 | Backend | P0 | WBS-001 | DDL 可执行 |
| WBS-004 | 0 | api | 导入 OpenAPI 并生成类型 | Backend/Frontend | P0 | WBS-001 | 类型可用 |
| WBS-005 | 1 | auth | 登录、refresh token、current user | Backend | P0 | WBS-002 | 登录通 |
| WBS-006 | 1 | auth | 权限树、菜单裁剪、按钮权限 | Frontend | P0 | WBS-005 | 权限生效 |
| WBS-007 | 1 | settings | 校区、学期、字典接口 | Backend | P0 | WBS-003 | CRUD 可用 |
| WBS-008 | 1 | settings | 用户与角色页面 | Frontend | P1 | WBS-007 | 页面可用 |
| WBS-009 | 2 | teachers | 教师主表 CRUD | Backend | P0 | WBS-003 | 接口可测 |
| WBS-010 | 2 | teachers | 教师列表/详情页 | Frontend | P0 | WBS-009 | 页面联通 |
| WBS-011 | 2 | students | 学生主档 CRUD | Backend | P0 | WBS-003 | 接口可测 |
| WBS-012 | 2 | students | 在读档 CRUD | Backend | P0 | WBS-011 | 接口可测 |
| WBS-013 | 2 | students | 学生列表页 | Frontend | P0 | WBS-011 | 列表联通 |
| WBS-014 | 2 | students | 学生 360 聚合接口 | Backend | P0 | WBS-011,WBS-012 | 聚合可用 |
| WBS-015 | 2 | students | 学生 360 页面 | Frontend | P0 | WBS-014 | 页面联通 |
| WBS-016 | 2 | families | 家庭/监护人 CRUD | Backend | P0 | WBS-003 | 接口可测 |
| WBS-017 | 2 | families | 家庭列表/详情页 | Frontend | P0 | WBS-016 | 页面联通 |
| WBS-018 | 2 | files | 文件上传模块 | Backend | P0 | WBS-003 | fileId 可回传 |
| WBS-019 | 3 | homework | 作业提交接口 | Backend | P0 | WBS-018,WBS-011 | 提交成功 |
| WBS-020 | 3 | homework | AI 任务表 + 队列 | Backend | P0 | WBS-019 | job 可跑 |
| WBS-021 | 3 | homework | AI Adapter 接入 | Backend/AI | P0 | WBS-020 | 返回结构化结果 |
| WBS-022 | 3 | homework | 作业列表页 | Frontend | P0 | WBS-019 | 列表联通 |
| WBS-023 | 3 | homework | 复核工作台 | Frontend | P0 | WBS-021 | 可保存复核 |
| WBS-024 | 3 | homework | 复核正式提交事务 | Backend | P0 | WBS-021 | review 成功 |
| WBS-025 | 3 | homework | 错因词典页 | Frontend | P1 | WBS-024 | 可维护 |
| WBS-026 | 4 | growth | Rubric 模板接口 | Backend | P0 | WBS-003 | CRUD 可用 |
| WBS-027 | 4 | growth | 成长观察接口 | Backend | P0 | WBS-026,WBS-011 | 提交成功 |
| WBS-028 | 4 | growth | 成长目标/跟进接口 | Backend | P0 | WBS-027 | 流程可用 |
| WBS-029 | 4 | growth | 成长观察页 | Frontend | P0 | WBS-027 | 页面联通 |
| WBS-030 | 4 | growth | 成长目标页 | Frontend | P0 | WBS-028 | 页面联通 |
| WBS-031 | 4 | growth | 报告草稿生成 job | Backend/AI | P1 | WBS-028 | 草稿可生成 |
| WBS-032 | 4 | growth | 报告页与发布 | Frontend/Backend | P1 | WBS-031 | 发布可用 |
| WBS-033 | 5 | attendance | 设备/绑定接口 | Backend | P1 | WBS-003 | 可绑定 |
| WBS-034 | 5 | attendance | 签到事件接口 | Backend | P1 | WBS-033 | 可写入 |
| WBS-035 | 5 | attendance | 时长聚合任务 | Backend | P1 | WBS-034 | 日统计可查 |
| WBS-036 | 5 | attendance | 出勤看板页 | Frontend | P1 | WBS-034 | 页面联通 |
| WBS-037 | 6 | billing | 产品/合同接口 | Backend | P0 | WBS-003 | CRUD 可用 |
| WBS-038 | 6 | billing | 账单/支付/退款接口 | Backend | P0 | WBS-037 | 财务链路通 |
| WBS-039 | 6 | billing | 产品/合同页面 | Frontend | P0 | WBS-037 | 页面联通 |
| WBS-040 | 6 | billing | 账单支付页面 | Frontend | P0 | WBS-038 | 页面联通 |
| WBS-041 | 6 | billing | 续费任务 | Backend/Frontend | P1 | WBS-038 | 跟进可用 |
| WBS-042 | 7 | communication | 沟通记录接口 | Backend | P1 | WBS-016 | CRUD 可用 |
| WBS-043 | 7 | communication | 模板/消息接口 | Backend | P1 | WBS-042 | 发送可用 |
| WBS-044 | 7 | communication | 沟通记录/消息页 | Frontend | P1 | WBS-043 | 页面联通 |
| WBS-045 | 8 | analytics | overview 聚合查询 | Backend | P1 | homework,growth,billing,attendance | 指标正确 |
| WBS-046 | 8 | analytics | teaching/billing 看板 | Backend | P1 | WBS-045 | 指标正确 |
| WBS-047 | 8 | analytics | analytics 页面 | Frontend | P1 | WBS-046 | 图表联通 |
| WBS-048 | 8 | migration | 历史表导入脚本 | Data | P0 | WBS-003 | 首批数据入库 |
| WBS-049 | 8 | qa | 主流程 E2E | QA | P0 | 各模块完成 | E2E pass |
| WBS-050 | 8 | release | 预发上线、备份、回滚方案 | DevOps | P0 | WBS-049 | 可上线 |

## 推荐 Sprint 切分

### Sprint A
- WBS-001 ~ WBS-018

### Sprint B
- WBS-019 ~ WBS-025

### Sprint C
- WBS-026 ~ WBS-036

### Sprint D
- WBS-037 ~ WBS-050

## P0 发布阻塞项

- 登录与权限
- 学生主档 + 在读档
- 家庭档案
- 作业上传 + AI + 复核
- 观察记录 + 目标
- 合同 + 账单 + 支付
- 历史数据导入
- E2E 主流程通过
