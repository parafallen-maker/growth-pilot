# GrowthPilot E2E 测试用例

> **基于**: UAT 测试计划 v2 (100/100 PASS)
> **生成日期**: 2026-04-01
> **用例总数**: 30 (P0: 10, P1: 12, P2: 8)
> **环境**: 前端 localhost:3000 · API localhost:4000/api/v1
> **测试账号**: admin / admin123

---

## P0 — 核心主流程

---

### E2E-001 | 登录成功并跳转 Dashboard

- **优先级**: P0
- **功能模块**: 认证
- **测试目标**: 管理员账号登录后正确跳转到 Dashboard

#### 前置条件
- URL: http://localhost:3000/login
- 测试账号: admin / admin123

#### 测试步骤
1. 导航到 `/login`
2. `page.getByPlaceholder` 填充 username（或 `getByLabel('用户名')`），输入 `admin`
3. `page.getByPlaceholder` 填充 password（或 `getByLabel('密码')`），输入 `admin123`
4. `page.getByRole('button', { name: '登录进入 Dashboard' }).click()`

#### 期望结果
- 登录后 URL 变为 `/dashboard`
- Dashboard 页面数据卡片可见（在读学生数、待复核作业等）
- 无错误 toast

#### 断言点
- UI: `expect(page).toHaveURL('/dashboard')`
- UI: `page.getByText('在读学生数').or(page.getByText('待复核作业')).isVisible()`

#### 证据采集
- 登录表单截图
- Dashboard 加载后截图

#### 自动化映射
- 脚本: `e2e/auth/login.spec.ts`
- 标题: `管理员登录成功跳转 Dashboard`
- 标签: `@smoke @critical`

---

### E2E-002 | 登出回到登录页

- **优先级**: P0
- **功能模块**: 认证
- **测试目标**: 退出登录后回到登录页，再访问受保护页面被重定向

#### 前置条件
- 已登录 admin 账号
- 当前在 `/dashboard`

#### 测试步骤
1. 登录 admin（复用 E2E-001 步骤）
2. 点击用户头像/退出按钮（`getByRole('button', { name: /退出|登出/ })` 或 `getByText('退出登录')`）
3. 验证 URL 变为 `/login`
4. 导航到 `/students`，验证被重定向到 `/login`

#### 期望结果
- 退出后 URL 为 `/login`
- 未登录访问 `/students` 重定向到 `/login`

#### 断言点
- UI: `expect(page).toHaveURL(/\/login/)`
- UI: `page.getByRole('button', { name: '登录进入 Dashboard' }).isVisible()`

#### 证据采集
- 退出后截图

#### 自动化映射
- 脚本: `e2e/auth/logout.spec.ts`
- 标题: `退出登录并验证保护页重定向`
- 标签: `@smoke @critical`

---

### E2E-003 | Dashboard 数据卡片加载

- **优先级**: P0
- **功能模块**: Dashboard
- **测试目标**: Dashboard 四张数据卡片正确渲染

#### 前置条件
- 已登录 admin，URL: `/dashboard`

#### 测试步骤
1. 登录并导航到 `/dashboard`
2. 等待数据卡片区域可见
3. 检查四张卡片: 在读学生数、待复核作业、周报完成率、本月实收

#### 期望结果
- 四张卡片均有标签和数值展示
- 无白屏、无调试文字

#### 断言点
- UI: `page.getByText('在读学生数').isVisible()`
- UI: `page.getByText('待复核作业').isVisible()`
- UI: `page.getByText('周报完成率').isVisible()`
- UI: `page.getByText('本月实收').isVisible()`

#### 证据采集
- Dashboard 完整截图

#### 自动化映射
- 脚本: `e2e/dashboard/dashboard.spec.ts`
- 标题: `Dashboard 数据卡片渲染`
- 标签: `@smoke @critical`

---

### E2E-004 | 学生列表加载与搜索

- **优先级**: P0
- **功能模块**: 学生管理
- **测试目标**: 学生列表正确加载，搜索功能可用

#### 前置条件
- 已登录 admin

