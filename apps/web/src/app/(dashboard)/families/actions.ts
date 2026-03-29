'use server';

import { revalidatePath } from 'next/cache';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { redirect } from 'next/navigation';
import { familyService } from '@/services/families-service';

function bounce(params: Record<string, string>): never {
  redirect(`/families?${new URLSearchParams(params).toString()}`);
}

export async function createFamily(formData: FormData) {
  try {
    const payload = {
      familyCode: String(formData.get('familyCode') ?? '').trim() || undefined,
      familyName: String(formData.get('familyName') ?? '').trim(),
      primaryContactName: String(formData.get('primaryContactName') ?? '').trim(),
      primaryMobile: String(formData.get('primaryMobile') ?? '').trim() || undefined,
      secondaryMobile: String(formData.get('secondaryMobile') ?? '').trim() || undefined,
      familyStructure: String(formData.get('familyStructure') ?? '').trim() || undefined,
      address: String(formData.get('address') ?? '').trim() || undefined,
      communicationPreference: String(formData.get('communicationPreference') ?? '').trim() || undefined,
      notes: String(formData.get('notes') ?? '').trim() || undefined,
    };

    if (!payload.familyName || !payload.primaryContactName) {
      bounce({ error: '家庭名称和主联系人必填' });
    }

    const created = await familyService.create(payload);
    revalidatePath('/families');
    bounce({ created: created.familyCode ?? created.id });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    bounce({ error: error instanceof Error ? error.message : '新建家庭失败' });
  }
}
