# GrowthPilot v2 — 技术规格书 (Technical Specification)

> 作者：鸽鸽 | 日期：2026-04-05 | 状态：Draft
> 关联文档：PRD.md, Roadmap.md

---

## 1. 技术选型（沿袭 + 修正）

### 1.1 保留选型

| 层 | 技术 | 版本 | 理由 |
|----|------|------|------|
| 前端 | Next.js + React | 15.x / 19.x | 已有代码基础，SSR 支持 |
| 后端 | NestJS | 11.x | 模块化好，装饰器生态完善 |
| 数据库 | PostgreSQL | 16 | 关系型适合教育领域复杂实体 |
| 缓存 | Redis | 7 | 会话、Rate Limit、队列 |
| 对象存储 | MinIO | latest→锁定版本 | 文件/图片存储 |
| 容器 | Docker Compose | - | 当前规模足够 |
| 包管理 | npm workspaces | 10.x | monorepo |

### 1.2 新增/修正

| 变更 | 说明 |
|------|------|
| **Tailwind CSS** | 替代内联样式，统一设计系统 |
| **React Query (TanStack Query)** | 前端数据层，替代手动 fetch+state |
| **锁定 MinIO 版本** | `minio/minio:RELEASE.2026-03-xx` |
| **Zod** | 前后端共享 Schema 校验（替代 DTO 手写） |
| **pnpm 考虑** | npm workspaces 性能瓶颈时迁移 |

### 1.3 包结构调整

```
growth-pilot/
├── apps/
│   ├── web/              # Next.js 前端
│   │   ├── src/
│   │   │   ├── app/              # 路由 (App Router)
│   │   │   │   ├── (today)/      # 🆕 今日工作台
│   │   │   │   ├── (children)/   # 🆕 孩子成长档案
│   │   │   │   ├── (weekly)/     # 🆕 周报引擎
│   │   │   │   ├── (ops)/        # 运营管理
│   │   │   │   └── (auth)/       # 登录
│   │   │   ├── components/
│   │   │   │   ├── growth/       # 🆕 成长相关组件
│   │   │   │   ├── today/        # 🆕 今日工作台组件
│   │   │   │   └── weekly/       # 🆕 周报组件
│   │   │   ├── lib/
│   │   │   │   ├── hooks/        # 🆕 React Query hooks
│   │   │   │   └── analysis/     # 🆕 前端关联分析工具
│   │   │   └── styles/           # 🆕 Tailwind 设计系统
│   │   └── tailwind.config.ts
│   └── api/              # NestJS 后端
│       └── src/
│           ├── modules/
│           │   ├── today/         # 🆕 今日工作台聚合服务
│           │   ├── children/      # 🆕 孩子成长档案聚合服务
│           │   ├── weekly-digest/ # 🆕 周报引擎
│           │   ├── analysis/      # 🆕 跨维度关联分析
│           │   ├── homework/      # 保留，增强
│           │   ├── growth/        # 保留，增强
│           │   ├── billing/       # 保留
│           │   ├── students/      # 保留，重构
│           │   └── ...            # 其他保留
│           └── shared/
│               ├── analysis/      # 🆕 分析引擎（关联分析、趋势检测）
│               └── digest/        # 🆕 周报生成器
└── packages/
    ├── ui/               # 共享 UI 组件（Tailwind 重写）
    ├── schema/           # 🆕 Zod Schema（替代手写 DTO）
    └── config/           # 保留
```

---

## 2. 数据模型（增量变更）

### 2.1 新增核心表

