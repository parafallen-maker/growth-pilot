# @growthpilot/api

NestJS 11 minimal skeleton for Wave 1 foundation.

## Implemented in this round

```text
src/modules/
  auth/      # login / refresh / current user(/auth/me) / logout
  users/     # mock users, roles, permissions, role binding skeleton
  settings/  # campuses / terms / dictionaries query APIs
  jobs/      # task status query API
```

## Mock boundary

当前实现为了让 Wave 1 尽快联调，使用的是 **in-memory mock repository**：

- 用户、角色、权限：`src/modules/users/repository/users.repository.ts`
- 校区、学期、字典：`src/modules/settings/repository/settings.repository.ts`
- 任务中心：`src/modules/jobs/repository/jobs.repository.ts`
- auth token：`src/modules/auth/service/auth.service.ts` 内存会话

这些都只是最小闭环，后续要由数据库/Redis/JWT 真正接管。

## API base

本地启动后默认前缀：`/api/v1`

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `GET /api/v1/users`
- `POST /api/v1/users/:userId/roles`
- `GET /api/v1/settings/campuses`
- `GET /api/v1/settings/terms`
- `GET /api/v1/settings/dictionaries`
- `GET /api/v1/jobs/:jobId`

## Next steps

1. 用 Prisma/Drizzle 替换 mock repository
2. 用 JWT + refresh token 持久化替换当前内存 token
3. 补统一异常过滤器、401/403/409/422/500 contract
4. 让 OpenAPI 新增 `current user/logout` 具名 schema，避免匿名 object 越堆越高
