# 39 Wave 5 正式上线操作手册

> 覆盖范围：`INF-30` ~ `INF-39`、`QA-30`
>
> 用途：把生产环境初始化、DNS/TLS、环境变量、日志监控、首次部署和上线烟测固定成一次可照单执行的 runbook。
>
> 状态声明：本文只代表执行手册、命令模板和模板文档已准备好；真实云主机、域名、证书、生产凭据仍需外部环境执行。

---

## 1. 执行边界

本仓库当前的 Wave 5 默认前提如下：
- 默认入口是单域名模式：`https://app.<domain>`，`/api/` 由 Nginx 反向代理到 API。
- `docker-compose.prod.yml` 当前只暴露 HTTP 端口，不直接闭环 443/TLS；首次上线建议由主机侧 Nginx 或云 LB/CDN 终止 TLS。
- 健康检查路径是 `/health` 与 `/health/ready`，不带 `/api/v1` 前缀。
- `docker-compose.prod.yml` 未内置独立 worker 服务，首次上线不要把 `JOB_QUEUE_DRIVER` 切到 `bullmq`。
- `.env.prod.example` 默认 `OBJECT_STORAGE_DRIVER=local`；未完成真实 S3 联调前，不要在首发日直接切 `s3`。

执行顺序固定为：
1. 服务器初始化
2. DNS 预切换
3. TLS 证书签发
4. `.env.prod` 生成与校验
5. 日志与监控落位
6. 数据库初始化与迁移
7. 首次部署
8. 冒烟验证
9. Go/No-Go 结论

关联材料：
- `docs/growthpilot/43_Wave5_生产环境矩阵.md`
- `docs/growthpilot/templates/go_live_smoke_checklist_template.md`
- `docs/growthpilot/templates/go_live_observation_log_template.md`
- `deploy/examples/nginx.growthpilot.edge.conf.example`
- `deploy/examples/growthpilot.logrotate.conf`

---

## 2. `INF-30` 服务器环境初始化

### 2.1 基线规格

首次正式上线按以下最低规格准备：

| 项目 | 最低要求 | 备注 |
|---|---|---|
| OS | Ubuntu 22.04 LTS | 保持与现有部署脚本兼容 |
| CPU / RAM | 2 vCPU / 4 GB | 仅够首发与轻量流量 |
| 磁盘 | 80 GB SSD 起 | 至少预留给 PostgreSQL、镜像层、日志和备份 |
| 账号 | 非 root 部署账号 `deploy` | root 只保留 break-glass 用途 |
| 网络 | 22 / 80 / 443 | 若主机侧 Nginx 做 TLS，Compose 内网关改走 8080 |

### 2.2 主机初始化步骤

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release git ufw jq

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy
sudo mkdir -p /srv/growthpilot /var/log/growthpilot /srv/secure-imports
sudo chown -R deploy:deploy /srv/growthpilot /var/log/growthpilot /srv/secure-imports
```

### 2.3 SSH 与防火墙

```bash
sudo mkdir -p /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
sudo cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

检查 `/etc/ssh/sshd_config`：
- `PermitRootLogin no`
- `PasswordAuthentication no`
- `PubkeyAuthentication yes`

