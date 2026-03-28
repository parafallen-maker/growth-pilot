# 00 Start Here（Merged）

> 这是当前仓库的**合并入口文档**。Wave 0 以后，先看这份，再看具体模块文档。

## 1. 当前文档优先级

1. `execution_todos.md` — 执行层唯一准绳
2. `README.md` (本目录) — 文档地图与目录索引
3. `00_start_here.md` — 当前入口、阅读顺序、Source of Truth 导航
4. `eng/interface_decisions.md` — 接口冲突与兼容策略
5. `api/openapi.yaml` — 机器可读 API 契约
6. `eng/db/ddl_schema.sql` / `eng/db/seed_data.sql` / `eng/db/data_dictionary.md` — 数据结构、种子、字段语义
7. `core/` 合并落库文档 — 来自 `hongji_vibe_docs` 的最新范围、PRD、开发规格

## 2. Source of Truth 规则

- **执行排期与是否完成**：以 `execution_todos.md` 为准
- **接口定义**：以 `api/openapi.yaml` 为准
- **接口冲突决策**：以 `eng/interface_decisions.md` 为准
- **数据库结构**：以 `eng/db/ddl_schema.sql` 为准
- **字段语义**：以 `eng/db/data_dictionary.md` 为准
- **产品范围与实现原则**：以 `core/scope_and_principles.md`、`core/prd.md`、`eng/development_spec.md` 为准

## 3. 推荐阅读顺序

### 如果你要推进实现
1. `00_start_here.md`
2. `execution_todos.md`
3. `eng/interface_decisions.md`
4. `core/scope_and_principles.md`
5. `core/prd.md`
6. `eng/development_spec.md`
7. `eng/db/ddl_schema.sql`
8. `eng/db/seed_data.sql`
9. `eng/db/data_dictionary.md`
10. `api/openapi.yaml`

### 如果你要先做迁移
1. `00_start_here.md`
2. `ops/migration_spec.md`
3. `eng/db/ddl_schema.sql`
4. `eng/db/data_dictionary.md`

## 4. 当前状态

- 仓库定位：**Persisted JSON Beta**
- 后端：模块与大部分路由已在代码中存在，当前主要使用 JSON/文件持久化
- 前端：31 页骨架已铺开，正逐步从 mock 接到真实 API
- 文档：已完成全量结构化整合，建立了核心、工程、运维三位一体的文档体系
