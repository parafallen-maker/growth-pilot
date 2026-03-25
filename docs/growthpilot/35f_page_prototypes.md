# 08 页面原型清单

## 1. 页面总览
| 页面 | 路由 | 模块 | 角色 | 说明 |
| --- | --- | --- | --- | --- |
| 登录页 | /login | 认证 | 全部 | 账号密码登录 |
| 首页仪表盘 | /dashboard | 仪表盘 | super_admin / principal / ops_manager / teacher / finance | 概览指标、快捷入口、待办 |
| 学生列表 | /students | 学生 | super_admin / principal / ops_manager / teacher | 筛选、查看、新建 |
| 学生新建 | /students/new | 学生 | super_admin / principal / ops_manager | 建档 |
| 学生 360 | /students/[studentId] | 学生 | super_admin / principal / ops_manager / teacher | 全景查看 |
| 学生编辑 | /students/[studentId]/edit | 学生 | super_admin / principal / ops_manager | 编辑档案 |
| 学生作业 | /students/[studentId]/homework | 学生 | teacher / ops_manager | 按学生看作业 |
| 学生成长 | /students/[studentId]/growth | 学生 | teacher / ops_manager | 习惯、目标、周报 |
| 学生家庭 | /students/[studentId]/family | 学生 | teacher / ops_manager | 家庭联系人、沟通记录 |
| 学生收费 | /students/[studentId]/billing | 学生 | finance / principal / ops_manager | 合同账单汇总 |
| 家庭列表 | /families | 家庭 | super_admin / principal / ops_manager / teacher | 家庭检索 |
| 家庭 360 | /families/[familyId] | 家庭 | super_admin / principal / ops_manager / teacher | 家庭全景 |
| 教师列表 | /teachers | 教师 | super_admin / principal / ops_manager | 教师检索 |
| 教师详情 | /teachers/[teacherId] | 教师 | super_admin / principal / ops_manager / teacher | 教师全景 |
| 教师复盘 | /teachers/reviews | 教师 | super_admin / principal / ops_manager | 周复盘列表 |
| 作业复核队列 | /homework/queue | 作业 | teacher / ops_manager | 待复核队列 |
| 作业详情复核 | /homework/submissions/[submissionId] | 作业 | teacher / ops_manager | 图片 + AI + 复核 |
| 习惯观察列表 | /growth/habits | 成长 | teacher / ops_manager | 观察记录 |
| 成长目标列表 | /growth/goals | 成长 | teacher / ops_manager | 目标与跟进 |
| 周报列表 | /growth/weekly-reports | 成长 | teacher / ops_manager / principal | 周报管理 |
| 周报编辑 | /growth/weekly-reports/[reportId] | 成长 | teacher / ops_manager | 编辑周报 |
| 签到记录 | /attendance/checkins | 考勤 | ops_manager / teacher | 签到离校 |
| 学习时长 | /attendance/study-sessions | 考勤 | ops_manager / teacher | 时长统计 |
| 设备列表 | /devices | 考勤 | ops_manager | 设备维护 |
| 设备绑定 | /devices/bindings | 考勤 | ops_manager | 学生设备绑定 |
| 收费方案 | /billing/fee-plans | 收费 | finance / super_admin | 收费规则 |
| 合同列表 | /billing/contracts | 收费 | finance / principal | 合同维护 |
| 账单列表 | /billing/invoices | 收费 | finance / principal / ops_manager | 账单与欠费 |
| 账单详情 | /billing/invoices/[invoiceId] | 收费 | finance / principal | 账单明细、收款、退费 |
| 收款记录 | /billing/payments | 收费 | finance | 收款流水 |
| 任务中心 | /tasks | 系统 | 全部后台角色 | 待办列表 |
| 预警中心 | /alerts | 系统 | teacher / ops_manager / principal / finance | 预警处置 |
| 基础字典 | /settings/reference-data | 设置 | super_admin / ops_manager | 年级、科目、错因、收费项目 |
| 评分规则 | /settings/habit-rubrics | 设置 | super_admin / ops_manager | 习惯评分规则 |
| 学生分析 | /analytics/students | 分析 | principal / super_admin | 学生趋势 |
| 教师分析 | /analytics/teachers | 分析 | principal / super_admin | 教师工作量 |
| 收费分析 | /analytics/billing | 分析 | principal / super_admin / finance | 收费趋势 |

## 2. 全局布局
### 2.1 左侧导航
- 仪表盘
- 学生中心
- 家庭中心
- 教师中心
- 作业中心
- 成长中心
- 考勤设备
- 收费中心
- 任务中心
- 预警中心
- 设置中心
- 数据分析

