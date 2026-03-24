# 21 API 协议基线与类型生成规范

> 目的：建立 Wave 0 之后的唯一接口尺子，避免前后端各说各话。

---

## 1. 协议真源

本项目 API 协议的唯一真源是：

1. `docs/growthpilot/07_OpenAPI.yaml`
2. `docs/growthpilot/06_API文档.md`

执行顺序：
- **先改 OpenAPI**
- 再生成类型 / DTO
- 再改后端实现
- 最后改前端消费层

禁止反过来：
- 先在 controller 里偷偷改字段
- 先在前端 service 层拍脑袋补字段
- 先用 VO 名字倒推 API 字段

---

## 2. 分层约定

统一采用：

```text
Entity -> DTO -> OpenAPI Contract -> VO
```

### Entity
- 对应数据库模型或领域实体
- 不直接透出给 HTTP

### DTO
- 后端输入边界与校验载体
- Create / Update / Query 各自独立

### OpenAPI Contract
- 作为前后端共享字段真源
- 由它生成 TS types / SDK / 校验基线

### VO
- 前端展示层对象
- 负责金额、日期、状态 label 等展示转换
- 不反向污染协议层字段命名

一句话：**协议归协议，展示归展示，别把数据库、接口、页面揉成一锅粥。**

---

## 3. 统一响应包规范

所有标准成功响应统一为：

```json
{
  "code": "OK",
  "message": "success",
  "data": {},
  "traceId": "string"
}
```

### 说明
- `code`：业务结果码，不等于 HTTP 状态码
- `message`：给人看的短语义
- `data`：实际业务载荷
- `traceId`：排错与日志追踪标识

---

## 4. 统一分页规范

列表响应统一为：

```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "list": [],
    "page": {
      "pageNo": 1,
      "pageSize": 20,
      "total": 100
    }
  },
  "traceId": "string"
}
```

### 统一查询参数
列表查询默认支持：
- `keyword`
- `campusId`
- `termId`
- `status`
- `pageNo`
- `pageSize`
- `sortBy`
- `sortOrder`

### 约束
- `sortOrder` 只允许 `asc / desc`
- 前端 query key 与 service 层入参按这一组统一
- 新列表接口若缺分页，要明确声明是 lookup 接口

---

## 5. 错误模型规范

标准错误体建议统一为：

```json
{
  "code": "VALIDATION_ERROR",
  "message": "request validation failed",
  "details": [
    {
      "field": "studentName",
      "reason": "required"
    }
  ],
  "traceId": "string"
}
```

### 推荐错误语义
- `401`：未登录 / token 无效
- `403`：已登录但无权限
- `409`：状态冲突 / 幂等冲突 / 唯一冲突
- `422`：表单或业务校验失败
- `500`：服务内部错误
- `503`：依赖服务不可用（如 AI provider 暂时不可用）

### 前端处理要求
- 401：跳回登录
- 403：展示 permission denied
- 409：明确提示冲突，不静默失败
- 422：映射到表单级错误
- 500：展示 traceId，便于排查

---

## 6. 类型生成策略

### 6.1 生成原则
- 前后端共享类型从 OpenAPI 生成
- 不手写重复接口类型
- 业务常量与展示映射可单独维护，但不改协议字段名

### 6.2 建议目录
- `packages/schema`：放 OpenAPI 生成结果与共享 contract types
- `apps/api`：消费 DTO / schema，做运行时校验
- `apps/web`：消费 query / response types，做 VO 映射

### 6.3 生成时机
- 每次 OpenAPI 变更后重新生成
- CI 可加 contract check，防止手写漂移

---

## 7. DTO / VO 边界

### 后端 DTO
- Create DTO：只含创建所需字段
- Update DTO：全部可选，但不暴露不可修改字段
- Query DTO：统一继承分页筛选基类

### 前端 VO
- 负责：
  - 金额 cents -> 元
  - 时间戳 -> 可展示日期
  - 状态枚举 -> label / badge
- 不负责：
  - 私自新增协议字段
  - 给接口字段改名

---

## 8. 本轮 OpenAPI 修正摘要

### 8.1 `info.version`
- `v2.0.0-vibe-pack` -> `v1.0.0`

### 8.2 `JobStatus`
- 字段 `id` -> `jobId`
- 与异步任务返回、路径参数、前端任务中心使用方式统一

---

## 9. 当前协议层仍需后续收口的点

1. OpenAPI 内联匿名 object 偏多，后续应逐步抽具名 schema
2. 422 错误体尚未系统展开到所有接口
3. `sortBy/sortOrder` 还未系统挂到每个列表接口
4. jobs / AI / report draft 的状态枚举还需要继续收口

---

## 10. 给 A4 / A8 / A9 的接棒要求

## 10.1 给 A4
- 实现统一异常过滤器
- 把 `401/403/409/422/500/503` 收口到标准错误体
- `jobs` 模块对外字段统一使用 `jobId`

## 10.2 给 A8
- 服务层和 query key 参数统一走 `pageNo/pageSize/sortBy/sortOrder`
- 表单默认值通过 DTO -> VO mapper，不直绑 raw response
- 按错误语义分流 401 / 403 / 409 / 422 / 500

## 10.3 给 A9
- 作业 / 成长 / 收费 / 任务中心统一消费 `jobId`
- 金额、日期、状态 label 在 VO 层做转换
- action 接口预留幂等头支持
- 新接口优先抽具名 schema，不继续堆匿名 object

---

## 11. 一句话结论

**协议尺子已经立住：谁再把字段写飞，不是灵感，是越线。**