#### 测试步骤
1. 导航到 `/students`
2. 等待表格加载，检查表头（学号/姓名/年级/校区/教师/家庭/正确率/状态）
3. 在搜索框输入关键词（如 `student-001` 或学生姓名）
4. 按回车或点击搜索按钮
5. 验证列表过滤结果

#### 期望结果
- 表格至少显示 2 条学生数据
- 搜索后列表仅显示匹配结果
- 表头完整

#### 断言点
- UI: `page.getByRole('table').isVisible()`
- UI: `page.getByText('学号').or(page.getByRole('columnheader', { name: '学号' }))`
- UI: 搜索后行数 ≤ 搜索前

#### 证据采集
- 列表截图、搜索结果截图

#### 自动化映射
- 脚本: `e2e/students/student-list.spec.ts`
- 标题: `学生列表加载与搜索筛选`
- 标签: `@smoke @critical`

---

### E2E-005 | 创建学生

- **优先级**: P0
- **功能模块**: 学生管理
- **测试目标**: 新建学生表单渲染完整，可提交

#### 前置条件
- 已登录 admin

#### 测试步骤
1. 导航到 `/students`
2. 点击 `getByRole('button', { name: /新建|新增/ })` 打开创建表单
3. 验证表单字段: 学号/姓名/年级/校区等
4. 填写必填字段
5. 点击提交

#### 期望结果
- 创建表单正确弹出/渲染
- 提交成功后返回列表页，新学生可见
- 成功 toast 提示

#### 断言点
- UI: 表单可见且包含必填字段标签
- UI: 提交后 toast 或列表刷新

#### 证据采集
- 新建表单截图、提交后列表截图

#### 自动化映射
- 脚本: `e2e/students/student-create.spec.ts`
- 标题: `新建学生档案`
- 标签: `@smoke @critical`

---

### E2E-006 | 教师列表

- **优先级**: P0
- **功能模块**: 教师管理
- **测试目标**: 教师列表加载，显示至少 2 条数据

#### 前置条件
- 已登录 admin

#### 测试步骤
1. 导航到 `/teachers`
2. 等待表格加载
3. 验证至少 2 条教师记录（teacher-001, teacher-002）

#### 期望结果
- 表格可见，有教师数据
- 表头完整

#### 断言点
- UI: `page.getByRole('table').isVisible()`
- UI: 表格行数 ≥ 2

#### 证据采集
- 教师列表截图

#### 自动化映射
- 脚本: `e2e/teachers/teacher-list.spec.ts`
- 标题: `教师列表加载`
- 标签: `@smoke @critical`

---

### E2E-007 | 作业提交列表 + 触发 AI 分析

- **优先级**: P0
- **功能模块**: 作业管理
- **测试目标**: 作业提交列表加载，可触发 AI 分析

#### 前置条件
- 已登录 admin
- API 有作业提交数据

#### 测试步骤
1. 导航到 `/homework/submissions`
2. 等待列表加载，检查表头（提交编号/学生/学科/日期/AI状态/正确率/复核状态/老师）
3. 找到一行未 AI 分析的提交，点击"触发 AI 分析"按钮
4. 验证按钮状态变化或成功提示

#### 期望结果
- 列表加载正常，表头完整
- AI 分析触发按钮可用
- 触发后有状态变化提示

#### 断言点
- UI: `page.getByRole('table').isVisible()`
- UI: `page.getByRole('button', { name: /触发.*AI|AI.*分析/ }).first().isEnabled()`

#### 证据采集
- 列表截图、AI 触发后截图

#### 自动化映射
- 脚本: `e2e/homework/submission-list.spec.ts`
- 标题: `作业提交列表与触发 AI 分析`
- 标签: `@smoke @critical`

---

### E2E-008 | 批改提交 + 提交复核

- **优先级**: P0
- **功能模块**: 作业管理
- **测试目标**: 批改页加载，可修改正确率/错因并提交复核

#### 前置条件
- 已登录 admin
- 已有带 AI 分析结果的作业提交

