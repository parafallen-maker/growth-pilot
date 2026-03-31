'use server';

import { revalidatePath } from 'next/cache';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { redirect } from 'next/navigation';
import { studentService } from '@/services/students-service';

function bounce(params: Record<string, string>): never {
  redirect(`/students?${new URLSearchParams(params).toString()}`);
}

function parseTags(value: FormDataEntryValue | null) {
  return String(value ?? '')
    .split(/[，,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function createStudent(formData: FormData) {
  try {
    const payload = {
      studentNo: String(formData.get('studentNo') ?? '').trim(),
      name: String(formData.get('name') ?? '').trim(),
      gender: String(formData.get('gender') ?? '').trim() || undefined,
      birthDate: String(formData.get('birthDate') ?? '').trim() || undefined,
      schoolName: String(formData.get('schoolName') ?? '').trim() || undefined,
      gradeLabel: String(formData.get('gradeLabel') ?? '').trim(),
      className: String(formData.get('className') ?? '').trim() || undefined,
      familyId: String(formData.get('familyId') ?? '').trim() || undefined,
      profileNotes: String(formData.get('profileNotes') ?? '').trim() || undefined,
      tags: parseTags(formData.get('tags')),
    };

    if (!payload.studentNo || !payload.name || !payload.gradeLabel) {
      bounce({ error: '学生编号、姓名、年级必填' });
    }

    const created = await studentService.create(payload);
    revalidatePath('/students');
    bounce({ created: created.studentNo ?? created.id });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    bounce({ error: error instanceof Error ? error.message : '新建学生失败' });
  }
}

export async function updateStudentStatus(studentId: string, status: string) {
  try {
    await studentService.update(studentId, { status });
    revalidatePath('/students');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '更新失败' };
  }
}

export async function updateStudent(studentId: string, formData: FormData) {
  try {
    const payload: Record<string, string> = {};
    const name = String(formData.get('name') ?? '').trim();
    const gradeLabel = String(formData.get('gradeLabel') ?? '').trim();
    const gender = String(formData.get('gender') ?? '').trim();
    const status = String(formData.get('status') ?? '').trim();
    const familyId = String(formData.get('familyId') ?? '').trim();
    const className = String(formData.get('className') ?? '').trim();
    const schoolName = String(formData.get('schoolName') ?? '').trim();
    const profileNotes = String(formData.get('profileNotes') ?? '').trim();

    if (name) payload.name = name;
    if (gradeLabel) payload.gradeLabel = gradeLabel;
    if (gender) payload.gender = gender;
    if (status) payload.status = status;
    if (familyId) payload.familyId = familyId;

    // For extra fields not in PATCH DTO, skip them
    await studentService.update(studentId, payload);
    revalidatePath(`/students/${studentId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '更新失败' };
  }
}