防火墙：

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status numbered
```

### 2.4 目录约定

| 路径 | 用途 |
|---|---|
| `/srv/growthpilot/current` | 当前运行的仓库 checkout |
| `/srv/growthpilot/releases/<release-id>` | 可选的发布归档目录 |
| `/var/log/growthpilot` | 部署、迁移、烟测、备份日志归档 |
| `/srv/secure-imports` | 正式迁移 CSV / 证据文件 |

必须留证：
- `hostnamectl`
- `ip addr` 或云控制台 IP 截图
- `sudo ufw status numbered`
- `docker --version`、`docker compose version`、`node --version`

---

## 3. `INF-31` 域名与 DNS

### 3.1 默认域名策略

首次正式上线按单域名执行：

| 记录 | 类型 | 目标 | 说明 |
|---|---|---|---|
| `app.example.com` | `A` / `AAAA` | 正式服务器或 LB IP | 主入口 |
| `www.app.example.com` | `CNAME` | `app.example.com` | 用于 301 跳转到主域 |

不建议首发日改为 `api.example.com` 子域，原因：
- 当前仓库默认 Nginx 配置与前端环境变量均按 `/api` 同域代理设计。
- 若强行拆子域，`NEXT_PUBLIC_API_BASE_URL`、CORS、Cookie domain 都要一起重审。

### 3.2 切换步骤

1. 发布日前一天下调 TTL 到 `300`。
2. 确认 `app` 与 `www` 记录已录入但尚未切流，或切流窗口内更新到目标 IP。
3. 从两处网络验证解析结果。

```bash
dig +short app.example.com
dig +short www.app.example.com
nslookup app.example.com 1.1.1.1
nslookup app.example.com 8.8.8.8
```

### 3.3 放行前检查

以下条件未满足则不要继续到 TLS：
- DNS 已开始按预期解析到目标主机或 LB
- `www` 跳转方向已确定
- 证书要覆盖的域名与 DNS 记录完全一致

---

## 4. `INF-32` SSL 证书配置

### 4.1 推荐拓扑

由于当前 `docker-compose.prod.yml` 只暴露 HTTP 入口，首次上线推荐以下任一方案：
- 方案 A：主机侧 Nginx 终止 TLS，反代到 Compose 内 `nginx`
- 方案 B：云 LB/CDN 终止 TLS，再回源到 Compose 内 `nginx`

本仓库给出的默认可执行方案是 A。

### 4.2 方案 A 的前置调整

在 `.env.prod` 中把 Compose 内网关改成高位端口，避免和主机侧 Nginx 抢占 80/443：

```env
NGINX_PORT=8080
```

先启动 Compose 内的应用网关，再在主机安装 edge Nginx：

```bash
cd /srv/growthpilot/current
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d postgres redis minio api web nginx
curl -fsS http://127.0.0.1:8080/healthz
```

### 4.3 主机侧 Nginx + Certbot

1. 安装主机侧 Nginx 与 Certbot。
2. 复制 `deploy/examples/nginx.growthpilot.edge.conf.example` 到 `/etc/nginx/sites-available/growthpilot.conf`。
3. 替换域名和上游端口。
4. 软链到 `sites-enabled` 并 `nginx -t`。
5. 申请证书并验证自动续期。

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo cp /srv/growthpilot/current/deploy/examples/nginx.growthpilot.edge.conf.example \
  /etc/nginx/sites-available/growthpilot.conf
sudo ln -sf /etc/nginx/sites-available/growthpilot.conf /etc/nginx/sites-enabled/growthpilot.conf
sudo nginx -t
sudo systemctl reload nginx

sudo certbot --nginx -d app.example.com -d www.app.example.com
sudo systemctl enable certbot.timer
sudo certbot renew --dry-run
```

### 4.4 验证项

```bash
curl -I http://app.example.com
curl -I https://app.example.com
openssl s_client -connect app.example.com:443 -servername app.example.com </dev/null
```

必须确认：
- HTTP 自动 301 到 HTTPS
- 证书链完整，剩余有效期 > 30 天
- `certbot renew --dry-run` 成功

---

## 5. `INF-33` 生产环境变量配置

### 5.1 生成 `.env.prod`

```bash
cd /srv/growthpilot/current
cp .env.prod.example .env.prod
openssl rand -base64 48 | tr -d '\n' && echo
```

填写时以 `docs/growthpilot/43_Wave5_生产环境矩阵.md` 为准，重点核对：
- `CORS_ORIGIN` 和 `CORS_ORIGINS` 必须同时填，且值一致
- `API_BASE_URL=https://app.example.com/api/v1`
- `NEXT_PUBLIC_API_BASE_URL=/api/v1`
- `GROWTHPILOT_API_BASE_URL=http://api:3000/api/v1`
- `NGINX_PORT=8080` 仅在主机侧 TLS 模式下使用
- 首次上线 `JOB_QUEUE_DRIVER` 留空或设 `inline`
- 首次上线 `OBJECT_STORAGE_DRIVER=local`

### 5.2 校验命令

```bash
npm run ops:env:check -- --env-file .env.prod --mode prod | tee /var/log/growthpilot/env-check.log
docker compose --env-file .env.prod -f docker-compose.prod.yml config >/tmp/growthpilot.compose.rendered.yml
```

未通过时不要继续部署。常见阻断：
- `DATABASE_URL` 仍带开发密码或占位符
- `JWT_SECRET` 长度不够
- `S3_*` 仍是默认演示值
- `CORS_ORIGIN` 已填但 `CORS_ORIGINS` 漏填

---

## 6. `INF-34` 日志收集配置

### 6.1 当前仓库里的日志源

