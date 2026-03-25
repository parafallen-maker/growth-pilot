'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { communicationService } from '@/services/communication-service';

function bounce(params: Record<string, string>) {
  redirect(`/communication/records?${new URLSearchParams(params).toString()}`);
}

export async function createCommunicationRecord(formData: FormData) {
  try {
    const created = await communicationService.createRecord({
      familyId: String(formData.get('familyId') ?? '').trim() || undefined,
      studentId: String(formData.get('studentId') ?? '').trim() || undefined,
      channel: String(formData.get('channel') ?? '').trim(),
      direction: String(formData.get('direction') ?? '').trim(),
      topic: String(formData.get('topic') ?? '').trim(),
      summary: String(formData.get('summary') ?? '').trim() || undefined,
      nextAction: String(formData.get('nextAction') ?? '').trim() || undefined,
    });

    revalidatePath('/communication/records');
    bounce({ created: created.id, topic: created.topic });
  } catch (error) {
    bounce({ error: error instanceof Error ? error.message : '创建沟通记录失败' });
  }
}
