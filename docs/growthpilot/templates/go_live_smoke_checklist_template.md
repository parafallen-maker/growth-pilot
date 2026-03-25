# Go-Live Smoke Checklist

- release_id: `<release-id>`
- release_commit: `<git-sha>`
- environment: `prod`
- primary_domain: `https://app.example.com`
- commander: `<fill-me>`
- operator: `<fill-me>`
- qa_observer: `<fill-me>`

## 1. 执行规则

- 每一步必须记录开始时间、结果和证据。
- `Expected` 不满足时，先暂停后续步骤，再决定回滚或修复。
- 如需用测试账号，记录账号角色，不要在文档里写明密码。

## 2. 基础健康

| Step | Action | Expected | Evidence | Owner | Result |
|---|---|---|---|---|---|
| 1 | `curl -fsS https://app.example.com/health` | 返回 `status=ok` 且带版本号 | `<path/link>` | `<fill-me>` | pending |
| 2 | `curl -fsS https://app.example.com/health/ready` | 返回 `status=ok`；`db`/`redis`/`storage` 非 `error` | `<path/link>` | `<fill-me>` | pending |
| 3 | `curl -I https://app.example.com/login` | HTTP 200 | `<path/link>` | `<fill-me>` | pending |
| 4 | 浏览器打开 `https://app.example.com/login` | 登录页加载，无明显样式错乱 | `<path/link>` | `<fill-me>` | pending |

## 3. 登录与权限

| Step | Action | Expected | Evidence | Owner | Result |
|---|---|---|---|---|---|
| 5 | 用管理员/运营测试账号登录 | 成功进入 `/dashboard`，无 500/白屏 | `<path/link>` | `<fill-me>` | pending |
| 6 | 打开浏览器 Network，检查 `/api/v1/auth/me` | 返回 200，用户信息与测试账号匹配 | `<path/link>` | `<fill-me>` | pending |
| 7 | 刷新当前页面 | 会话保持有效，不要求重复登录 | `<path/link>` | `<fill-me>` | pending |

## 4. 主数据与迁移结果

| Step | Action | Expected | Evidence | Owner | Result |
|---|---|---|---|---|---|
| 8 | 打开 `/students` | 学生列表正常加载，能看到迁移后的学生数据 | `<path/link>` | `<fill-me>` | pending |
| 9 | 打开任一 `/students/<studentId>` | 学生 360 页正常加载，基础信息不为空 | `<path/link>` | `<fill-me>` | pending |
| 10 | 打开 `/families` | 家庭列表正常加载，余额/联系方式字段有值 | `<path/link>` | `<fill-me>` | pending |
| 11 | 打开 `/billing/contracts` 或 `/billing/invoices` | 账单相关页面能返回数据或明确 empty state，不得 500 | `<path/link>` | `<fill-me>` | pending |

## 5. 作业与文件链路

| Step | Action | Expected | Evidence | Owner | Result |
|---|---|---|---|---|---|
| 12 | 打开 `/homework/submissions` | 列表正常加载 | `<path/link>` | `<fill-me>` | pending |
| 13 | 用页面上的“上传作业”表单提交一个小文件 | 先调 `/files/upload/multipart`，再成功创建 submission | `<path/link>` | `<fill-me>` | pending |
| 14 | 打开新建 submission 的详情或复核入口 | 附件链接可打开/下载，不得 404 | `<path/link>` | `<fill-me>` | pending |

## 6. 放行结论

| Item | Value |
|---|---|
| Smoke end time | `<fill-me>` |
| Blockers found | `<fill-me>` |
| Rollback required | `yes / no` |
| Commander decision | `go / no-go / conditional-go` |
| Notes | `<fill-me>` |
