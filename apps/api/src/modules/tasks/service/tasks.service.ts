import { Injectable } from '@nestjs/common';
import { normalizePage } from '../../../common/base-list-query.dto';
import type { PageResult } from '../../../common/api-response';
import { TaskQueryDto } from '../dto/task-query.dto';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TasksRepository } from '../repository/tasks.repository';
import type { Task } from '@growthpilot/schema/index';

@Injectable()
export class TasksService {
  constructor(private readonly tasksRepository: TasksRepository) {}

  async list(query: TaskQueryDto): Promise<PageResult<Task>> {
    const { pageNo, pageSize } = normalizePage(query);
    const filtered = (await this.tasksRepository.listTasks()).filter((item) => {
      if (query.ownerUserId && item.ownerUserId !== query.ownerUserId) return false;
      if (query.studentId && item.studentId !== query.studentId) return false;
      if (query.familyId && item.familyId !== query.familyId) return false;
      if (query.teacherId && item.teacherId !== query.teacherId) return false;
      if (query.taskType && item.taskType !== query.taskType) return false;
      if (query.priority && item.priority !== query.priority) return false;
      if (query.status && item.status !== query.status) return false;
      if (query.dateFrom && ((item.dueAt ?? item.createdAt).slice(0, 10) < query.dateFrom)) return false;
      if (query.dateTo && ((item.dueAt ?? item.createdAt).slice(0, 10) > query.dateTo)) return false;
      if (query.keyword) {
        const keyword = query.keyword.toLowerCase();
        const haystack = [item.title, item.description, item.taskType, item.ownerUserId, item.resultNote].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(keyword);
      }
      return true;
    });

    const sorted = [...filtered].sort((left, right) => {
      const leftTime = left.dueAt ?? left.createdAt;
      const rightTime = right.dueAt ?? right.createdAt;
      return query.sortOrder === 'asc' ? leftTime.localeCompare(rightTime) : rightTime.localeCompare(leftTime);
    });

    const start = (pageNo - 1) * pageSize;
    return { list: sorted.slice(start, start + pageSize), page: { pageNo, pageSize, total: sorted.length } };
  }

  create(payload: CreateTaskDto) {
    return this.tasksRepository.createTask({
      taskType: payload.taskType,
      ownerUserId: payload.ownerUserId,
      title: payload.title,
      description: payload.description,
      priority: (payload.priority as any) ?? 'medium',
      dueAt: payload.dueAt,
      sourceType: payload.sourceType,
      sourceId: payload.sourceId,
      studentId: payload.studentId,
      familyId: payload.familyId,
      teacherId: payload.teacherId,
      resultNote: payload.resultNote,
      status: (payload.status as any) ?? 'open',
    });
  }

  update(taskId: string, payload: UpdateTaskDto) {
    return this.tasksRepository.updateTask(taskId, {
      status: payload.status,
      resultNote: payload.resultNote,
    });
  }
}
