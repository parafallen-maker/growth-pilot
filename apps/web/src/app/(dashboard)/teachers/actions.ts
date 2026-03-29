'use server';

import { revalidatePath } from 'next/cache';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { redirect } from 'next/navigation';
import { teacherService } from '@/services/teachers-service';

function bounce(params: Record<string, string>): never {
  redirect(`/teachers?${new URLSearchParams(params).toString()}`);
}

export async function createTeacher(formData: FormData) {
  try {
    const payload = {
      campusId: String(formData.get('campusId') ?? '').trim(),
      employeeNo: String(formData.get('employeeNo') ?? '').trim(),
      name: String(formData.get('name') ?? '').trim(),
      mobile: String(formData.get('mobile') ?? '').trim() || undefined,
      email: String(formData.get('email') ?? '').trim() || undefined,
      hireDate: String(formData.get('hireDate') ?? '').trim() || undefined,
      leadSubject: String(formData.get('leadSubject') ?? '').trim() || undefined,
      status: String(formData.get('status') ?? '').trim() || 'active',
    };

    if (!payload.campusId || !payload.employeeNo || !payload.name) {
      bounce({ error: '校区、工号、姓名必填' });
    }

    const created = await teacherService.create(payload);
    revalidatePath('/teachers');
    bounce({ created: created.employeeNo ?? created.id });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    bounce({ error: error instanceof Error ? error.message : '新建教师失败' });
  }
}
