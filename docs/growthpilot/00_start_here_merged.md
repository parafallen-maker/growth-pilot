# 00 Start Here（Merged）

> 这是当前仓库的**合并入口文档**。Wave 0 以后，先看这份，再看具体模块文档。

## 1. 当前文档优先级

1. `35_merged_agent_execution_todos.md` — 执行层唯一准绳
2. `00_start_here_merged.md` — 当前入口、阅读顺序、Source of Truth 导航
3. `36_interface_decisions.md` — 接口冲突与兼容策略
4. `07_OpenAPI.yaml` — 机器可读 API 契约
5. `05_数据库DDL.sql` / `35d_seed_data.sql` / `35e_data_dictionary.md` — 数据结构、种子、字段语义
6. `35a~35g` 合并落库文档 — 来自 `hongji_vibe_docs` 的最新范围、PRD、开发规格、页面、迁移资料
7. 其余历史文档 — 仅作背景参考，不得覆盖以上结论

## 2. Source of Truth 规则

- **执行排期与是否完成**：以 `35_merged_agent_execution_todos.md` 为准
- **接口定义**：以 `07_OpenAPI.yaml` 为准
- **接口冲突决策**：以 `36_interface_decisions.md` 为准
- **数据库结构**：以 `05_数据库DDL.sql` 为准
- **字段语义**：以 `35e_data_dictionary.md` 为准
- **产品范围与实现原则**：以 `35a_scope_and_principles.md`、`35b_prd.md`、`35c_development_spec.md` 为准

一句话：**谁离执行最近，谁说了算；谁更旧，谁闭嘴。**

## 3. 推荐阅读顺序

### 如果你要推进实现
1. `00_start_here_merged.md`
2. `35_merged_agent_execution_todos.md`
3. `36_interface_decisions.md`
4. `35a_scope_and_principles.md`
5. `35b_prd.md`
6. `35c_development_spec.md`
7. `05_数据库DDL.sql`
8. `35d_seed_data.sql`
9. `35e_data_dictionary.md`
10. `07_OpenAPI.yaml`
11. `35f_page_prototypes.md`
12. `35g_excel_migration.md`

### 如果你要先做接口/联调
1. `00_start_here_merged.md`
2. `36_interface_decisions.md`
3. `07_OpenAPI.yaml`
4. `24_homework_growth_API守门报告.md`
5. `21_API协议基线与类型生成规范.md`

### 如果你要先做迁移
1. `00_start_here_merged.md`
2. `35g_excel_migration.md`
3. `25_迁移执行与校验清单.md`
4. `27_首批样本迁移校验报告.md`
5. `05_数据库DDL.sql`
6. `35e_data_dictionary.md`

## 4. 本轮合并落库文档

- `35a_scope_and_principles.md`
- `35b_prd.md`
- `35c_development_spec.md`
- `35d_seed_data.sql`
- `35e_data_dictionary.md`
- `35f_page_prototypes.md`
- `35g_excel_migration.md`

## 5. 当前状态

- 仓库定位：**Persisted JSON Beta**
- 后端：模块与大部分路由已在代码中存在，当前主要使用 JSON/文件持久化
- 前端：31 页骨架已铺开，正逐步从 mock 接到真实 API
- 文档：本轮已把新增设计包、接口决策与 OpenAPI 对齐到同一基线
