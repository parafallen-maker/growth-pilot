# 39 Wave 5 正式上线操作手册

> 覆盖范围：`INF-30` ~ `INF-39`、`QA-30`
>
> 用途：把正式环境初始化、发布、冒烟与 Go/No-Go 的执行顺序固定下来。
>
> 状态声明：本文不代表正式环境已部署，只代表操作手册、样例配置与命令已就绪。

---

## 1. 依赖前置

执行本手册前，必须先满足：
- Wave 3 的部署资产已可用：`docker-compose.prod.yml`、部署脚本、回滚脚本、备份脚本
- `.env.prod` 已从根目录 `.env.prod.example` 衍生并填入真实值
- 迁移脚本已在 UAT 完成一次完整演练
- Go/No-Go 评审已预约时间、角色、负责人

参考样例：
- `.env.prod.example`
- `deploy/examples/nginx.growthpilot.conf.example`
- `deploy/examples/growthpilot.logrotate.conf`

---

## 2. `INF-30` 服务器环境初始化

最低基线：
- Ubuntu 22.04 LTS
- 2 vCPU / 4 GB RAM 起步
- 独立磁盘卷用于数据库与日志

执行清单：
1. 安装 Docker Engine、Docker Compose Plugin
2. 安装 Node.js 20 作为应急直跑通道
3. 创建 `deploy` 用户，禁用 root 远程登录
4. 配置 SSH key 登录，禁用密码登录
5. 防火墙仅开放 `22/80/443`

建议记录：
- 主机名
- 公网 IP
- 运维负责人
- 变更时间

---

## 3. `INF-31` 域名与 DNS

要求：
- `app.example.com` 指向 Web
- `api.example.com` 或 `/api` 代理策略提前确定一种
- `www` 到主域跳转方向固定

放行前检查：
- `A` 记录 TTL 调低到 `300`
- DNS 已在两地解析验证
- 证书申请域名与 Nginx `server_name` 一致

---

## 4. `INF-32` SSL 证书配置

推荐 `certbot` 流程：

```bash
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.example.com -d www.app.example.com
sudo systemctl enable certbot.timer
sudo certbot renew --dry-run
```

检查项：
- HTTP 自动跳 HTTPS
- 证书剩余有效期 > 30 天
- 自动续期 dry-run 成功

---

## 5. `INF-33` 生产环境变量配置

流程：
1. 复制 `.env.prod.example`
2. 替换所有 `REPLACE_*` 占位符
3. 运行校验脚本

```bash
cp .env.prod.example .env.prod
npm run ops:env:check -- --env-file .env.prod --mode prod
```

强约束：
- `JWT_SECRET` 至少 64 位
- `DATABASE_URL` 必须是生产库，不得含 dev 占位符
- `S3_*` 不得使用 `minioadmin`

---

## 6. `INF-34` 日志收集配置

最小方案：
- 应用 stdout/stderr -> Docker logs
- 宿主机归档到 `/var/log/growthpilot/`
- `logrotate` 保留 30 天

样例：
- `deploy/examples/growthpilot.logrotate.conf`

至少采集：
- API application log
- API error log
- migration execution log
- deploy operator log

---

## 7. `INF-35` 监控告警

最少监控项：
- `GET /health`
- `GET /health/ready`
- CPU / Memory / Disk
- DB 连接数
- API 5xx 比例

告警阈值：
- 磁盘使用率 `> 80%`
- `health` 连续 3 次失败
- API P95 持续 10 分钟超阈值
- DB 连接数达到池上限 `80%`

---

## 8. `INF-36` 生产数据库初始化

只有在以下条件全部满足时才执行：
- 备份脚本已执行并验证
- 回滚负责人在线
- Go/No-Go 已签字

执行模板：

```bash
# 数据库存在性检查
docker compose -f docker-compose.prod.yml exec db psql -U gp -d postgres -c '\l'

# 创建数据库
docker compose -f docker-compose.prod.yml exec db createdb -U gp growthpilot

# migration
npm run db:migrate

# seed
npm run db:seed
```

执行后留证：
- 终端日志
- migration 版本列表
- seed 输出

---

## 9. `INF-37` 生产数据迁移

执行顺序固定：
1. `report-only`
2. `dry-run`
3. owner 复核 `reject-report.csv`
4. `db-apply`

正式环境命令模板：

```bash
DATABASE_URL=postgresql://... \
npm run migration:release -- \
  --report-only \
  --target-env prod \
  --batch-id BATCH-PROD-001 \
  --csv /secure-imports/final-cutover.csv
```

```bash
DATABASE_URL=postgresql://... \
npm run migration:release -- \
  --db-apply \
  --confirm-prod \
  --target-env prod \
  --batch-id BATCH-PROD-001 \
  --csv /secure-imports/final-cutover.csv
```

注意：
- 未加 `--confirm-prod` 不得执行正式导入
- 迁移报告必须归档到 release workspace

---

## 10. `INF-38` 首次部署

建议顺序：
1. 拉取已签字的 commit/tag
2. 校验 `.env.prod`
3. 备份数据库和对象存储
4. 启动基础设施
5. 启动 API / Web
6. 等待健康检查
7. 执行烟测

如果 `docker-compose.prod.yml` 尚未在仓库交付，则本步骤仍保持 `todo`，只允许准备手册，不允许假装执行。

---

## 11. `INF-39` 上线冒烟验证

最小烟测清单：
- 首页加载成功
- 登录成功
- `/auth/me` 返回当前用户
- 学生列表可看到迁移数据
- 作业上传成功
- 文件下载成功
- 账单列表可加载

每项都要留下：
- 时间
- 执行人
- 结果
- 证据链接

---

## 12. `QA-30` Go/No-Go 检查清单

推荐模板：
- `docs/growthpilot/templates/qa_release_gate_template.yaml`

会前必答：
- 备份是否已做且可恢复
- 回滚路径是否已演练
- UAT blocker 是否清零
- 性能是否达标
- 迁移 reject 是否在可接受范围
- 负责人是否在线

未满足任一项，默认 `no-go`。
