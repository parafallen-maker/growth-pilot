'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireCurrentUser } from '@/lib/current-user';
import { attendanceService } from '@/services/attendance-service';

function bounce(params: Record<string, string>) {
  redirect(`/attendance/devices?${new URLSearchParams(params).toString()}`);
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

export async function createAttendanceDevice(formData: FormData) {
  try {
    const created = await attendanceService.createDevice({
      campusId: String(formData.get('campusId') ?? '').trim() || undefined,
      serialNo: String(formData.get('serialNo') ?? '').trim(),
      deviceType: String(formData.get('deviceType') ?? '').trim() || undefined,
      status: String(formData.get('status') ?? '').trim() || undefined,
      note: String(formData.get('note') ?? '').trim() || undefined,
    });

    revalidatePath('/attendance/devices');
    bounce({ deviceCreated: created.serialNo ?? created.id, status: created.status });
  } catch (error) {
    bounce({ error: error instanceof Error ? error.message : '创建设备失败' });
  }
}

export async function createAttendanceBinding(formData: FormData) {
  try {
    const currentUser = await requireCurrentUser();
    const created = await attendanceService.createBinding({
      studentId: String(formData.get('studentId') ?? '').trim(),
      deviceId: String(formData.get('deviceId') ?? '').trim(),
      status: String(formData.get('status') ?? '').trim() || undefined,
      boundAt: parseDateTime(formData.get('boundAt')),
      createdBy: currentUser.id,
    });

    revalidatePath('/attendance/devices');
    bounce({ bindingCreated: created.id, status: created.status });
  } catch (error) {
    bounce({ error: error instanceof Error ? error.message : '创建绑定失败' });
  }
}

export async function updateAttendanceBinding(formData: FormData) {
  const bindingId = String(formData.get('bindingId') ?? '').trim();
  if (!bindingId) {
    bounce({ error: '请选择绑定记录' });
  }

  try {
    const updated = await attendanceService.updateBinding(bindingId, {
      status: String(formData.get('status') ?? '').trim() || undefined,
      unboundAt: parseDateTime(formData.get('unboundAt')),
    });

    revalidatePath('/attendance/devices');
    bounce({ bindingUpdated: updated.id, status: updated.status });
  } catch (error) {
    bounce({ error: error instanceof Error ? error.message : '更新绑定失败' });
  }
}