#### 测试步骤
1. 导航到 `/homework/submissions`
2. 点击某条提交进入批改页 `/homework/review/[submissionId]`
3. 等待页面加载：学生信息 + 作业图片 + AI 分析结果
4. 修改正确率（如改为 90）
5. 选择错因标签
6. 填写教师建议
7. 点击"提交复核"按钮

#### 期望结果
- 批改页正确加载
- 可编辑正确率和错因
- 提交复核后状态更新，toast 提示成功

#### 断言点
- UI: `page.getByText(/AI.*分析/).or(page.getByText('88%'))`
- UI: 提交复核后 toast 或状态文字变化

#### 证据采集
- 批改页截图、提交后截图

#### 自动化映射
- 脚本: `e2e/homework/review.spec.ts`
- 标题: `批改作业并提交复核`
- 标签: `@smoke @critical`

---

### E2E-009 | 合同列表

- **优先级**: P0
- **功能模块**: 收费管理
- **测试目标**: 合同列表正确加载

#### 前置条件
- 已登录 admin

#### 测试步骤
1. 导航到 `/billing/contracts`
2. 等待列表加载
3. 验证表头和列表数据

#### 期望结果
- 合同列表可见
- 表头完整（合同编号/学生/收费方案/金额/状态等）

#### 断言点
- UI: `page.getByRole('table').isVisible()`

#### 证据采集
- 合同列表截图

#### 自动化映射
- 脚本: `e2e/billing/contract-list.spec.ts`
- 标题: `合同列表加载`
- 标签: `@smoke @critical`

---

### E2E-010 | 任务列表 + 状态筛选

- **优先级**: P0
- **功能模块**: 任务与预警
- **测试目标**: 任务列表加载，状态筛选功能可用

#### 前置条件
- 已登录 admin

#### 测试步骤
1. 导航到 `/tasks/list`
2. 等待列表加载
3. 点击不同状态筛选（待办/进行中/已完成）
4. 验证列表数据变化

#### 期望结果
- 任务列表可见
- 状态筛选切换后列表更新

#### 断言点
- UI: `page.getByRole('table').or(page.getByText(/任务/))`
- UI: 筛选按钮可点击

#### 证据采集
- 任务列表截图

#### 自动化映射
- 脚本: `e2e/tasks/task-list.spec.ts`
- 标题: `任务列表加载与状态筛选`
- 标签: `@smoke @critical`

---

### E2E-011 | 预警列表 + 状态操作

- **优先级**: P0
- **功能模块**: 任务与预警
- **测试目标**: 预警列表加载，可确认接收/标记已解决

#### 前置条件
- 已登录 admin

#### 测试步骤
1. 导航到 `/alerts`
2. 等待列表加载
3. 点击级别筛选（高/中/低）
4. 对一条预警点击"确认接收"或"标记已解决"

#### 期望结果
- 预警列表可见
- 级别筛选可用
- 状态操作后列表更新

#### 断言点
- UI: `page.getByRole('button', { name: /确认接收|标记已解决/ }).first().isVisible()`

#### 证据采集
- 预警列表截图、操作后截图

#### 自动化映射
- 脚本: `e2e/alerts/alert-list.spec.ts`
- 标题: `预警列表与状态操作`
- 标签: `@smoke @critical`

---

## P1 — 关键分支

---

### E2E-012 | 错误凭据登录

- **优先级**: P1
- **功能模块**: 认证
- **测试目标**: 输入错误账号密码，展示错误提示

#### 前置条件
- URL: `/login`

#### 测试步骤
1. 导航到 `/login`
2. 输入用户名 `wrong_user`，密码 `wrong_pass`
3. 点击"登录进入 Dashboard"
4. 验证错误提示展示

#### 期望结果
- 不跳转到 Dashboard
- 显示错误信息（如"登录失败"或 API 返回的错误消息）

#### 断言点
- UI: `expect(page).toHaveURL(/\/login/)`
- UI: `page.getByText(/登录失败|用户名.*错误|密码.*错误/).isVisible()`

