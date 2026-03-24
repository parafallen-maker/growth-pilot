# 06 API 文档

> 本文档是给工程实现和联调用的摘要版；精确 schema 见 `07_OpenAPI.yaml`。

## 1. 统一约定

### Base URL
```text
/api/v1
```

### 认证
- `Authorization: Bearer <access_token>`
- 登录返回 `accessToken` + `refreshToken`

### 响应包结构
```json
{
  "code": "OK",
  "message": "success",
  "data": {},
  "traceId": "req_xxx"
}
```

### 分页结构
```json
{
  "list": [],
  "page": {
    "pageNo": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

### 通用查询参数
- `keyword`
- `campusId`
- `termId`
- `teacherId`
- `grade`
- `status`
- `dateFrom`
- `dateTo`
- `pageNo`
- `pageSize`
- `sortBy`
- `sortOrder`

### 幂等要求
以下接口必须支持幂等头 `Idempotency-Key`：
- 记录支付
- 记录退款
- 设备签到写入
- AI 分析任务创建
- 批量导入任务创建

## 2. 接口分组总览

| TAG | METHOD | PATH | 用途 |
|---|---|---|---|
| auth | POST | `/auth/login` | 登录 |
| auth | POST | `/auth/refresh` | 刷新 token |
| settings | GET | `/settings/campuses` | 校区列表 |
| settings | GET | `/settings/terms` | 学期列表 |
| settings | GET | `/settings/dictionaries` | 字典列表 |
| users | GET | `/users` | 用户列表 |
| users | POST | `/users` | 创建用户 |
| users | POST | `/users/{userId}/roles` | 绑定角色 |
| teachers | GET | `/teachers` | 教师列表 |
| teachers | POST | `/teachers` | 创建教师 |
| teachers | GET | `/teachers/{teacherId}` | 教师详情 |
| teachers | POST | `/teachers/{teacherId}/development-records` | 教师发展记录 |
| students | GET | `/students` | 学生列表 |
| students | POST | `/students` | 创建学生主档 |
| students | GET | `/students/{studentId}` | 学生详情 |
| students | GET | `/students/{studentId}/360` | 学生 360 |
| students | POST | `/students/{studentId}/enrollments` | 创建在读档 |
| students | POST | `/students/import` | 导入任务 |
| families | GET | `/families` | 家庭列表 |
| families | POST | `/families` | 创建家庭 |
| families | GET | `/families/{familyId}` | 家庭详情 |
| families | POST | `/families/{familyId}/guardians` | 创建监护人 |
| families | POST | `/families/{familyId}/tasks` | 创建家庭任务 |
| homework | GET | `/homework/submissions` | 作业列表 |
| homework | POST | `/homework/submissions` | 上传作业 |
| homework | POST | `/homework/submissions/{submissionId}/analyze` | 创建 AI 分析任务 |
| homework | POST | `/homework/submissions/{submissionId}/review` | 提交教师复核 |
| homework | GET | `/homework/error-taxonomies` | 错因词典 |
| growth | GET | `/growth/observations` | 观察记录列表 |
| growth | POST | `/growth/observations` | 新建成长观察 |
| growth | GET | `/growth/goals` | 成长目标列表 |
| growth | POST | `/growth/goals` | 新建成长目标 |
| growth | POST | `/growth/goals/{goalId}/checkins` | 目标跟进 |
| growth | GET | `/growth/reports` | 成长报告列表 |
| growth | POST | `/growth/reports/generate` | 生成报告草稿 |
| attendance | GET | `/attendance/events` | 签到列表 |
| attendance | POST | `/attendance/events` | 写入签到 |
| attendance | GET | `/attendance/devices` | 设备列表 |
| attendance | POST | `/attendance/devices/bindings` | 绑定设备 |
| attendance | GET | `/attendance/homework-time/daily-stats` | 作业时长统计 |
| billing | GET | `/billing/products` | 产品列表 |
| billing | POST | `/billing/products` | 创建产品 |
| billing | GET | `/billing/contracts` | 合同列表 |
| billing | POST | `/billing/contracts` | 创建合同 |
| billing | GET | `/billing/invoices` | 账单列表 |
| billing | POST | `/billing/invoices` | 创建账单 |
| billing | POST | `/billing/invoices/{invoiceId}/payments` | 记录支付 |
| billing | POST | `/billing/payments/{paymentId}/refunds` | 记录退款 |
| billing | GET | `/billing/renewals` | 续费任务列表 |
| communication | GET | `/communication/records` | 沟通记录列表 |
| communication | POST | `/communication/records` | 新建沟通记录 |
| communication | GET | `/communication/messages` | 外发消息列表 |
| communication | POST | `/communication/messages` | 创建消息 |
| analytics | GET | `/analytics/overview` | 校区总览 |
| analytics | GET | `/analytics/teaching` | 教学看板 |
| analytics | GET | `/analytics/billing` | 收费看板 |
| jobs | GET | `/jobs/{jobId}` | 查询异步任务 |

## 3. 核心写接口示例

## 3.1 创建学生主档
`POST /students`

```json
{
  "studentNo": "S2026030001",
  "name": "胡洛菲",
  "gender": "female",
  "birthDate": "2018-06-12",
  "gradeLabel": "一年级",
  "schoolName": "xx小学",
  "familyId": "uuid",
  "photoFileId": "uuid",
  "tags": ["新生", "需跟作业"],
  "outsideCourses": [
    {
      "subject": "英语",
      "institutionName": "外部机构A"
    }
  ]
}
```

## 3.2 创建在读档
`POST /students/{studentId}/enrollments`

```json
{
  "campusId": "uuid",
  "termId": "uuid",
  "primaryTeacherId": "uuid",
  "groupId": "uuid",
  "enrollDate": "2026-03-02",
  "status": "active"
}
```

## 3.3 上传作业
`POST /homework/submissions`

```json
{
  "studentId": "uuid",
  "campusId": "uuid",
  "termId": "uuid",
  "teacherId": "uuid",
  "subject": "math",
  "homeworkDate": "2026-03-23",
  "fileIds": ["uuid1", "uuid2"],
  "sourceType": "teacher_upload",
  "remark": "晚自习作业"
}
```

返回：
```json
{
  "code": "OK",
  "message": "success",
  "data": {
    "submissionId": "uuid",
    "submissionNo": "HW202603230001",
    "aiStatus": "pending"
  }
}
```

## 3.4 触发 AI 分析
`POST /homework/submissions/{submissionId}/analyze`

```json
{
  "force": false,
  "provider": "doubao",
  "modelName": "vision-v1",
  "promptVersion": "homework-review-v3"
}
```

返回：
```json
{
  "data": {
    "jobId": "uuid",
    "status": "queued"
  }
}
```

## 3.5 提交教师复核
`POST /homework/submissions/{submissionId}/review`

```json
{
  "reviewResult": "adjusted",
  "finalAccuracyPct": 85.0,
  "finalErrorItems": [
    {
      "errorTaxonomyId": "uuid",
      "weight": 2,
      "note": "第二大题理解偏差"
    }
  ],
  "finalErrorSummary": "概念混淆、审题偏差",
  "finalSuggestion": "本周重点复习轴对称图形，先圈关键词再作答。",
  "publishToFamily": true
}
```

## 3.6 新建成长观察
`POST /growth/observations`

```json
{
  "studentId": "uuid",
  "termId": "uuid",
  "teacherId": "uuid",
  "templateId": "uuid",
  "observationDate": "2026-03-23",
  "scene": "after_class_homework",
  "scores": [
    {
      "dimensionId": "uuid",
      "score": 4,
      "note": "基本能保持专注"
    },
    {
      "dimensionId": "uuid",
      "score": 2,
      "note": "仍会直接索要答案"
    }
  ],
  "strengths": "愿意订正",
  "improvementNotes": "需要先独立思考 3 分钟",
  "publishToFamily": false
}
```

## 3.7 创建合同
`POST /billing/contracts`

```json
{
  "contractNo": "CT2026030001",
  "campusId": "uuid",
  "familyId": "uuid",
  "studentId": "uuid",
  "signDate": "2026-03-23",
  "startDate": "2026-03-25",
  "endDate": "2026-06-30",
  "items": [
    {
      "productId": "uuid",
      "itemName": "托管 + 作业辅导",
      "unitPriceCents": 380000,
      "quantity": 1
    }
  ],
  "discountAmountCents": 20000,
  "remark": "新生优惠"
}
```

## 3.8 记录支付
`POST /billing/invoices/{invoiceId}/payments`

```json
{
  "paymentNo": "PM202603230001",
  "paidAmountCents": 360000,
  "paymentTime": "2026-03-23T10:00:00+08:00",
  "channel": "wechat",
  "transactionNo": "wx_xxx",
  "remark": "家长微信转账"
}
```

## 3.9 创建家长消息
`POST /communication/messages`

```json
{
  "templateId": "uuid",
  "familyId": "uuid",
  "studentId": "uuid",
  "channel": "wechat",
  "subject": "本周成长简报",
  "body": "已生成的消息正文",
  "scheduledAt": "2026-03-23T19:30:00+08:00"
}
```

## 4. 异步任务接口

### 任务创建来源
- AI 作业分析
- 报告草稿生成
- 历史表导入
- 批量消息发送

### 查询任务
`GET /jobs/{jobId}`

返回：
```json
{
  "data": {
    "jobId": "uuid",
    "jobType": "homework_analysis",
    "bizType": "homework_submission",
    "bizId": "uuid",
    "status": "running",
    "progress": 65,
    "result": null,
    "errorMessage": null
  }
}
```

## 5. 错误码建议

| 错误码 | 含义 |
|---|---|
| `AUTH_401` | 未登录或 token 失效 |
| `AUTH_403` | 无权限 |
| `REQ_400` | 参数错误 |
| `DATA_404` | 资源不存在 |
| `DATA_409` | 唯一约束冲突 |
| `FLOW_409` | 状态流转非法 |
| `FILE_413` | 文件过大 |
| `AI_503` | 模型服务不可用 |
| `PAY_409` | 支付重复提交 |
| `JOB_409` | 同类任务已存在 |

## 6. 前后端联调顺序

1. auth / settings
2. students / families / teachers
3. homework
4. growth
5. attendance
6. billing
7. communication
8. analytics

## 7. 强约束

- OpenAPI 是接口定义唯一真源
- 任何字段名变更必须同步 DDL、DTO、OpenAPI、前端表单
- 列表接口统一返回分页结构
- 详情接口不混入列表统计；统计走单独聚合字段或看板接口