| 日志源 | 当前行为 | 现场要求 |
|---|---|---|
| API 运行日志 | stdout/stderr，JSON 结构化输出 | 发布日必须留存 `requestId`、`status`、`path`、`durationMs` |
| API 异常日志 | stderr，异常会带 `code`、`requestId` | P0/P1 期间必须截出完整记录 |
| Nginx access/error | 容器内 `/var/log/nginx` | 通过 `docker compose logs nginx` 采集 |
| deploy / rollback / migrate | 脚本 stderr 带时间戳 | 用 `tee -a /var/log/growthpilot/*.log` 归档 |
| DB backup | `deploy/logs/db-backup.log` | 同步归档到发布材料 |

### 6.2 最小落地方案

1. 创建宿主机目录 `/var/log/growthpilot`。
2. 安装 `deploy/examples/growthpilot.logrotate.conf` 到 `/etc/logrotate.d/growthpilot`。
3. 发布、迁移、回滚命令统一 `tee -a` 到固定文件。
4. 应用运行日志以 `docker compose logs` 为现场检索入口。

```bash
sudo install -m 0644 deploy/examples/growthpilot.logrotate.conf /etc/logrotate.d/growthpilot
sudo logrotate -d /etc/logrotate.d/growthpilot
```

执行命令示例：

```bash
DEPLOY_ENV_FILE=.env.prod bash deploy/scripts/deploy.sh 2>&1 | tee -a /var/log/growthpilot/deploy.log
DEPLOY_ENV_FILE=.env.prod bash deploy/scripts/rollback.sh 2>&1 | tee -a /var/log/growthpilot/rollback.log
DEPLOY_ENV_FILE=.env.prod npm run db:migrate -- --mode compose-run 2>&1 | tee -a /var/log/growthpilot/migrate.log
DEPLOY_ENV_FILE=.env.prod npm run db:backup 2>&1 | tee -a /var/log/growthpilot/db-backup.log
```

### 6.3 发布窗口必须能回答的问题

现场至少要能在 5 分钟内取出：
- 某次失败请求的 `requestId`
- 某个 `/health/ready` 失败时的具体 `db` / `redis` / `storage` 状态
- 某次迁移与备份的完整终端输出

---

## 7. `INF-35` 监控告警

### 7.1 最低监控面

| 信号 | 采集点 | 阈值 / 规则 | 响应人 |
|---|---|---|---|
| `GET /health` | 外部 uptime | 连续 3 次失败告警 | 运维 |
| `GET /health/ready` | 外部 uptime 或内部 cron | 任一子检查为 `error` 告警 | API / 运维 |
| CPU / Memory / Disk | 云主机监控 | Disk `> 80%`，Memory 持续高位告警 | 运维 |
| DB 连接数 | PostgreSQL / 托管监控 | 达到池上限 `80%` 告警 | API |
| API 5xx 比例 | Nginx / APM / 网关日志 | 连续 10 分钟高于基线告警 | API |

### 7.2 最小实施方案

- 如果已有云监控：把主机、磁盘和 80/443 可用性接入云监控。
- 如果暂无 APM：至少用外部 uptime 工具监控 `https://app.example.com/health` 与 `https://app.example.com/health/ready`。
- 发布当日必须人工执行一次 DB 连接数检查并记录结果。

DB 连接数检查示例：

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres \
  sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select count(*) as active_connections from pg_stat_activity where datname = current_database();"'
```

发布后观察模板：
- `docs/growthpilot/templates/go_live_observation_log_template.md`

---

## 8. `INF-36` 生产数据库初始化

只在以下条件同时满足时执行：
- 备份负责人在线
- 回滚负责人在线
- Go/No-Go 已确认可以继续
- `DATABASE_URL` 已通过生产校验

初始化流程：

```bash
cd /srv/growthpilot/current

docker compose --env-file .env.prod -f docker-compose.prod.yml up -d postgres

docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres \
  sh -lc 'psql -U "$POSTGRES_USER" -d postgres -c '\''\l'\'''

docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres \
  sh -lc 'createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'

DEPLOY_ENV_FILE=.env.prod npm run db:migrate -- --mode compose-run 2>&1 | tee -a /var/log/growthpilot/migrate.log
DEPLOY_ENV_FILE=.env.prod npm run db:seed -- --mode compose-run 2>&1 | tee -a /var/log/growthpilot/seed.log
```

留证：
- 数据库存在性检查输出
- migration 输出
- seed 输出

---

## 9. `INF-37` 生产数据迁移

执行顺序固定：
1. `report-only`
2. `dry-run`
3. Owner 复核 `reject-report.csv`
4. `db-apply --confirm-prod`

正式环境命令模板：

```bash
cd /srv/growthpilot/current

