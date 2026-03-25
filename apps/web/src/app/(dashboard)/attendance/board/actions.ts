'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireCurrentUser } from '@/lib/current-user';
import { attendanceService } from '@/services/attendance-service';

function bounce(params: Record<string, string>) {
  redirect(`/attendance/board?${new URLSearchParams(params).toString()}`);
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

export async function createAttendanceBoardEvent(formData: FormData) {
  try {
    const currentUser = await requireCurrentUser();
    const campusId = String(formData.get('campusId') ?? '').trim() || currentUser.campusIds[0] || '';
    if (!campusId) {
      throw new Error('当前账号没有默认校区，请先填写有效 campusId');
    }
    const created = await attendanceService.createEvent({
      studentId: String(formData.get('studentId') ?? '').trim(),
      campusId,
      deviceId: String(formData.get('deviceId') ?? '').trim() || undefined,
      eventType: String(formData.get('eventType') ?? '').trim(),
      eventTime: parseDateTime(formData.get('eventTime')) ?? '',
      operatorUserId: currentUser.id,
      remark: String(formData.get('remark') ?? '').trim() || undefined,
    });

    revalidatePath('/attendance/board');
    bounce({ created: created.id, replayed: created.replayed ? '1' : '0' });
  } catch (error) {
    bounce({ error: error instanceof Error ? error.message : '创建出勤事件失败' });
  }
}
