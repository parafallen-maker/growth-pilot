# 43 Wave 5 生产环境矩阵

> 覆盖范围：`INF-30`、`INF-31`、`INF-32`、`INF-33`、`INF-34`、`INF-35`、`INF-38`
>
> 用途：把 Wave 5 上线所需的主机、域名、端口、环境变量和观测口径固定成一张可核对的矩阵。
>
> 状态声明：本文只代表发布资料已收口，不代表真实云资源已经申请或验证。

---

## 1. 仓库默认拓扑

| 层 | 当前仓库默认 | 首次上线建议 | 验证方式 |
|---|---|---|---|
| 公网入口 | `app.<domain>` 单域名入口 | 保持单域名，`/api` 由 Nginx 反代到 API | `curl -I https://app.<domain>` |
| TLS 终止 | `docker-compose.prod.yml` 目前只暴露 80 端口 | 首次上线优先用主机侧 Nginx 或云 LB 做 TLS 终止 | `openssl s_client -connect app.<domain>:443` |
| 应用网关 | Compose 内 `nginx` 服务 | 继续复用，用于 `/` -> Web、`/api/` -> API | `docker compose ... exec -T nginx wget -qO- http://127.0.0.1/healthz` |
| Web | `web` 容器，监听 `3001` | 由 Compose 构建并通过网关暴露 | `docker compose ... ps web` |
| API | `api` 容器，监听 `3000` | 由 Compose 构建并通过网关暴露 | `docker compose ... exec -T api node -e "<health check>"` |
| PostgreSQL | `postgres:16-alpine` | 首次部署可用 Compose 内置库；若有托管库，改 `DATABASE_URL` 即可 | `psql "$DATABASE_URL" -c 'select 1'` |
| Redis | `redis:7-alpine` | 当前主要给会话缓存和限流用 | `redis-cli -u "$REDIS_URL" ping` |
| 对象存储 | Compose 内含 MinIO，但 `.env.prod.example` 默认 `OBJECT_STORAGE_DRIVER=local` | 首次上线先按 `local` 跑通；确认后再切 `s3` | `curl http://127.0.0.1:9001` 或对象上传烟测 |
| Job 执行 | Compose 未包含独立 worker 服务 | 首次上线保持 inline；不要提前开 `bullmq` | 提交作业后看 API 日志 |

API 容器内健康检查命令示例：

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T api \
  node -e "require('node:http').get('http://127.0.0.1:3000/health/ready', (res) => { res.pipe(process.stdout); }).on('error', (error) => { console.error(error); process.exit(1); })"
```

---

## 2. 端口与入口矩阵

| 组件 | 容器端口 | 主机端口 | 说明 |
|---|---|---|---|
| `nginx` | `80` | `NGINX_PORT`，默认 `80` | 若主机侧 Nginx/LB 做 TLS，建议把 `NGINX_PORT` 改成 `8080` |
| `web` | `3001` | 不直接暴露 | 由 Compose 内 Nginx 代理 |
| `api` | `3000` | 不直接暴露 | 健康检查路径为 `/health`、`/health/ready`，不带 `/api/v1` |
| `postgres` | `5432` | 不直接暴露 | Compose 网络内别名 `db` |
| `redis` | `6379` | 不直接暴露 | Compose 网络内访问 |
| `minio console` | `9001` | `MINIO_CONSOLE_PORT`，默认 `9001` | 仅运维内网使用，不对公网开放 |

对外 URL 约定：
- 首页：`https://app.<domain>/`
- 登录页：`https://app.<domain>/login`
- API 前缀：`https://app.<domain>/api/v1`
- 健康检查：`https://app.<domain>/health`、`https://app.<domain>/health/ready`

---

## 3. 生产环境变量矩阵

### 3.1 入口与 Cookie

| 变量 | 必填 | 当前消费者 | 生产填写规则 | 备注 |
|---|---|---|---|---|
| `NODE_ENV` | 是 | Web、API | 固定 `production` | |
| `CORS_ORIGIN` | 是 | `deploy/scripts/validate-release-env.mjs` | 填前端主域，如 `https://app.example.com` | 校验脚本依赖它 |
| `CORS_ORIGINS` | 是 | API CORS / CSP | 与 `CORS_ORIGIN` 保持同值；多值时逗号分隔 | 当前代码真正读取的是这个键 |
| `API_BASE_URL` | 是 | env 校验脚本 | 填公网 API 基址，如 `https://app.example.com/api/v1` | 校验脚本依赖它 |
| `NEXT_PUBLIC_API_BASE_URL` | 是 | 浏览器端 Web | 默认 `/api/v1` | 走同域反代时保持默认 |
| `GROWTHPILOT_API_BASE_URL` | 是 | SSR / Server Actions | `http://api:3000/api/v1` | Compose 内访问 API |
| `AUTH_COOKIE_DOMAIN` | 否 | API Cookie | 单域名模式填 `app.example.com` 或留空 | 切二级域共享 Cookie 时再显式填写 |
| `AUTH_COOKIE_SAME_SITE` | 建议 | API Cookie | HTTPS 跨站场景填 `none`，同域可留默认 | |

### 3.2 API 运行时

