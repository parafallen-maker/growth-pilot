import { apiRequest } from '@/lib/api-client';
import { getAuthTokens } from '@/lib/auth-session';
import type { QueryBase, PageResult } from '@/features/shared/types';
import type { Task, TaskPriority, TaskStatus } from '@growthpilot/schema';

export type TaskQuery = QueryBase & {
  ownerUserId?: string;
  studentId?: string;
  familyId?: string;
  teacherId?: string;
  taskType?: string;
  priority?: TaskPriority | 'all';
  status?: TaskStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
};

export type TaskListItem = {
  id: string;
  title: string;
  type: string;
  priority: TaskPriority;
  status: TaskStatus;
  ownerUserId: string;
  studentId?: string | null;
  familyId?: string | null;
  teacherId?: string | null;
  dueDate: string;
  dueLabel: string;
  sourceType?: string;
  sourceId?: string | null;
  resultNote?: string | null;
  description?: string | null;
};

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'all') query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

function formatDateLabel(value?: string | null) {
  if (!value) return '未设置';
  return value.slice(0, 10);
}

function normalizeTask(task: Task): TaskListItem {
  return {
    id: task.id,
    title: task.title,
    type: task.taskType,
    priority: task.priority,
    status: task.status,
    ownerUserId: task.ownerUserId,
    studentId: task.studentId ?? null,
    familyId: task.familyId ?? null,
    teacherId: task.teacherId ?? null,
    dueDate: task.dueAt ?? task.createdAt,
    dueLabel: formatDateLabel(task.dueAt ?? task.createdAt),
    sourceType: task.sourceType,
    sourceId: task.sourceId ?? null,
    resultNote: task.resultNote ?? null,
    description: task.description ?? null,
  };
}

export const tasksService = {
  async query(params: TaskQuery = {}): Promise<PageResult<TaskListItem>> {
    const auth = await getAuthTokens();
    const result = await apiRequest<PageResult<Task>>(`/tasks${buildQuery(params)}`, {
      auth,
      retryOn401: Boolean(auth.refreshToken),
    });

    return {
      ...result,
      list: result.list.map(normalizeTask),
    };
  },

  async update(taskId: string, payload: { status?: TaskStatus; resultNote?: string }) {
    const auth = await getAuthTokens();
    return apiRequest<Task>(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: payload,
      auth,
      retryOn401: Boolean(auth.refreshToken),
    });
  },
};