DATABASE_URL=postgresql://... \
npm run migration:release -- \
  --report-only \
  --target-env prod \
  --batch-id BATCH-PROD-001 \
  --csv /srv/secure-imports/final-cutover.csv | tee -a /var/log/growthpilot/migration-report-only.log
```

```bash
cd /srv/growthpilot/current

DATABASE_URL=postgresql://... \
npm run migration:release -- \
  --db-apply \
  --confirm-prod \
  --target-env prod \
  --batch-id BATCH-PROD-001 \
  --csv /srv/secure-imports/final-cutover.csv | tee -a /var/log/growthpilot/migration-db-apply.log
```

强约束：
- 没有 `--confirm-prod` 不得执行正式导入
- 迁移报告、reject report、db-plan 都要归档到 release workspace

---

## 10. `INF-38` 首次部署

### 10.1 首次部署前检查

以下任一条件不满足，停止上线：
- DNS 已解析到目标主机或 LB
- TLS 已验证可用
- `.env.prod` 已通过校验
- 如为存量环境，数据库已备份并可恢复；如为 greenfield，已明确记录“无历史库，备份 N/A”
- 迁移输入文件已冻结

### 10.2 推荐执行顺序

首次部署按“先底座、再数据、后应用、最后烟测”执行：

```bash
sudo su - deploy
cd /srv/growthpilot
git clone <repo-url> current
cd current
git checkout <approved-commit-or-tag>
```

```bash
cp .env.prod.example .env.prod
# 手工填写真实值后继续
npm run ops:env:check -- --env-file .env.prod --mode prod
docker compose --env-file .env.prod -f docker-compose.prod.yml config >/tmp/growthpilot.compose.rendered.yml
```

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d postgres redis minio
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres \
  sh -lc 'psql -U "$POSTGRES_USER" -d postgres -c '\''\l'\'''
```

```bash
# 仅当目标库已存在历史数据时执行；greenfield 首发记录 N/A
DEPLOY_ENV_FILE=.env.prod npm run db:backup 2>&1 | tee -a /var/log/growthpilot/db-backup.log
DEPLOY_ENV_FILE=.env.prod npm run db:migrate -- --mode compose-run 2>&1 | tee -a /var/log/growthpilot/migrate.log
# 仅对空库 / 新库执行；存量库复跑前先确认 seed 幂等性
DEPLOY_ENV_FILE=.env.prod npm run db:seed -- --mode compose-run 2>&1 | tee -a /var/log/growthpilot/seed.log
```

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build api web nginx \
  2>&1 | tee -a /var/log/growthpilot/first-deploy.log
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T api \
  node -e "require('node:http').get('http://127.0.0.1:3000/health', (res) => { res.pipe(process.stdout); }).on('error', (error) => { console.error(error); process.exit(1); })"
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T api \
  node -e "require('node:http').get('http://127.0.0.1:3000/health/ready', (res) => { res.pipe(process.stdout); }).on('error', (error) => { console.error(error); process.exit(1); })"
```

说明：
- 首次部署用 `up -d --build`，因为当前 `docker-compose.prod.yml` 以本地 Dockerfile 构建 `api` / `web`。
- `deploy/scripts/deploy.sh` 更适合后续已有镜像/缓存的重复发布流程；首发不应假设 `pull` 就能拿到新应用构建物。

### 10.3 失败即停的触发器

出现以下任一情况，停止往下走并准备回滚：
- `ops:env:check` 非 0 退出
- `/health/ready` 返回 `status=error`
- `db:migrate` 失败
- Web 登录页或学生列表出现 500 / 白屏

---

## 11. `INF-39` 上线冒烟验证

冒烟不靠口头确认，必须填写：
- `docs/growthpilot/templates/go_live_smoke_checklist_template.md`
- `docs/growthpilot/templates/go_live_observation_log_template.md`

最低必须覆盖：
- 登录页可加载
- 登录成功，`/api/v1/auth/me` 返回当前用户
- 学生列表和学生 360 可见迁移结果
- 家庭列表可打开
- 作业上传成功，附件可下载
- 合同或账单页可加载

每项都必须记录：
- 时间
- 执行人
- 结果
- 证据路径

---

## 12. `QA-30` Go / No-Go 检查清单

推荐模板：
- `docs/growthpilot/templates/qa_release_gate_template.yaml`

会前必答：
- 备份是否已完成且已验证可恢复
- 回滚路径是否已演练
- UAT blocker 是否清零
- 性能指标是否在可接受范围
- 迁移 reject 是否在可接受范围
- 运维、API、Web、业务签收负责人是否在线
- `go_live_smoke_checklist_template.md` 是否全部完成

任一项无法给出证据，默认 `no-go`。