#### 证据采集
- 错误提示截图

#### 自动化映射
- 脚本: `e2e/auth/login-error.spec.ts`
- 标题: `错误凭据登录失败提示`
- 标签: `@regression`

---

### E2E-013 | 学期切换

- **优先级**: P1
- **功能模块**: Dashboard
- **测试目标**: 切换学期功能可用

#### 前置条件
- 已登录 admin，在 Dashboard 页

#### 测试步骤
1. 导航到 `/dashboard`
2. 点击"切学期"按钮
3. 弹出校区/学期选择弹窗
4. 选择不同学期
5. 确认切换

#### 期望结果
- 弹窗正常弹出
- 切换后 Dashboard 数据更新

#### 断言点
- UI: `page.getByRole('dialog').or(page.getByText(/学期|校区/))`

#### 证据采集
- 弹窗截图

#### 自动化映射
- 脚本: `e2e/dashboard/term-switch.spec.ts`
- 标题: `学期切换功能`
- 标签: `@regression`

---

### E2E-014 | 学生详情页 360

- **优先级**: P1
- **功能模块**: 学生管理
- **测试目标**: 学生 360 详情页聚合信息完整

#### 前置条件
- 已登录 admin，学生列表有数据

#### 测试步骤
1. 导航到 `/students`
2. 点击某个学生进入详情 `/students/student-001`
3. 检查 tabs/区块: 基本信息、家庭信息、作业摘要、成长观察、趋势与经营、账单

#### 期望结果
- 详情页加载，各区块内容可见
- 基本信息包含学生主档/在读档
- 家庭信息显示明明家/联系人

#### 断言点
- UI: `page.getByText(/基本信息|学生主档/).isVisible()`
- UI: `page.getByText(/家庭信息|明明家/).isVisible()`
- UI: `page.getByText(/作业摘要/).isVisible()`

#### 证据采集
- 详情页完整截图

#### 自动化映射
- 脚本: `e2e/students/student-detail.spec.ts`
- 标题: `学生 360 详情页聚合信息`
- 标签: `@regression`

---

### E2E-015 | 家庭列表 + 详情

- **优先级**: P1
- **功能模块**: 家庭管理
- **测试目标**: 家庭列表加载，可查看详情

#### 前置条件
- 已登录 admin

#### 测试步骤
1. 导航到 `/families`
2. 等待列表加载，检查有明明家/F001 数据
3. 点击进入详情 `/families/family-001`
4. 验证联系人列表、关联学生、沟通记录

#### 期望结果
- 家庭列表可见
- 详情页显示联系人、学生、沟通记录

#### 断言点
- UI: `page.getByText('明明家').or(page.getByText('F001')).isVisible()`
- UI: 详情页联系人信息可见

#### 证据采集
- 列表截图、详情截图

#### 自动化映射
- 脚本: `e2e/families/family-detail.spec.ts`
- 标题: `家庭列表与详情`
- 标签: `@regression`

---

### E2E-016 | 错因分类管理 CRUD

- **优先级**: P1
- **功能模块**: 作业管理
- **测试目标**: 错因分类列表加载，新建/编辑表单可用

#### 前置条件
- 已登录 admin

#### 测试步骤
1. 导航到 `/homework/error-taxonomies`
2. 等待列表加载（如 MATH_CALC/计算错误）
3. 点击新建按钮，验证表单
4. 填写表单并提交
5. 验证新记录出现

#### 期望结果
- 列表正确加载
- 新建表单可提交
- 提交后列表刷新

#### 断言点
- UI: `page.getByRole('table').isVisible()`
- UI: 提交后新记录可见

#### 证据采集
- 列表截图、新建表单截图

#### 自动化映射
- 脚本: `e2e/homework/error-taxonomy.spec.ts`
- 标题: `错因分类 CRUD`
- 标签: `@regression`

---

### E2E-017 | 成长观察列表 + 新建

- **优先级**: P1
- **功能模块**: 成长管理
- **测试目标**: 习惯观察列表加载，新建表单可用

#### 前置条件
- 已登录 admin

