# GrowthPilot — 全量 TODO 清单

> 更新时间: 2026-03-31
> 来源: 91 条 UAT 测试 + 冒烟测试 + 开发过程发现

---

## 🔴 P0 — 必须修复（阻塞核心链路）

### B-01 教师账号前端登录失败
- **现象**: API 返回 token 正常，前端报 "validation failed"
- **根因**: 疑似前端登录表单字段名与 API 不匹配
- **影响**: 教师无法登录，教师核心链路 (QA-03) 完全阻塞
- **文件**: `apps/web/src/app/login/page.tsx` 或相关 auth API route
- **验证**: 用 teacher.zhang / teacher123 在浏览器登录成功

### B-06 学生列表无数据
- **现象**: 学生管理页面列表 0 条，搜索/筛选无法验证
- **根因**: seed 数据未生成学生记录（或数据在内存 DB 丢失）
- **影响**: 学生管理核心功能不可用
- **文件**: `apps/api/.data/users.json` 或 seed 脚本
- **验证**: /students 页面展示 ≥1 条学生数据

### B-11 家庭创建提交不生效
- **现象**: 表单填写提交后页面跳转，但 API 无记录
- **根因**: 前端提交请求可能未正确发送或 API 路由问题
- **影响**: 无法通过前端创建家庭
- **文件**: `apps/web/src/app/(dashboard)/families/page.tsx`
- **验证**: 前端创建家庭后，刷新页面列表中出现新记录

---

## 🟡 P1 — 重要（影响体验完整性）

### B-02 Dashboard "切学期"按钮无响应
- **现象**: 按钮存在，点击 8s 无反应
- **根因**: 未绑定事件或弹窗组件未渲染
- **影响**: 用户无法切换学期/校区维度
- **文件**: `apps/web/src/app/(dashboard)/dashboard/page.tsx`
- **验证**: 点击按钮出现学期/校区选择弹窗

### B-03 学生 360 详情缺少聚合数据
- **现象**: 详情页仅展示基本信息，无作业/成长报告/账单等聚合
- **根因**: API 详情接口 `/students/:id` 只返回基本信息，缺少聚合查询
- **影响**: 学生 360 视图不完整
- **文件**: `apps/api/src/modules/users/` + `apps/web/src/app/(dashboard)/students/[studentId]/page.tsx`
- **验证**: 学生详情页展示最近作业、成长观察、账单状态

### B-04 学生详情页无编辑按钮
- **现象**: 详情页只有展示，无法编辑学生信息
- **影响**: 无法修改学生档案
- **文件**: `apps/web/src/app/(dashboard)/students/[studentId]/page.tsx`
- **验证**: 详情页有"编辑"按钮，点击后进入编辑表单

### B-05 学生详情页无独立账单 tab
- **现象**: 账单区域仅显示"未收金额 ¥0"，无账单列表
- **影响**: 无法在学生维度查看关联账单
- **文件**: `apps/web/src/app/(dashboard)/students/[studentId]/page.tsx`
- **验证**: 学生详情页有"账单"tab，展示关联账单列表

### B-12 字典管理页面无编辑入口
- **现象**: /settings/system 字典列表只有展示，无法增删改
- **影响**: 无法维护科目、习惯维度等基础字典
- **文件**: `apps/web/src/app/(dashboard)/settings/system/page.tsx`
- **验证**: 字典列表有"新增"/"编辑"/"删除"按钮

### Token 15 分钟过期，频繁需重新登录
- **现象**: 工作中途频繁被踢回登录页
- **根因**: access_token TTL 过短，refresh token 机制可能未生效
- **影响**: 严重影响日常使用体验
- **文件**: `apps/api/src/modules/auth/` + `apps/web/src/lib/auth-session.ts`
- **验证**: 登录后 1 小时内无需重新登录

### `/students/import` 校验错误表加载失败 (SYS_500)
- **现象**: 批量导入页校验错误表格报 SYS_500
- **根因**: API 端 import 相关接口异常
- **影响**: 批量导入功能不可用
- **文件**: `apps/api/src/modules/users/` import 相关 controller
- **验证**: 上传测试文件后错误表正常展示

---

## 🟢 P2 — 改进（体验优化）

### B-07 续费页 rate limit 错误提示不友好
- **现象**: API 返回 FLOW_429，前端显示"网络或服务暂时不可用"
- **改进**: 区分 rate limit 和网络错误，给出 "请求过于频繁，请稍后再试"
- **文件**: `apps/web/src/lib/api-client.ts` 错误处理

### B-08 账单页无独立"欠费预警"区域
- **现象**: 欠费数据仅在 dashboard 经营总览展示
- **改进**: 在 /billing/invoices 增加"欠费预警"区域或 tab
- **文件**: `apps/web/src/app/(dashboard)/billing/invoices/page.tsx`

### B-09 任务中心无新建/创建按钮
- **现象**: /tasks/list 只有列表和筛选，无法创建任务
- **改进**: 添加"新建任务"按钮和表单
- **文件**: `apps/web/src/app/(dashboard)/tasks/page.tsx`

### B-10 404 页面未品牌化
- **现象**: 404 显示 Next.js 默认英文错误页
- **改进**: 自定义 not-found.tsx，中文错误提示 + 返回首页按钮
- **文件**: `apps/web/src/app/not-found.tsx`（新建）

### 枚举值未翻译
- **现象**: 表格中 draft/pending/sent/failed/active 等英文枚举直接暴露
- **改进**: 前端建立枚举→中文映射，统一渲染
- **影响范围**: billing（合同状态、账单状态）、homework（AI/复核状态）、tasks、alerts 等全部列表页
- **文件**: 各 page.tsx + 建议集中到 `apps/web/src/lib/constants.ts`

### 原始 ID 暴露
- **现象**: 表格显示 student-001、campus-001、teacher-001 等内部 ID
- **改进**: API 返回 name + id，前端展示名称，ID 仅作内部标识
- **影响范围**: 学生列表（校区列显示 campus-001 而非校区名）、教师列表等
- **文件**: 各 service 层 + API VO

### `api-client.ts` DEFAULT_API_BASE_URL 硬编码 3001
- **现象**: 默认值 `http://127.0.0.1:3001/api/v1`，实际端口 4000
- **改进**: 改为 `http://localhost:4000/api/v1` 或强制环境变量
- **文件**: `apps/web/src/lib/api-client.ts`
- **验证**: 删除 .env 中 NEXT_PUBLIC_API_BASE_URL，前端仍正常请求

### 权限表无 code 唯一约束
- **现象**: seed 多次执行会产生重复权限记录
- **改进**: 添加唯一约束或 upsert 逻辑
- **文件**: `apps/api/src/modules/users/repository/users.repository.ts` permDefs