### 2.2 顶部工具栏
- 全局搜索
- 当前学期切换
- 当前角色显示
- 消息/待办角标
- 个人菜单

### 2.3 统一交互
- 所有列表页保留分页、筛选、空态、错误态
- 所有详情页都保留“返回列表”“编辑”“最近操作时间”
- 所有状态标签统一颜色：
  - `normal / active / paid / done`：绿色
  - `watch / partial / todo`：黄色
  - `coaching / overdue / paused`：橙色
  - `critical / refunded / void / left`：红色

## 3. 重点页面详细原型

### 3.1 首页仪表盘 `/dashboard`
**目标**  
给不同角色一个“今天要处理什么”的统一入口。

**页面块**
1. 顶部 KPI 卡片  
   - 在读学生数  
   - 今日作业数  
   - 待复核作业数  
   - 打开中的预警数  
   - 今日待办数  
   - 未结清金额

2. 中部左侧：待处理队列  
   - 待复核作业  
   - 本周未完成周报  
   - 近期待跟进家庭沟通  
   - 欠费提醒

3. 中部右侧：趋势图  
   - 最近 7 天作业正确率趋势  
   - 最近 7 天作业量趋势  
   - 最近 30 天收费回款趋势

4. 底部：快捷入口  
   - 新建学生  
   - 上传作业  
   - 新建习惯观察  
   - 新建账单

**接口**
- `GET /dashboard/overview`
- `GET /homework/queue`
- `GET /tasks`
- `GET /alerts`

**完成标准**
- 不同角色能看到不同卡片与快捷入口
- teacher 角色默认显示“自己负责学生”的数据
- principal 角色默认显示全局数据

---

### 3.2 学生列表 `/students`
**目标**  
作为系统主入口，快速定位任何学生。

**筛选区**
- 关键词（姓名 / 学生编号）
- 学期
- 年级
- 负责教师
- 在读状态
- 是否有打开中的预警
- 是否有未结清账单

**表格列**
- 学生编号
- 学生姓名
- 年级
- 当前学期
- 主负责教师
- 最近 7 天平均正确率
- 最近 30 天习惯均分
- 打开中的预警数
- 未完成任务数
- 未结清金额
- 操作

**操作**
- 查看 360
- 编辑
- 新建目标
- 新建周报
- 查看收费
- 查看家庭

**接口**
- `GET /students`
- `GET /students/{studentId}/360`

**完成标准**
- 支持分页与排序
- 支持批量导出当前筛选结果
- 点击行进入学生 360

---

### 3.3 学生 360 `/students/[studentId]`
**目标**  
把学生相关的所有高频信息收敛到一个页面。

**头部摘要卡**
- 姓名 / 学生编号 / 年级 / 学校
- 当前学期 / 校区 / 主负责教师
- 主联系人 / 联系方式
- 当前状态
- 当前打开预警数 / 待办数
- 当前未结清金额

**Tabs**
1. 概览  
   - 最近 7 天作业表现
   - 最近 30 天习惯趋势
   - 当前成长目标
   - 最近家校沟通
   - 最近账单

2. 作业  
   - 作业列表
   - 正确率趋势
   - Top 错因标签
   - 风险等级分布

3. 成长  
   - 习惯观察时间线
   - 当前目标卡片
   - 目标跟进记录
   - 周报列表

4. 家庭  
   - 家庭信息
   - 监护人列表
   - 沟通记录时间线

5. 收费  
   - 当前合同
   - 账单列表
   - 收款记录
   - 欠费提醒

6. 任务与预警  
   - 打开的任务
   - 打开的预警
   - 快捷关闭/转派

**接口**
- `GET /students/{studentId}/360`
- `GET /students/{studentId}`
- `GET /students/{studentId}/enrollments`
- `GET /families/{familyId}`
- `GET /billing/invoices?studentId={studentId}`
- `GET /tasks?studentId={studentId}`
- `GET /alerts?studentId={studentId}`

**完成标准**
- 页面首屏 1 次聚合接口可渲染核心信息
- Tabs 内列表可独立分页
- 所有新增动作可在当前页完成（抽屉/弹窗）

---

### 3.4 家庭 360 `/families/[familyId]`
**目标**  
围绕家庭而不是围绕单个电话号码管理家校协同。

**页面块**
1. 家庭基本信息
2. 监护人列表  
   - 姓名、关系、手机号、微信、是否主联系人、是否紧急联系人