```sql
-- 成长计划（替代原有静态 goals）
CREATE TABLE growth_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES students(id),
  title       TEXT NOT NULL,
  description TEXT,
  success_criteria TEXT,
  status      TEXT NOT NULL DEFAULT 'active' 
              CHECK (status IN ('active','paused','completed','abandoned')),
  progress    SMALLINT DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  target_date DATE,
  completed_at TIMESTAMPTZ,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 成长计划动作（可执行的干预措施）
CREATE TABLE growth_plan_actions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID NOT NULL REFERENCES growth_plans(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('daily_practice','observation','parent_comm','adjustment')),
  description TEXT NOT NULL,
  frequency   TEXT CHECK (frequency IN ('daily','weekly','as_needed')),
  status      TEXT NOT NULL DEFAULT 'pending' 
              CHECK (status IN ('pending','active','done','skipped')),
  executed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 周报（自动化引擎核心表）
CREATE TABLE weekly_digests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES students(id),
  week_start  DATE NOT NULL,
  week_end    DATE NOT NULL,
  
  -- 自动生成的各板块
  homework_summary   JSONB,     -- 作业表现摘要
  habit_summary      JSONB,     -- 习惯观察摘要
  attendance_summary JSONB,     -- 考勤/时长摘要
  alerts_summary     JSONB,     -- 预警摘要
  cross_analysis     JSONB,     -- 🆕 跨维度关联发现
  family_suggestion  TEXT,      -- 家庭配合建议
  teacher_comment    TEXT,      -- 教师评语（待填）
  
  status      TEXT NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft','reviewed','approved','sent')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  sent_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(student_id, week_start)
);

-- 跨维度分析信号
CREATE TABLE analysis_signals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES students(id),
  signal_type TEXT NOT NULL,     -- e.g., 'academic_habit_correlation', 'engagement_drop'
  severity    TEXT NOT NULL CHECK (severity IN ('info','watch','concern','critical')),
  dimensions  JSONB NOT NULL,    -- 涉及的维度 {'homework':true,'habit':true}
  evidence    JSONB NOT NULL,    -- 支撑数据
  suggestion  TEXT,              -- 建议动作
  acknowledged BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days')
);

-- 观察提示规则
CREATE TABLE observation_prompts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES students(id),
  prompt_type TEXT NOT NULL,     -- 'habit', 'emotion', 'academic', 'family'
  reason      TEXT NOT NULL,
  priority    SMALLINT DEFAULT 5,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','done','dismissed')),
  teacher_id  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
```

### 2.2 已有表增强

```sql
-- homework_reviews 增加关联分析字段
ALTER TABLE homework_reviews ADD COLUMN IF NOT EXISTS
  cross_signals JSONB;  -- 本次复核触发的关联信号

-- growth_observations 增加来源追踪
ALTER TABLE growth_observations ADD COLUMN IF NOT EXISTS
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual','prompted','auto'));
ALTER TABLE growth_observations ADD COLUMN IF NOT EXISTS
  prompt_id UUID REFERENCES observation_prompts(id);

-- students 增加成长摘要缓存
ALTER TABLE students ADD COLUMN IF NOT EXISTS
  growth_snapshot JSONB;  -- 最新成长快照（每周更新）
```

---

## 3. API 设计（增量）

### 3.1 新增聚合 API

```
# 今日工作台（聚合）
GET  /api/v1/today
  → { pending_reviews, observation_prompts, alerts, completed_today }

# 孩子成长档案（聚合）
GET  /api/v1/children/:id/profile
  → { student, growth_trends, active_plans, recent_homework, family_context, signals }

GET  /api/v1/children/:id/timeline
  → { events: [...homework, observations, communications, billing...按时间线] }

# 跨维度分析
GET  /api/v1/analysis/:studentId/signals
POST /api/v1/analysis/refresh/:studentId    -- 重新计算分析信号

# 周报引擎
GET  /api/v1/weekly-digest/current          -- 当前周报列表
GET  /api/v1/weekly-digest/:studentId       -- 单个学生周报
POST /api/v1/weekly-digest/generate         -- 批量生成本周草稿
PATCH /api/v1/weekly-digest/:id             -- 审阅修改
POST /api/v1/weekly-digest/:id/approve      -- 批准发送
POST /api/v1/weekly-digest/batch-send       -- 批量发送

# 成长计划
CRUD /api/v1/growth-plans
CRUD /api/v1/growth-plans/:id/actions
PATCH /api/v1/growth-plans/:id/progress     -- 更新进度

# 观察提示
GET  /api/v1/observation-prompts            -- 待处理提示
POST /api/v1/observation-prompts/:id/complete
POST /api/v1/observation-prompts/:id/dismiss
```

### 3.2 响应格式保持

```json
{
  "code": "OK",
  "message": "success",
  "data": { ... },
  "traceId": "uuid"
}
```

错误保持：
- `AUTH_401` / `AUTH_403`
- `DATA_404` / `DATA_422` / `DATA_409`
- `SYS_500`
- `FLOW_429`

---

## 4. 核心算法

### 4.1 关联分析引擎

