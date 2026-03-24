# 24 homework / growth API 守门报告

> 对应任务：`T-H1-API`
> 目标：把 homework 与 growth 已落地实现、页面骨架、OpenAPI 契约重新拉齐。

---

## 1. 守门结论

这轮最大的漏风点是：**rubrics 已经做了，但协议没写。**

本轮收口后：
- homework 的 `list / detail / analyze / review` 契约已补齐
- growth 的 `rubrics / observations / goals / reports` 路径已收口
- 异步动作统一回 `jobId / status`
- 列表统一支持 `sortBy / sortOrder` 的方向已明确并补入关键接口

---

## 2. homework 收口

### 已确认/补齐
- `GET /homework/submissions`
- `GET /homework/submissions/{submissionId}`
- `POST /homework/submissions`
- `POST /homework/submissions/{submissionId}/analyze`
- `POST /homework/submissions/{submissionId}/review`
- `GET /homework/error-taxonomies`

### 关键规则
- analyze / report generate 一律返回：
  - `jobId`
  - `status`
- 列表支持：
  - `pageNo / pageSize / sortBy / sortOrder`

### 仍待后续项
- review draft 草稿接口
- 批量 analyze

---

## 3. growth 收口

### 本轮新增进契约的路径
- `GET /growth/rubrics`
- `POST /growth/rubrics`
- `GET /growth/rubrics/{rubricId}`

### 同步补齐的 schema
- `RubricTemplate`
- `RubricDimension`
- `CreateRubricRequest`

### 已核对路径
- `GET /growth/observations`
- `POST /growth/observations`
- `GET /growth/goals`
- `POST /growth/goals`
- `POST /growth/goals/{goalId}/checkins`
- `GET /growth/reports`
- `POST /growth/reports/generate`

### 仍待后续项
- reports review / publish 动作
- reportPublished 筛选与口径

---

## 4. 统一性要求

- `jobId / status / page` 基线统一
- 错误体仍遵守 `21_API协议基线与类型生成规范.md`
- 任何 homework / growth 字段变动：
  1. 先改 OpenAPI
  2. 再改后端
  3. 再改前端 mapper

---

## 5. 后续动作

### 交给 A6
- 按新 OpenAPI 对齐 growth rubrics / homework detail 的真实返回结构

### 交给 A9
- growth/hw 列表统一用 `sortBy / sortOrder`
- rubrics 页面直接接新契约

### 交给 A10
- 把 `jobId / status` 与 rubrics 新路径纳入联调验收

---

## 6. 一句话结论

**门已经补上了：后面谁再让 homework / growth 契约跑飞，就不是疏忽，是越线。**
