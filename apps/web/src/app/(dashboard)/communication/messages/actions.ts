'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { communicationService } from '@/services/communication-service';

function bounce(params: Record<string, string>) {
  redirect(`/communication/messages?${new URLSearchParams(params).toString()}`);
}

function parseDateTime(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  if (!text) return undefined;
  const normalized = text.length === 16 ? `${text}:00` : text;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('请输入合法的日期时间');
  }
  return parsed.toISOString();
}

export async function createCommunicationTemplate(formData: FormData) {
  try {
    const variables = String(formData.get('variables') ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const created = await communicationService.createTemplate({
      code: String(formData.get('code') ?? '').trim(),
      name: String(formData.get('name') ?? '').trim(),
      channel: String(formData.get('channel') ?? '').trim(),
      subject: String(formData.get('subject') ?? '').trim() || undefined,
      bodyTemplate: String(formData.get('bodyTemplate') ?? '').trim(),
      variables: variables.length ? variables : undefined,
      status: String(formData.get('status') ?? '').trim() || undefined,
    });

    revalidatePath('/communication/messages');
    bounce({ templateCreated: created.id, code: created.code });
  } catch (error) {
    bounce({ error: error instanceof Error ? error.message : '创建消息模板失败' });
  }
}

export async function createCommunicationMessageTask(formData: FormData) {
  try {
    const created = await communicationService.createMessageTask({
      templateId: String(formData.get('templateId') ?? '').trim() || undefined,
      familyId: String(formData.get('familyId') ?? '').trim() || undefined,
      studentId: String(formData.get('studentId') ?? '').trim() || undefined,
      channel: String(formData.get('channel') ?? '').trim(),
      subject: String(formData.get('subject') ?? '').trim() || undefined,
      body: String(formData.get('body') ?? '').trim() || undefined,
      scheduledAt: parseDateTime(formData.get('scheduledAt')),
      status: (String(formData.get('status') ?? '').trim() || undefined) as 'draft' | 'pending' | 'sent' | 'failed' | 'read' | undefined,
      failureReason: String(formData.get('failureReason') ?? '').trim() || undefined,
    });

    revalidatePath('/communication/messages');
    bounce({ taskCreated: created.id, status: created.status });
  } catch (error) {
    bounce({ error: error instanceof Error ? error.message : '创建消息任务失败' });
  }
}

export async function updateCommunicationMessageTaskStatus(formData: FormData) {
  const taskId = String(formData.get('taskId') ?? '').trim();
  if (!taskId) {
    bounce({ error: '请选择消息任务' });
  }

  try {
    const updated = await communicationService.updateMessageTaskStatus(taskId, {
      status: String(formData.get('status') ?? '').trim(),
      failureReason: String(formData.get('failureReason') ?? '').trim() || undefined,
      sentAt: parseDateTime(formData.get('sentAt')),
    });

    revalidatePath('/communication/messages');
    bounce({ taskUpdated: updated.id, status: updated.status });
  } catch (error) {
    bounce({ error: error instanceof Error ? error.message : '更新消息任务状态失败' });
  }
}
