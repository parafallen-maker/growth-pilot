# 36 接口决策与代码对齐说明

> 目的：把“文档里有、代码暂未实装”与“代码里有、旧文档缺失”的接口决策一次讲清，避免后续 Agent 在契约层来回打架。

## Source of Truth

1. **执行总 Todo**：`35_merged_agent_execution_todos.md`
2. **机器可读契约**：`07_OpenAPI.yaml`
3. **本页**：只记录当前明确拍板的接口决策与兼容策略
4. **代码实现优先级**：Wave 0 先对齐文档，Wave 1 再补齐缺失实现

## SPEC-02：文档有但代码暂缺的 5 个接口

| 接口 | 决策 | 说明 |
|---|---|---|
| `POST /students/import` | **保留，Wave 1 实现** | 文档已保留为正式导入入口，当前返回 `jobId` 的异步导入模式不变。 |
| `POST /families/{familyId}/tasks` | **保留，Wave 1 实现** | 家校协同闭环需要该接口，继续作为家庭任务创建入口。 |
| `POST /teachers/{teacherId}/development-records` | **保留，Wave 1 实现** | 教师发展记录属于教师档案核心能力，不能砍。 |
| `POST /users` | **保留，Wave 1 实现** | 由 admin 创建用户，OpenAPI 继续保留；当前后端未实装。 |
| `GET /growth/rubrics/{rubricId}` vs `{templateId}` | **统一为 `templateId`** | 代码已使用 `templateId`，OpenAPI 与周边文档同步收口到 `templateId`。 |

## SPEC-03：代码已存在但旧文档缺失的接口补录原则

本轮已将以下实现中的接口补入 `07_OpenAPI.yaml`：

- files：`GET /files/{fileId}`、`POST /files/upload`、`POST /files/upload/batch`、`POST /files/upload/multipart`
- homework：`POST /homework/error-taxonomies`、`PATCH /homework/error-taxonomies/{id}`、`DELETE /homework/error-taxonomies/{id}`、`GET /homework/outbox-events`、`GET/PUT /homework/submissions/{id}/review-draft`
- growth：`GET /growth/reports/{id}`、`GET /growth/rubrics/{templateId}`、`POST /growth/reports/{id}/review`、`POST /growth/reports/{id}/publish`
- attendance：`GET /attendance/devices/bindings`、`POST /attendance/devices`、`PATCH /attendance/devices/bindings/{id}`
- billing：`GET /billing/contracts/{id}`、`GET /billing/payments/{id}`、`GET /billing/refunds/{id}`、`POST /billing/renewals`、`PATCH /billing/renewals/{id}/status`、`PATCH /billing/renewals/{id}/follow-up`
- communication：`GET /communication/records/{id}`、`GET/POST /communication/templates`、`PATCH /communication/templates/{id}`、`GET/POST /communication/message-tasks`、`PATCH /communication/message-tasks/{id}/status`
- jobs：`GET /jobs`

## Communication 模块最终口径

### Canonical
- `GET /communication/message-tasks`
- `POST /communication/message-tasks`
- `PATCH /communication/message-tasks/{taskId}/status`

### Compatibility alias
- `GET /communication/messages`
- `POST /communication/messages`

说明：代码当前把 `/communication/messages` 直接映射到 `message-tasks` 服务，为兼容旧前端与旧文档，本轮保留该别名，但在 OpenAPI 中明确标记为 **deprecated compatibility alias**。

## 统一命名规则

- 路径参数统一优先采用资源语义稳定命名：`studentId` / `familyId` / `teacherId` / `templateId` / `reportId` / `taskId`
- 列表接口统一支持 `pageNo`、`pageSize`；如代码已支持排序，则文档统一挂 `sortBy`、`sortOrder`
- 文档存在、代码暂缺 ≠ 删除；除非业务范围冻结明确移除，否则默认进入 Wave 1 实现清单