```typescript
interface AnalysisInput {
  studentId: string;
  dateRange: { from: Date; to: Date };
  homework: HomeworkSummary[];
  observations: ObservationSummary[];
  attendance: AttendanceSummary[];
}

interface AnalysisSignal {
  type: string;
  severity: 'info' | 'watch' | 'concern' | 'critical';
  dimensions: string[];
  evidence: Record<string, unknown>;
  suggestion: string;
}

// 规则引擎（可配置，非硬编码）
const RULES: AnalysisRule[] = [
  {
    id: 'academic_habit_correlation',
    trigger: (input) => {
      const hwTrend = calcTrend(input.homework.map(h => h.accuracy));
      const habitTrend = calcTrend(input.observations.map(o => o.totalScore));
      return hwTrend.direction === 'down' && habitTrend.direction === 'down';
    },
    severity: 'concern',
    suggestion: '学业和习惯同时下降，建议先了解情绪和家庭因素',
  },
  {
    id: 'engagement_drop',
    trigger: (input) => {
      const recentDuration = avg(input.attendance.slice(-7).map(a => a.durationMinutes));
      const baseline = avg(input.attendance.map(a => a.durationMinutes));
      return recentDuration < baseline * 0.6;
    },
    severity: 'watch',
    suggestion: '学习时长近期明显缩短，确认是否有外因',
  },
  // ... 更多规则可扩展
];
```

### 4.2 周报生成器

```typescript
async function generateWeeklyDigest(studentId: string, weekStart: Date): Promise<DigestDraft> {
  const [homework, observations, attendance, alerts, plans] = await Promise.all([
    getHomeworkForWeek(studentId, weekStart),
    getObservationsForWeek(studentId, weekStart),
    getAttendanceForWeek(studentId, weekStart),
    getActiveAlerts(studentId),
    getActiveGrowthPlans(studentId),
  ]);

  const signals = await runAnalysisEngine(studentId, weekStart);

  return {
    homeworkSummary: summarizeHomework(homework),
    habitSummary: summarizeHabits(observations),
    attendanceSummary: summarizeAttendance(attendance),
    alertsSummary: summarizeAlerts(alerts),
    crossAnalysis: formatSignals(signals),
    familySuggestion: generateFamilySuggestion(homework, observations, signals, plans),
    teacherComment: null,  // 待教师填写
  };
}
```

### 4.3 观察提示生成

```typescript
async function generateObservationPrompts(campusId: string): Promise<Prompt[]> {
  const students = await getActiveStudents(campusId);
  const prompts: Prompt[] = [];

  for (const student of students) {
    // 规则 1：作业正确率连续下降
    const hwTrend = await getHomeworkTrend(student.id, 7);
    if (hwTrend.direction === 'down' && hwTrend.changePercent > 15) {
      prompts.push({
        studentId: student.id,
        promptType: 'academic',
        reason: `作业正确率 7 日内下降 ${hwTrend.changePercent}%`,
        priority: 7,
      });
    }

    // 规则 2：习惯评分骤变
    const habitDelta = await getLatestHabitDelta(student.id);
    if (Math.abs(habitDelta) > 1.0) {
      prompts.push({
        studentId: student.id,
        promptType: 'emotion',
        reason: `习惯评分较上次${habitDelta > 0 ? '上升' : '下降'} ${Math.abs(habitDelta).toFixed(1)} 分`,
        priority: 8,
      });
    }

    // 规则 3：家庭沟通超期
    const lastComm = await getLastCommunication(student.familyId);
    if (daysSince(lastComm?.date) > 14) {
      prompts.push({
        studentId: student.id,
        promptType: 'family',
        reason: `家庭沟通已 ${daysSince(lastComm?.date)} 天未更新`,
        priority: 5,
      });
    }
  }

  return prompts.sort((a, b) => b.priority - a.priority);
}
```

---

## 5. 前端架构

### 5.1 数据层（React Query）

```typescript
// hooks/useToday.ts
export function useToday() {
  return useQuery({
    queryKey: ['today'],
    queryFn: () => api.get('/today'),
    staleTime: 30_000,  // 30秒内不重复请求
  });
}

// hooks/useChildProfile.ts
export function useChildProfile(studentId: string) {
  return useQuery({
    queryKey: ['child', studentId, 'profile'],
    queryFn: () => api.get(`/children/${studentId}/profile`),
  });
}

// hooks/useWeeklyDigest.ts
export function useWeeklyDigest(weekStart?: string) {
  return useQuery({
    queryKey: ['weekly-digest', weekStart],
    queryFn: () => api.get('/weekly-digest/current', { params: { weekStart } }),
  });
}
```

