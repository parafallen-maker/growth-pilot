# 37 Wave 2 QA 验收报告

> 结论时间：`2026-03-25`
>
> 结论：`fail / no-go`
>
> 原因：API 与迁移 QA 明显前进，但 `QA-09` live DB apply 未在真实库执行，`QA-12` / `QA-13` 页面 runtime smoke 在当前环境未完成闭环，不能把预发放行写成 green。

---

## 1. 本轮覆盖范围

本轮仅覆盖 Wave 2 QA 边界内事项：
- `QA-06` API contract smoke
- `QA-09` staging import script 对接真实 DB 路径
- `QA-10` sample import
- `QA-11` 映射 / 幂等 / reject report
- `QA-12` SSR smoke tooling
- `QA-13` teacher vs billing 权限校验
- `QA-15` 预发上线清单
- `QA-16` 回滚方案
- `QA-17` 验收报告

---

## 2. 已执行检查

### 2.1 API / 后端
- `npm run test --workspace @growthpilot/api`
  - 结果：PASS
  - 统计：`31` tests passed, `0` failed
- 新增 / 更新 QA 测试：
  - `apps/api/test/qa/openapi-contract.test.ts`
  - `apps/api/test/qa/billing-permission-boundary.test.ts`
  - `apps/api/test/qa/e2e-main-flow.fixture.ts`

### 2.2 构建
- `npm run build --workspace @growthpilot/api`
  - 结果：PASS
- `npm run build --workspace @growthpilot/web`
  - 结果：PASS
  - Next build 已列出 `31` 个业务页面路由

### 2.3 迁移
- `node --test scripts/migration/run-staging-import.test.mjs`
  - 结果：PASS
  - 统计：`4` tests passed, `0` failed
- sample dry-run 已执行：
  - `fixtures/staging-import-sample.csv`
  - `batchId = BATCH-QA-DOC`
  - `3/3` rows ready-to-load
- mock reject artifact 已执行：
  - `batchId = BATCH-QA-MOCK-DOC`
  - `7` reject rows generated

### 2.4 页面 / 权限
- `node scripts/qa/run-ssr-smoke.mjs --report-file ...`
  - 构建阶段：PASS
  - runtime 阶段：FAIL（sandbox `EPERM`，无法连接 `127.0.0.1:3101`）
- `node scripts/qa/run-billing-permission-smoke.mjs`
  - 未独立执行
  - 原因：依赖相同 localhost runtime 能力，当前环境同样受 `EPERM` 限制
- API 级权限边界：
  - teacher 无 `billing:contracts:view`
  - teacher 无 `billing:payments:manage`
  - admin 具备上述权限
  - 结果：PASS

---

## 3. Wave 2 项状态

| 项目 | 结果 | 说明 |
|---|---|---|
| `QA-06` | `partial-pass` | contract smoke 已覆盖 auth/settings/users/teachers/students/families/files/homework/growth/attendance/billing/communication/analytics/jobs 的代表性 happy-path 与 error semantics，但未做到“所有接口逐条 HTTP 级别” |
| `QA-09` | `partial-pass` | `run-staging-import.mjs` 已支持 `--db-apply` + PostgreSQL staging upsert；当前环境未执行 live DB apply |
| `QA-10` | `pass` | sample CSV 已执行并生成 artifact |
| `QA-11` | `partial-pass` | 字段映射、幂等 key、reject CSV 生成已验证；真实库导入后查库尚未完成 |
| `QA-12` | `blocked` | SSR validator 已升级为 route-by-route 工具，但 runtime 访问 localhost 被 sandbox 拦截 |
| `QA-13` | `partial-pass` | API 权限边界 PASS；页面级 billing forbidden smoke 未在可开端口环境完成 |
| `QA-15` | `pass` | 预发上线清单已更新 |
| `QA-16` | `pass` | 回滚方案已更新 |
| `QA-17` | `pass` | 本报告已输出 |

---

## 4. 产物

- sample import：
  - `docs/growthpilot/artifacts/2026-03-25/BATCH-QA-DOC.summary.json`
  - `docs/growthpilot/artifacts/2026-03-25/BATCH-QA-DOC.reject-report.csv`
  - `docs/growthpilot/artifacts/2026-03-25/BATCH-QA-DOC.db-plan.sql`
- mock reject：
  - `docs/growthpilot/artifacts/2026-03-25/mock-batch/BATCH-QA-MOCK-DOC.summary.json`
  - `docs/growthpilot/artifacts/2026-03-25/mock-batch/BATCH-QA-MOCK-DOC.reject-report.csv`
- checklist / rollback：
  - `docs/growthpilot/26_预发上线与回滚清单.md`
- migration execution guide：
  - `docs/growthpilot/25_迁移执行与校验清单.md`

---

## 5. 已知问题

### P0
- 当前 sandbox 无法完成 SSR runtime smoke，错误为 `connect EPERM 127.0.0.1:3101`
- live DB staging apply 未在真实 PostgreSQL 上执行一次完整回放

### P1
- OpenAPI smoke 仍是 representative coverage，不是 every-endpoint exhaustive matrix
- teacher billing 页面级 forbidden 验证脚本已准备，但尚未在可开本地端口环境跑通

---

## 6. 推荐动作

预发前必须补齐：
1. 在可访问 localhost 端口的环境执行：
   - `node scripts/qa/run-ssr-smoke.mjs --report-file ...`
   - `node scripts/qa/run-billing-permission-smoke.mjs --report-file ...`
2. 在真实 PostgreSQL 预发库执行一次：
   - `node scripts/migration/run-staging-import.mjs --db-apply ...`
3. 对 staging 表做 post-check：
   - row count
   - upsert 回放
   - reject 查询

---

## 7. 一句话结论

**这轮 QA 不是没产出，而是已经把 API smoke、迁移 staging 入口、artifact、预发清单、回滚方案都补齐了；但因为 live DB apply 和页面 runtime smoke 还没在真实环境完成，所以当前建议是 `不发布`。**
