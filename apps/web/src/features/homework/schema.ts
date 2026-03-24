import { z } from 'zod';

export const homeworkReviewFormSchema = z.object({
  finalAccuracyPct: z.coerce.number().min(0).max(100),
  errorCodes: z.array(z.string()).min(1, '至少选择一个错因'),
  errorRemark: z.string().max(300).default(''),
  parentFeedback: z.string().max(500).default(''),
  publishToParent: z.boolean().default(false),
});

export type HomeworkReviewFormValues = z.infer<typeof homeworkReviewFormSchema>;

export const homeworkReviewDefaultValues: HomeworkReviewFormValues = {
  finalAccuracyPct: 91,
  errorCodes: ['calc-careless', 'concept-misaligned'],
  errorRemark: '二次计算步骤遗漏校验，概念理解与题干条件存在轻微偏差。',
  parentFeedback: '建议晚间错题回看 10 分钟，先口述思路再动笔。',
  publishToParent: true,
};