3. 学生列表  
   - 同家庭下所有学生
   - 当前在读状态
   - 主负责教师

4. 沟通记录时间线  
   - 时间
   - 渠道
   - 主题
   - 摘要
   - 是否需要后续动作
   - 下次沟通时间

5. 家庭建议面板  
   - 来自最近周报的家庭建议
   - 来自教师任务的跟进要求

**操作**
- 新增监护人
- 修改主联系人
- 新增沟通记录
- 跳到学生 360

**接口**
- `GET /families/{familyId}`
- `GET /families/{familyId}/guardians`
- `GET /families/{familyId}/contact-logs`
- `POST /families/{familyId}/contact-logs`

---

### 3.5 教师详情 `/teachers/[teacherId]`
**目标**  
看到教师不是静态档案，而是“正在支持哪些学生、效果如何”。

**头部摘要**
- 教师编号 / 姓名 / 手机
- 在岗状态
- 当前负责学生数
- 最大容量
- 本周作业复核数
- 本周家长沟通数

**Tabs**
1. 学生分配  
   - 当前负责学生列表
   - 学期分配历史

2. 工作量  
   - 本周复核量
   - 本周周报量
   - 本周任务量
   - 平均正确率 / 习惯分

3. 周复盘  
   - 自评
   - 主管点评
   - 周指标快照

4. 培训任务  
   - 待完成
   - 已完成
   - 评分

**接口**
- `GET /teachers/{teacherId}`
- `GET /teachers/{teacherId}/overview`
- `GET /teachers/{teacherId}/reviews`
- `GET /teachers/{teacherId}/training-records`

---

### 3.6 作业复核队列 `/homework/queue`
**目标**  
让教师按优先级快速处理待复核作业。

**筛选区**
- 学期
- 教师（仅管理角色）
- 年级
- 科目
- 风险等级
- 是否已 AI 分析
- 日期范围

**列表列**
- 日期
- 学生
- 年级
- 科目
- AI 正确率
- AI 错因摘要
- 当前风险等级
- 附件数
- 操作（去复核）

**排序**
- 默认按风险等级 desc + 日期 desc

**接口**
- `GET /homework/queue`
- `GET /homework/submissions/{submissionId}`

**完成标准**
- 队列支持键盘快速导航
- 支持上一条 / 下一条连续复核
- 复核完成后自动返回队列并更新列表

---

### 3.7 作业详情复核 `/homework/submissions/[submissionId]`
**目标**  
高效率完成“看图 → 看 AI 草稿 → 教师定稿”。

**左侧**
- 图片画廊
- 放大预览
- 附件切换

**中间**
- AI 草稿卡
  - 原始 Markdown 结果
  - AI 正确率
  - AI 错因
  - AI 建议

**右侧**
- 教师复核表单
  - 最终正确率
  - 最终文本正确率
  - 错因标签多选
  - 风险等级
  - 教师评语
  - 下一步动作

**底部**
- 历史同类错因（同学生近 30 天）
- 历史作业趋势
- 保存并下一条按钮

**接口**
- `GET /homework/submissions/{submissionId}`
- `POST /homework/submissions/{submissionId}/ai-analyze`
- `PUT /homework/submissions/{submissionId}/review`

**完成标准**
- AI 草稿与教师结果同时可见
- 教师保存后自动生成/更新预警和任务
- 支持多标签错因选择

---

### 3.8 成长目标列表 `/growth/goals`
**目标**  
管理“学生当前正在改变什么”。

**筛选区**
- 学期
- 教师
- 学生
- 目标类型
- 状态
- 优先级
- 到期时间

**表格列**
- 学生
- 目标标题
- 类型
- 负责教师
- 开始日期
- 目标日期
- 当前进度
- 状态
- 优先级
- 操作（跟进 / 关闭 / 查看）

**接口**
- `GET /growth/goals`
- `POST /growth/goals`
- `POST /growth/goals/{goalId}/checkins`

**完成标准**
- 支持快速新增目标
- 支持在表格侧边抽屉中完成一次跟进
- 到期未完成目标要有高亮

---

### 3.9 周报编辑 `/growth/weekly-reports/[reportId]`
**目标**  
以“可编辑的结构化文档”形式完成学生周报。

**表单区块**
1. 学生 / 学期 / 周期
2. 作业表现摘要
3. 习惯表现摘要
4. 学习时长摘要
5. 家庭建议
6. 教师评语
7. 状态（draft / ready / shared）