#### 测试步骤
1. 导航到 `/growth/observations`
2. 等待列表加载，有维度/评分数据
3. 点击新建按钮
4. 验证表单字段（维度评分/学生选择）
5. 填写并提交

#### 期望结果
- 列表可见有数据
- 新建表单正确渲染

#### 断言点
- UI: `page.getByRole('table').or(page.getByText(/观察/))`

#### 证据采集
- 列表截图、表单截图

#### 自动化映射
- 脚本: `e2e/growth/observations.spec.ts`
- 标题: `成长观察列表与新建`
- 标签: `@regression`

---

### E2E-018 | 考勤看板

- **优先级**: P1
- **功能模块**: 考勤与设备
- **测试目标**: 考勤看板加载，有签到/异常统计

#### 前置条件
- 已登录 admin

#### 测试步骤
1. 导航到 `/attendance/board`
2. 等待页面加载
3. 检查签到统计和异常统计区域

#### 期望结果
- 考勤看板可见
- 签到/异常统计区域有数据

#### 断言点
- UI: `page.getByText(/签到|异常|考勤/).isVisible()`

#### 证据采集
- 看板截图

#### 自动化映射
- 脚本: `e2e/attendance/board.spec.ts`
- 标题: `考勤看板加载`
- 标签: `@regression`

---

### E2E-019 | 收费方案列表

- **优先级**: P1
- **功能模块**: 收费管理
- **测试目标**: 收费方案列表加载

#### 前置条件
- 已登录 admin

#### 测试步骤
1. 导航到 `/billing/products`
2. 等待列表加载

#### 期望结果
- 收费方案列表可见

#### 断言点
- UI: `page.getByRole('table').or(page.getByText(/方案/))`

#### 证据采集
- 列表截图

#### 自动化映射
- 脚本: `e2e/billing/product-list.spec.ts`
- 标题: `收费方案列表加载`
- 标签: `@regression`

---

### E2E-020 | 账单列表 + 欠费预警

- **优先级**: P1
- **功能模块**: 收费管理
- **测试目标**: 账单列表加载，欠费预警卡片可见

#### 前置条件
- 已登录 admin

#### 测试步骤
1. 导航到 `/billing/invoices`
2. 等待列表加载
3. 检查欠费预警卡片（红色边框 + ⚠️ 图标）

#### 期望结果
- 账单列表可见
- 欠费预警卡片存在（如有欠费数据）

#### 断言点
- UI: `page.getByRole('table').isVisible()`
- UI: `page.getByText(/欠费/).or(page.getByText('⚠️'))`

#### 证据采集
- 列表截图

#### 自动化映射
- 脚本: `e2e/billing/invoice-list.spec.ts`
- 标题: `账单列表与欠费预警`
- 标签: `@regression`

---

### E2E-021 | 续费跟进

- **优先级**: P1
- **功能模块**: 收费管理
- **测试目标**: 续费提醒页面加载

#### 前置条件
- 已登录 admin

#### 测试步骤
1. 导航到 `/billing/renewals`
2. 等待页面加载

#### 期望结果
- 续费提醒页面可见，无 429 错误

#### 断言点
- UI: 页面正常加载，无网络错误

#### 证据采集
- 页面截图

#### 自动化映射
- 脚本: `e2e/billing/renewals.spec.ts`
- 标题: `续费跟进页面加载`
- 标签: `@regression`

---

### E2E-022 | 沟通记录

- **优先级**: P1
- **功能模块**: 沟通管理
- **测试目标**: 沟通记录列表加载

#### 前置条件
- 已登录 admin

#### 测试步骤
1. 导航到 `/communication/records`
2. 等待列表加载

#### 期望结果
- 沟通记录列表可见

#### 断言点
- UI: 列表或表格可见

#### 证据采集
- 列表截图

#### 自动化映射
- 脚本: `e2e/communication/records.spec.ts`
- 标题: `沟通记录列表加载`
- 标签: `@regression`

---

### E2E-023 | 数据分析三页