| 变量 | 必填 | 生产填写规则 | 备注 |
|---|---|---|---|
| `JWT_SECRET` | 是 | 至少 64 位随机串 | 当前代码最低只要求 32 位，但发布门禁按 64 位执行 |
| `JWT_ACCESS_TTL_SECONDS` | 是 | 推荐 `900` | |
| `JWT_REFRESH_TTL_SECONDS` | 是 | 推荐 `2592000` | |
| `GP_PERSISTENCE_ADAPTER` | 是 | 固定 `db` | 首次上线不要回退 file 模式 |
| `GROWTHPILOT_MASTER_DATA_PATH` | 是 | 维持 `.runtime/master-data.json` | 该文件仍会被 API 使用 |
| `APP_VERSION` | 建议 | 发布 commit/tag | 便于 `/health` 与日志定位版本 |

### 3.3 数据库与 Redis

| 变量 | 必填 | 生产填写规则 | 备注 |
|---|---|---|---|
| `POSTGRES_DB` | Compose 内置库时必填 | `growthpilot` | 托管库模式可仅保留给 Compose |
| `POSTGRES_USER` | Compose 内置库时必填 | 非默认弱口令用户 | |
| `POSTGRES_PASSWORD` | Compose 内置库时必填 | 强密码 | 不得保留占位符 |
| `DATABASE_URL` | 是 | 指向真实生产库 | 允许指向托管 PostgreSQL |
| `REDIS_URL` | 是 | 指向真实 Redis 或 Compose 内 Redis | `redis://` 开头 |
| `DB_POOL_MIN` | 否 | 建议 `5` | 默认代码值就是 `5` |
| `DB_POOL_MAX` | 否 | 建议 `20`，不要低于 `DB_POOL_MIN` | |
| `DB_POOL_CONNECTION_TIMEOUT_MS` | 否 | 仅在真实 DB 压测后再调 | |
| `DB_POOL_IDLE_TIMEOUT_MS` | 否 | 仅在真实 DB 压测后再调 | |

### 3.4 对象存储与上传

| 变量 | 必填 | 生产填写规则 | 备注 |
|---|---|---|---|
| `OBJECT_STORAGE_DRIVER` | 是 | 首次上线建议 `local` | 当前 `.env.prod.example` 也是这个默认值 |
| `S3_ENDPOINT` | `OBJECT_STORAGE_DRIVER=s3` 时必填 | 指向真实 MinIO / S3 endpoint | 仅切 `s3` 时生效 |
| `S3_ACCESS_KEY` | `OBJECT_STORAGE_DRIVER=s3` 时必填 | 强密钥 | |
| `S3_SECRET_KEY` | `OBJECT_STORAGE_DRIVER=s3` 时必填 | 强密钥 | |
| `S3_BUCKET` | `OBJECT_STORAGE_DRIVER=s3` 时必填 | 真实桶名 | |
| `S3_REGION` | 视提供商而定 | 如 `ap-southeast-1` | 走 AWS S3 时建议填写 |
| `S3_FORCE_PATH_STYLE` | 视提供商而定 | MinIO 常设 `true` | |
| `S3_PUBLIC_BASE_URL` | 否 | 如有 CDN / 公共下载域名再填 | |
| `S3_SIGNED_URL_TTL_SECONDS` | 否 | 默认 `900` | |

### 3.5 队列与告警

| 变量 | 必填 | 生产填写规则 | 备注 |
|---|---|---|---|
| `JOB_QUEUE_DRIVER` | 否 | 首次上线留空或显式 `inline` | 当前 Compose 没有 worker 服务，勿直接设 `bullmq` |
| `JOB_QUEUE_WORKER_CONCURRENCY` | `bullmq` 时必填 | 仅部署独立 worker 后填写 | |
| `JOB_QUEUE_REMOVE_ON_COMPLETE` | 否 | 仅部署 `bullmq` 后再调 | |
| `JOB_QUEUE_REMOVE_ON_FAIL` | 否 | 仅部署 `bullmq` 后再调 | |
| `ERROR_TRACKING_ENABLED` | 否 | 接入外部错误平台后填 `true` | |
| `ERROR_TRACKING_DSN` | 否 | 真实 DSN | 只配其一也会启用错误上报钩子 |

---

## 4. 发布前核对清单

上线前至少跑完以下命令：

```bash
cp .env.prod.example .env.prod
npm run ops:env:check -- --env-file .env.prod --mode prod
docker compose --env-file .env.prod -f docker-compose.prod.yml config >/tmp/growthpilot.compose.rendered.yml
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
```

必须人工确认：
- `CORS_ORIGIN` 与 `CORS_ORIGINS` 已同步填写
- `NGINX_PORT` 已与 TLS 拓扑匹配
- `OBJECT_STORAGE_DRIVER` 已按本次上线方案确认，不要误切到未验证的 `s3`
- `JOB_QUEUE_DRIVER` 已按当前部署方式确认，不要误切到 `bullmq`
- 需要跑 `deploy/scripts/*.sh` 时，统一显式传 `DEPLOY_ENV_FILE=.env.prod`

---

## 5. 证据留存矩阵

| 环节 | 最低证据 |
|---|---|
| 服务器初始化 | 主机名、IP、用户名、`uname -a`、防火墙规则截图/终端输出 |
| DNS 切换 | DNS 控制台变更截图、`dig` 输出 |
| SSL 配置 | 证书签发输出、`openssl s_client` 输出、自动续期 dry-run 输出 |
| 环境变量 | `.env.prod` 脱敏归档版、`ops:env:check` 输出 |
| 首次部署 | `docker compose ps`、`deploy.log`、`/health/ready` 输出 |
| 冒烟验证 | `go_live_smoke_checklist_template.md` 实际填写版 |
