'use server';

import { revalidatePath } from 'next/cache';
import { tasksService } from '@/services/tasks-service';

export async function advanceTask(formData: FormData) {
  const taskId = String(formData.get('taskId') ?? '').trim();
  const nextStatus = String(formData.get('nextStatus') ?? '').trim();
  const resultNote = String(formData.get('resultNote') ?? '').trim() || undefined;
  const returnPath = String(formData.get('returnPath') ?? '/tasks').trim() || '/tasks';

  if (!taskId || !nextStatus) {
    throw new Error('任务参数缺失');
  }

  await tasksService.update(taskId, {
    status: nextStatus as 'in_progress' | 'done',
    resultNote,
  });

  revalidatePath('/tasks');
  revalidatePath('/tasks/list');
  if (returnPath !== '/tasks' && returnPath !== '/tasks/list') {
    revalidatePath(returnPath);
  }
}

export async function createTask(formData: FormData) {
  // TODO: integrate with backend task creation API when available
  revalidatePath('/tasks/list');
  return { success: false, error: '功能开发中，敬请期待' };
}