- **优先级**: P1
- **功能模块**: 数据分析
- **测试目标**: 概览/教学/收费三个分析页均加载

#### 前置条件
- 已登录 admin

#### 测试步骤
1. 导航到 `/analytics/overview`，等待数据卡片
2. 导航到 `/analytics/teaching`，等待图表区域
3. 导航到 `/analytics/billing`，等待图表区域

#### 期望结果
- 三个页面均无白屏
- 概览页数据卡片可见
- 教学/收费页有图表或"暂无图表数据"提示

#### 断言点
- UI: 三个页面 URL 正确
- UI: 无严重错误

#### 证据采集
- 三页截图

#### 自动化映射
- 脚本: `e2e/analytics/analytics-pages.spec.ts`
- 标题: `数据分析三页加载`
- 标签: `@regression`

---

## P2 — 边界异常

---

### E2E-024 | 未登录访问保护页重定向

- **优先级**: P2
- **功能模块**: 认证
- **测试目标**: 未登录状态下访问受保护路由被重定向

#### 前置条件
- 未登录状态（清除 cookie/token）

#### 测试步骤
1. 新建 context，不设置 token
2. 直接导航到 `/students`
3. 验证被重定向到 `/login`
4. 导航到 `/dashboard`，验证同样重定向

#### 期望结果
- 所有受保护路由重定向到 `/login`

#### 断言点
- UI: `expect(page).toHaveURL(/\/login/)`
- UI: 登录表单可见

#### 证据采集
- 重定向后截图

#### 自动化映射
- 脚本: `e2e/auth/redirect.spec.ts`
- 标题: `未登录访问受保护页重定向`
- 标签: `@regression`

---

### E2E-025 | 空状态展示

- **优先级**: P2
- **功能模块**: 学生/教师/作业
- **测试目标**: 列表无数据时显示 EmptyState 组件

#### 前置条件
- 已登录 admin
- API 返回空列表（可使用筛选使结果为空）

#### 测试步骤
1. 导航到 `/students`，输入不存在的关键词搜索
2. 验证显示空状态（🎓 暂无学生数据）
3. 导航到 `/teachers`，搜索不存在关键词
4. 验证显示空状态（👨‍🏫 暂无教师数据）
5. 导航到 `/homework/submissions`，筛选使结果为空
6. 验证显示空状态（📝 暂无作业提交）

#### 期望结果
- 空状态组件正确显示，带对应 emoji 和文案

#### 断言点
- UI: `page.getByText(/暂无学生数据/).isVisible()`
- UI: `page.getByText(/暂无教师数据/).isVisible()`
- UI: `page.getByText(/暂无作业提交/).isVisible()`

#### 证据采集
- 三个空状态截图

#### 自动化映射
- 脚本: `e2e/global/empty-states.spec.ts`
- 标题: `空状态展示（学生/教师/作业）`
- 标签: `@regression`

---

### E2E-026 | 学生状态流转

- **优先级**: P2
- **功能模块**: 学生管理
- **测试目标**: StudentStatusSwitch 组件可正确切换学生状态

#### 前置条件
- 已登录 admin，学生列表有数据

#### 测试步骤
1. 导航到 `/students`
2. 找到状态列，点击 StudentStatusSwitch 组件
3. 在弹出选项中选择新状态
4. 验证状态更新成功

#### 期望结果
- 状态切换后列表刷新
- 新状态正确显示
- 非法流转被阻止（如有）

#### 断言点
- UI: 状态文本变更

#### 证据采集
- 切换前后截图

#### 自动化映射
- 脚本: `e2e/students/student-status.spec.ts`
- 标题: `学生状态流转`
- 标签: `@regression`

---

### E2E-027 | 账单状态流转

- **优先级**: P2
- **功能模块**: 收费管理
- **测试目标**: InvoiceStatusSwitch 组件可正确切换账单状态

#### 前置条件
- 已登录 admin，账单列表有数据

#### 测试步骤
1. 导航到 `/billing/invoices`
2. 找到状态列，点击 InvoiceStatusSwitch
3. 选择新状态
4. 验证状态更新

