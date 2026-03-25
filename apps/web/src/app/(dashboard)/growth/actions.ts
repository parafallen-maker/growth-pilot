'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireCurrentUser } from '@/lib/current-user';
import { growthService } from '@/services/growth-service';

function parseNumber(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseChannels(formData: FormData) {
  return formData.getAll('channels').map((item) => String(item)).filter(Boolean);
}

function parseIndexedStrings(formData: FormData, prefix: string) {
  return [1, 2, 3].map((index) => ({
    index,
    value: String(formData.get(`${prefix}_${index}`) ?? '').trim(),
  }));
}

function bounce(path: string, params: Record<string, string>) {
  redirect(`${path}?${new URLSearchParams(params).toString()}`);
}

export async function createGrowthRubric(formData: FormData) {
  try {
    const codes = parseIndexedStrings(formData, 'dimensionCode');
    const names = parseIndexedStrings(formData, 'dimensionName');
    const descriptions = parseIndexedStrings(formData, 'dimensionDescription');
    const dimensions = codes
      .map((item) => {
        const name = names.find((entry) => entry.index === item.index)?.value ?? '';
        if (!item.value || !name) {
          return null;
        }

        return {
          code: item.value,
          name,
          description: descriptions.find((entry) => entry.index === item.index)?.value || undefined,
          weight: parseNumber(formData.get(`dimensionWeight_${item.index}`)) ?? 1,
          scoreMin: parseNumber(formData.get(`dimensionScoreMin_${item.index}`)) ?? 1,
          scoreMax: parseNumber(formData.get(`dimensionScoreMax_${item.index}`)) ?? 5,
          sortOrder: item.index * 10,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (!dimensions.length) {
      bounce('/growth/rubrics', { error: '至少填写 1 个 rubric 维度' });
    }

    const created = await growthService.createRubric({
      campusId: String(formData.get('campusId') ?? '').trim() || undefined,
      termId: String(formData.get('termId') ?? '').trim() || undefined,
      name: String(formData.get('name') ?? '').trim(),
      stageScope: String(formData.get('stageScope') ?? '').trim() || 'general',
      status: String(formData.get('status') ?? '').trim() || undefined,
      description: String(formData.get('description') ?? '').trim() || undefined,
      dimensions,
    });

    revalidatePath('/growth/rubrics');
    bounce('/growth/rubrics', {
      created: created.name ?? created.id,
      templateId: created.id,
    });
  } catch (error) {
    bounce('/growth/rubrics', { error: error instanceof Error ? error.message : '创建 rubric 模板失败' });
  }
}

export async function createGrowthGoal(formData: FormData) {
  try {
    const created = await growthService.createGoal({
      studentId: String(formData.get('studentId') ?? '').trim(),
      termId: String(formData.get('termId') ?? '').trim() || undefined,
      goalType: String(formData.get('goalType') ?? '').trim(),
      title: String(formData.get('title') ?? '').trim(),
      description: String(formData.get('description') ?? '').trim() || undefined,
      ownerRole: String(formData.get('ownerRole') ?? '').trim() || undefined,
      metricType: String(formData.get('metricType') ?? '').trim() || undefined,
      baselineValue: parseNumber(formData.get('baselineValue')),
      targetValue: parseNumber(formData.get('targetValue')),
      currentValue: parseNumber(formData.get('currentValue')),
      startDate: String(formData.get('startDate') ?? '').trim() || undefined,
      dueDate: String(formData.get('dueDate') ?? '').trim() || undefined,
      status: String(formData.get('status') ?? '').trim() || undefined,
    });

    revalidatePath('/growth/goals');
    bounce('/growth/goals', { created: created.title ?? created.id });
  } catch (error) {
    bounce('/growth/goals', { error: error instanceof Error ? error.message : '创建成长目标失败' });
  }
}

export async function createGrowthGoalCheckin(formData: FormData) {
  const goalId = String(formData.get('goalId') ?? '').trim();
  if (!goalId) {
    bounce('/growth/goals', { error: '缺少 goalId' });
  }

  try {
    const created = await growthService.createGoalCheckin(goalId, {
      checkinDate: String(formData.get('checkinDate') ?? '').trim(),
      progressValue: parseNumber(formData.get('progressValue')),
      progressNote: String(formData.get('progressNote') ?? '').trim() || undefined,
      nextAction: String(formData.get('nextAction') ?? '').trim() || undefined,
    });

    revalidatePath('/growth/goals');
    bounce('/growth/goals', { checkin: created.id ?? goalId });
  } catch (error) {
    bounce('/growth/goals', { error: error instanceof Error ? error.message : '记录 check-in 失败' });
  }
}

export async function generateGrowthReport(formData: FormData) {
  const studentIds = formData.getAll('studentIds').map((item) => String(item)).filter(Boolean);
  if (!studentIds.length) {
    bounce('/growth/reports', { error: '至少选择 1 个学生生成报告' });
  }

  try {
    const created = await growthService.generateReport({
      reportType: (String(formData.get('reportType') ?? 'weekly').trim() || 'weekly') as 'weekly' | 'monthly',
      periodKey: String(formData.get('periodKey') ?? '').trim(),
      studentIds,
      termId: String(formData.get('termId') ?? '').trim() || undefined,
      campusId: String(formData.get('campusId') ?? '').trim() || undefined,
    });

    revalidatePath('/growth/reports');
    bounce('/growth/reports', { generated: String(created.count ?? created.createdIds?.length ?? studentIds.length) });
  } catch (error) {
    bounce('/growth/reports', { error: error instanceof Error ? error.message : '生成报告草稿失败' });
  }
}

export async function reviewGrowthReport(formData: FormData) {
  const reportId = String(formData.get('reportId') ?? '').trim();
  if (!reportId) {
    bounce('/growth/reports', { error: '缺少 reportId' });
  }

  try {
    const currentUser = await requireCurrentUser();
    await growthService.reviewReport(reportId, {
      reviewerUserId: currentUser.id,
      reviewNote: String(formData.get('reviewNote') ?? '').trim() || undefined,
      title: String(formData.get('title') ?? '').trim() || undefined,
      draftMarkdown: String(formData.get('draftMarkdown') ?? '').trim() || undefined,
      summaryJson: {
        source: 'web-growth-reports-page',
      },
    });

    revalidatePath('/growth/reports');
    bounce('/growth/reports', { reviewed: reportId });
  } catch (error) {
    bounce('/growth/reports', { error: error instanceof Error ? error.message : '复核报告失败' });
  }
}

export async function publishGrowthReport(formData: FormData) {
  const reportId = String(formData.get('reportId') ?? '').trim();
  if (!reportId) {
    bounce('/growth/reports', { error: '缺少 reportId' });
  }

  try {
    const currentUser = await requireCurrentUser();
    await growthService.publishReport(reportId, {
      publisherUserId: currentUser.id,
      publishNote: String(formData.get('publishNote') ?? '').trim() || undefined,
      channels: parseChannels(formData),
    });

    revalidatePath('/growth/reports');
    bounce('/growth/reports', { published: reportId });
  } catch (error) {
    bounce('/growth/reports', { error: error instanceof Error ? error.message : '发布报告失败' });
  }
}