### 5.2 设计系统（Tailwind）

```typescript
// tailwind.config.ts 关键配置
module.exports = {
  theme: {
    extend: {
      colors: {
        // Memphis 主题色（保留品牌）
        'gp-yellow': '#FFE66D',
        'gp-teal': '#4ECDC4',
        'gp-coral': '#FF6B6B',
        'gp-navy': '#2C3E50',
        // 语义色
        'gp-success': '#10B981',
        'gp-warning': '#F59E0B',
        'gp-danger': '#EF4444',
        'gp-info': '#3B82F6',
      },
      fontFamily: {
        'display': ["'Space Grotesk'", "'Noto Sans SC'", 'sans-serif'],
        'body': ["'Noto Sans SC'", 'sans-serif'],
      },
    },
  },
};
```

---

## 6. 安全设计

### 6.1 保持

- JWT + Bearer Auth
- RBAC（角色：admin, teacher, finance, service_staff）
- Rate Limit
- CORS 白名单
- 输入校验（Zod）
- SQL 参数化（Drizzle ORM）

### 6.2 增强

| 项目 | 掹措 |
|------|------|
| `.env` 清理 | `git rm --cached .env`，添加 git-secrets pre-commit hook |
| Health 端点 | `GET /api/v1/health` 返回 DB/Redis/MinIO 状态 |
| 审计日志 | 核心操作写入 `audit_logs` 表 |
| 文件上传 | 文件类型白名单 + 大小限制 + 病毒扫描预留 |
| MinIO 锁版本 | `minio/minio:RELEASE.2026-03-xx` |

---

## 7. 部署架构

```
┌─────────────────────────────────────────┐
│  Nginx (reverse proxy + SSL)            │
│  ├─ / → Next.js (web)                   │
│  └─ /api → NestJS (api)                 │
├─────────────────────────────────────────┤
│  NestJS API                             │
│  ├─ /api/v1/today (聚合)                 │
│  ├─ /api/v1/children (聚合)              │
│  ├─ /api/v1/weekly-digest (周报引擎)     │
│  └─ /api/v1/... (原有 CRUD)              │
├─────────────────────────────────────────┤
│  PostgreSQL 16  │  Redis 7  │  MinIO    │
└─────────────────────────────────────────┘
```

新增定时任务（NestJS Schedule）：

| 任务 | 频率 | 说明 |
|------|------|------|
| 观察提示生成 | 每日 06:00 | 扫描所有活跃学生 |
| 周报草稿生成 | 每周一 00:00 | 自动汇总上周数据 |
| 关联分析刷新 | 每日 03:00 | 重算分析信号 |
| 成长快照更新 | 每周日 23:00 | 更新学生 growth_snapshot |
| 预警检查 | 每小时 | 收费逾期、沟通超期等 |

---

## 8. 测试策略

| 层 | 覆盖目标 | 工具 |
|----|---------|------|
| 单元测试 | 核心算法（关联分析、周报生成、提示规则）100% | Jest |
| API 集成测试 | 所有新增聚合 API | Supertest |
| E2E 测试 | 关键路径：Today→复核→观察→周报→发送 | Playwright |
| 前端测试 | 组件交互（≥10个核心组件） | React Testing Library |

---

## 9. 迁移策略（从 v1 到 v2）

### 9.1 兼容性原则

- 所有 v1 API 保持可用（不删不改）
- v2 新增 API 独立路径
- 前端路由逐步切换
- 数据库变更只用 ADD COLUMN，不删不改

### 9.2 前端双轨运行

```
过渡期：
- /today、/children/*、/weekly/* → v2 新页面
- /students/*、/billing/*、/settings/* → v1 页面
- 共享同一个 layout 和 auth
```

---

## 10. 监控指标

| 指标 | 告警阈值 |
|------|---------|
| API P95 延迟 | > 1s |
| Today 页面加载 | > 3s |
| 周报生成失败率 | > 5% |
| 数据库连接池使用率 | > 80% |
| Redis 内存使用 | > 80% |
| 磁盘使用 | > 85% |