#### 期望结果
- 状态切换后列表刷新
- 新状态正确显示

#### 断言点
- UI: 状态文本变更

#### 证据采集
- 切换前后截图

#### 自动化映射
- 脚本: `e2e/billing/invoice-status.spec.ts`
- 标题: `账单状态流转`
- 标签: `@regression`

---

### E2E-028 | 字典 CRUD

- **优先级**: P2
- **功能模块**: 设置中心
- **测试目标**: 系统字典管理（student_status, job_status）可增删改

#### 前置条件
- 已登录 admin

#### 测试步骤
1. 导航到 `/settings/system`
2. 找到字典管理区域
3. 选择一个字典类型（如 student_status）
4. 新增一个字典项
5. 编辑该字典项
6. 删除该字典项

#### 期望结果
- CRUD 操作均成功
- 列表实时更新

#### 断言点
- UI: 新增后列表有新项
- UI: 编辑后文本更新
- UI: 删除后列表无该项

#### 证据采集
- 各步骤截图

#### 自动化映射
- 脚本: `e2e/settings/dictionary.spec.ts`
- 标题: `字典管理 CRUD`
- 标签: `@regression`

---

### E2E-029 | 任务创建表单

- **优先级**: P2
- **功能模块**: 任务与预警
- **测试目标**: 新建任务表单渲染完整

#### 前置条件
- 已登录 admin

#### 测试步骤
1. 导航到 `/tasks/list`
2. 点击新建任务按钮
3. 验证创建表单字段完整
4. 填写必填字段并提交

#### 期望结果
- 表单正确渲染
- 提交后列表有新任务

#### 断言点
- UI: 表单可见且包含必填字段
- UI: 提交后新任务在列表中

#### 证据采集
- 表单截图、提交后截图

#### 自动化映射
- 脚本: `e2e/tasks/task-create.spec.ts`
- 标题: `新建任务`
- 标签: `@regression`

---

### E2E-030 | 404 页面

- **优先级**: P2
- **功能模块**: 全局体验
- **测试目标**: 访问不存在的路由显示品牌化 404 页

#### 前置条件
- 已登录 admin

#### 测试步骤
1. 导航到 `/not-exist-page-xyz`
2. 验证 404 页面渲染

#### 期望结果
- 显示品牌化 404 中文页面
- 有"返回首页"按钮

#### 断言点
- UI: `page.getByText(/404|页面.*未找到|不存在/).isVisible()`
- UI: `page.getByRole('link', { name: /返回首页|首页/ }).isVisible()`

#### 证据采集
- 404 页面截图

#### 自动化映射
- 脚本: `e2e/global/not-found.spec.ts`
- 标题: `404 品牌化页面`
- 标签: `@regression`

---

## 附录：Playwright 定位策略速查

| 场景 | 推荐定位器 |
|------|-----------|
| 登录用户名输入 | `getByLabel('用户名')` 或 `getByPlaceholder` |
| 登录密码输入 | `getByLabel('密码')` |
| 登录按钮 | `getByRole('button', { name: '登录进入 Dashboard' })` |
| 表格 | `getByRole('table')` |
| 列头 | `getByRole('columnheader', { name: '...' })` |
| 导航链接 | `getByRole('link', { name: '...' })` |
| 新建按钮 | `getByRole('button', { name: /新建|新增/ })` |
| 搜索框 | `getByPlaceholder(/搜索|关键词/)` |
| 对话框 | `getByRole('dialog')` |
| 状态文字 | `getByText(/状态名/)` |
| 返回首页链接 | `getByRole('link', { name: /返回首页|首页/ })` |

## 用例统计

| 优先级 | 用例数 | ID 范围 |
|--------|--------|---------|
| P0 核心主流程 | 11 | E2E-001 ~ E2E-011 |
| P1 关键分支 | 12 | E2E-012 ~ E2E-023 |
| P2 边界异常 | 7 | E2E-024 ~ E2E-030 |
| **合计** | **30** | E2E-001 ~ E2E-030 |