**右侧辅助区**
- 本周作业统计
- 本周习惯分
- Top 错因
- 当前成长目标
- 最近沟通记录

**操作**
- 保存草稿
- 标记待分享
- 标记已分享
- 复制上周模板
- AI 生成草稿

**接口**
- `GET /growth/weekly-reports`
- `PATCH /growth/weekly-reports/{reportId}`

**完成标准**
- 支持富文本最小能力（段落/列表）
- 所有 AI 文案都可人工改写
- 分享状态可回溯

---

### 3.10 账单列表 `/billing/invoices`
**目标**  
财务与负责人快速看到应收、已收、逾期。

**筛选区**
- 学期
- 学生
- 家庭
- 状态
- 到期日期
- 是否逾期

**表格列**
- 账单编号
- 学生
- 家庭
- 账期
- 开单日期
- 到期日期
- 应收
- 已收
- 未收
- 状态
- 操作

**操作**
- 查看详情
- 记录收款
- 记录退费
- 复制账单
- 标记作废

**接口**
- `GET /billing/invoices`
- `POST /billing/invoices`
- `GET /billing/invoices/{invoiceId}`

---

### 3.11 账单详情 `/billing/invoices/[invoiceId]`
**目标**  
在一个页面完成账单确认、收款、退费、风险判断。

**页面块**
1. 账单头部卡
   - 账单编号 / 学生 / 家庭 / 状态 / 应收 / 已收 / 未收

2. 明细表
   - 项目名
   - 数量
   - 单价
   - 金额

3. 收款记录
4. 退费记录
5. 跟进时间线（可选接入任务/预警）
6. 快捷操作栏
   - 新增收款
   - 新增退费
   - 更新账单状态

**接口**
- `GET /billing/invoices/{invoiceId}`
- `POST /billing/invoices/{invoiceId}/payments`
- `POST /billing/invoices/{invoiceId}/refunds`

**完成标准**
- 收款成功后自动刷新已收/未收金额
- 账单状态自动流转
- 逾期账单显著高亮

---

### 3.12 签到与学习时长 `/attendance/checkins` / `/attendance/study-sessions`
**目标**  
把“设备记录”转换成可读的学生行为数据。

**签到页块**
- 日期筛选
- 学生筛选
- 设备筛选
- 签到表格：签到时间 / 离校时间 / 时长 / 状态

**学习时长页块**
- 学生筛选
- 学科筛选
- 日期范围
- 表格：学生 / 日期 / 学科 / 开始 / 结束 / 分钟数 / 设备
- 右侧统计卡：总时长 / 平均时长 / 学科分布

**接口**
- `GET /attendance/checkins`
- `POST /attendance/checkins`
- `GET /attendance/study-sessions`
- `POST /attendance/study-sessions`

---

### 3.13 预警中心 `/alerts`
**目标**  
把所有需要处理的风险集中，而不是散落在各页面。

**筛选**
- 预警类型
- 预警等级
- 状态
- 学生
- 教师
- 日期范围

**表格列**
- 类型
- 等级
- 学生/账单
- 标题
- 来源模块
- 创建时间
- 当前状态
- 操作

**操作**
- 查看来源记录
- 指派任务
- 关闭预警

**接口**
- `GET /alerts`
- `POST /alerts/{alertId}/resolve`

---

### 3.14 设置中心 `/settings/reference-data` / `/settings/habit-rubrics`
**目标**  
保证系统关键规则可配置、可版本化。

**基础字典页**
- 年级
- 科目
- 错因标签
- 收费项目

**评分规则页**
- 规则名称 / 版本
- 维度列表
- 权重
- 默认规则切换

**接口**
- `GET /settings/subjects`
- `GET /settings/error-tags`
- `GET /settings/habit-rubrics`
- `GET /settings/fee-items`

## 4. 页面级通用验收清单
每个页面都要满足：
- 有加载态
- 有空态
- 有错误态
- 提交按钮防重复点击
- 关键变更有成功提示
- 表单字段有前端校验
- 角色无权限时展示禁止访问页
- 支持桌面端 1440 宽布局优先

## 5. 给大模型生成前端页面的提示词建议
```text
请基于 08_page_prototypes.md 与 07_api_contract.md，为 Next.js 15 + TypeScript + shadcn/ui 生成页面。
要求：
1. 路由按文档一致
2. 页面包含 loading/empty/error state
3. 列表页使用服务端分页
4. 表单使用 React Hook Form + Zod
5. 所有状态标签颜色统一
6. 组件尽量复用 PageHeader / FilterBar / DataTable / EntityHeaderCard
```
