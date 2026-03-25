'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { studentService } from '@/services/students-service';

function bounce(params: Record<string, string>) {
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
    bounce({ error: error instanceof Error ? error.message : '新建学生失败' });
  }
}
