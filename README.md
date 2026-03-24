# growth-pilot monorepo

Wave 0 / T-P0-2 基础工程骨架。

## Workspace layout

- `apps/web`: Next.js 15 + React 19 + TypeScript 骨架
- `apps/api`: NestJS 11 + TypeScript 骨架
- `packages/ui`: 共享 UI 占位包
- `packages/schema`: 共享 schema / DTO 占位包
- `packages/config`: 共享配置常量包
- `.github/workflows/ci.yml`: 最小 CI

## Scripts

- `npm run dev:web`
- `npm run dev:api`
- `npm run build`
- `npm run lint`
- `npm run format`
- `npm run typecheck`
- `npm run test`
- `npm run ci:check`

## Notes

1. 当前是最小可运行脚手架，优先保证目录、脚本、CI、工程边界稳定。
2. 业务模块（auth/users/settings/files/jobs 等）未在本阶段展开。
3. 若本机/CI 尚未执行 `npm install`，需要先在仓库根目录运行一次依赖安装。
4. 为了让 Wave 1/2 Agent 能直接接棒，web 与 api 已分别预留 `src/app` 和 `src/modules` 方向。

## Quick start

```bash
npm install
npm run lint
npm run typecheck
npm run test
```
