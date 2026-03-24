# 22 剩余工作总 Todo

> 目的：把当前已经完成的骨架、尚未完成的真实能力、以及接下来连续推进的顺序，收成一张总表。
> 规则：这不是讨论稿，而是执行清单。进入仓库后默认自动推进，除非遇到明确阻塞。

---

## 0. 当前盘面

### 已完成（已进主线）
- [x] Wave 0：范围冻结 / DDL 校核 / API 基线 / Monorepo 骨架
- [x] Wave 1：
  - auth/settings 后端基础骨架
  - teachers/students/families 后端骨架
  - login/dashboard/主数据前端骨架
- [x] Wave 2：
  - homework 后端骨架
  - homework 前端骨架
- [x] Wave 3（部分）：
  - growth 后端骨架
  - growth 前端骨架

### 还没完成的本质问题
当前系统已经有**骨架**，但还没有把“mock 骨头”换成“真骨头”。

缺的核心不是页面数量，而是这些：
1. 真实文件上传
2. Student 360 聚合
3. 真正的 DB / repository / transaction / queue 落地
4. attendance / billing / communication / analytics 四大模块
5. migration / QA / release 收口

---

## 1. 执行顺序（强制）

后续默认按下面的顺序推进，不再来回漂：

1. **R1：主链路收口**
   - student 360
   - files upload
   - API 字段/状态机守门
2. **R2：经营闭环**
   - billing backend/frontend
   - communication backend/frontend
3. **R3：运营与数据闭环**
   - attendance backend/frontend
   - analytics backend/frontend
4. **R4：上线闭环**
   - migration
   - QA / E2E
   - backup / rollback / go-live

一句话：**先把真闭环补齐，再做漂亮闭环。**

---

## 2. R1：主链路收口（P0）

### 2.1 协议与守门
- [ ] `T-META-1`：字段一致性 / 状态机一致性总校核
  - Owner: A2
  - 产物：field diff report / state machine checklist
- [ ] `T-H1-API`：homework / growth API 守门
  - Owner: A3
  - 产物：homework_api_review / growth_api_review

### 2.2 主数据补齐
- [ ] `T-M1-3`：Student 360 聚合接口
  - Owner: A5
  - 依赖：students / families / homework / growth / billing 摘要位
  - 结果：前端不再手拼 360
- [ ] `T-M1-5`：文件上传模块与 fileId 回传
  - Owner: A4
  - 结果：homework 上传不再用假 fileId

### 2.3 基础能力真化
- [ ] auth mock session -> JWT / refresh token 持久化
  - Owner: A4
- [ ] jobs mock -> 可查询的真实 job/repository 抽象
  - Owner: A4 / A10
- [ ] homework/growth in-memory repository -> 真 repository 设计清单
  - Owner: A10

---

## 3. R2：经营闭环（P0 / P1 混合）

## 3.1 Billing（优先级最高）

### 后端
- [ ] `T-B1-1`：产品 / 合同接口
  - Owner: A7
- [ ] `T-B1-2`：账单 / 支付 / 退款事务链路
  - Owner: A7
- [ ] `T-B1-3`：续费任务接口
  - Owner: A7

### 前端
- [ ] `T-B1-FE`：产品 / 合同 / 账单支付 / 续费页面
  - Owner: A9

### 收口标准
- [ ] 合同 -> 账单 -> 支付 -> 退款 贯通
- [ ] 金额显示/传输口径统一
- [ ] family / student 过滤器复用

## 3.2 Communication

### 后端
- [ ] `T-C1-1`：沟通记录 / 模板 / 消息接口
  - Owner: A7

### 前端
- [ ] `T-C1-FE`：沟通记录 / 消息中心页面
  - Owner: A9

### 收口标准
- [ ] 消息状态可见：草稿 / 待发 / 已发 / 失败
- [ ] 周报 / 账单 / 任务通知能统一挂消息中心

---

## 4. R3：运营与数据闭环（P1）

## 4.1 Attendance

### 后端
- [ ] `T-A1-1`：设备与绑定接口
  - Owner: A6
- [ ] `T-A1-2`：签到事件接口与去重
  - Owner: A6
- [ ] `T-A1-3`：作业时长会话与日聚合
  - Owner: A6

### 前端
- [ ] `T-A1-FE`：出勤看板 / 设备绑定 / 作业时长页面
  - Owner: A9

## 4.2 Analytics

### 后端
- [ ] `T-BI1-1`：overview / teaching / billing 聚合查询
  - Owner: A7 + A10

### 前端
- [ ] `T-BI1-2`：analytics 页面与图表联通
  - Owner: A9

### 收口标准
- [ ] KPI 口径统一
- [ ] 图表支持筛选
- [ ] 无数据不画空图

---

## 5. R4：上线闭环（P0）

## 5.1 Migration
- [ ] `T-DM1-1`：staging 导入脚本与清洗规则
  - Owner: A10
- [ ] `T-DM1-2`：首批样本导入与校验报告
  - Owner: A10

## 5.2 QA / E2E / Release
- [ ] `T-QA1-1`：主流程 E2E / 集成测试 / 回归
  - Owner: A10
- [ ] `T-QA1-2`：预发上线 / 备份 / 回滚 / 发布验收
  - Owner: A10

### 必过主流程
- [ ] 登录与权限
- [ ] 学生建档闭环
- [ ] 作业 submission -> analyze -> review
- [ ] 成长 observation -> goal -> report draft
- [ ] 合同 -> 账单 -> 支付
- [ ] 首批迁移校验
- [ ] 回滚演练

---

## 6. 立即执行队列（Now / Next / Later）

## Now（立刻推进）
- [ ] A2：`T-META-1`
- [ ] A3：`T-H1-API`
- [ ] A4：`T-M1-5`
- [ ] A5：`T-M1-3`
- [ ] A7：`T-B1-1` + `T-B1-2`
- [ ] A9：`T-B1-FE`（在 A7 基础上并行铺骨架）

## Next（Now 收口后立即接）
- [ ] A7：`T-C1-1`
- [ ] A9：`T-C1-FE`
- [ ] A6：`T-A1-1` ~ `T-A1-3`
- [ ] A9：`T-A1-FE`

## Later（经营链路稳定后）
- [ ] A7/A10：`T-BI1-1`
- [ ] A9：`T-BI1-2`
- [ ] A10：`T-DM1-1` / `T-DM1-2`
- [ ] A10：`T-QA1-1` / `T-QA1-2`

---

## 7. 完成定义

一项任务只有同时满足下面 4 条，才算完成：

1. [ ] 状态改为 `done`
2. [ ] 有代码 / 文档 / 测试交付物
3. [ ] 有 commit 或已进主线
4. [ ] 下游 handoff 清楚

---

## 8. 最后一句话

**后面不再按“想起来做什么”推进，而是按这张总 Todo 连续施工，直到把 mock 项目拧成可上线项目。**
