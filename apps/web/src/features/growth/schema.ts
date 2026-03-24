import { z } from 'zod';

export const rubricDimensionSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(1),
  weight: z.coerce.number().min(0).max(100),
  min: z.coerce.number().min(0),
  max: z.coerce.number().min(1),
  description: z.string().max(300),
  sort: z.coerce.number().int().min(1),
});

export const observationSchema = z.object({
  rubricTemplateId: z.string().min(1),
  studentId: z.string().min(1),
  teacherId: z.string().min(1),
  scene: z.string().min(1),
  observedAt: z.string().min(1),
  dimensions: z.array(z.object({ code: z.string(), score: z.coerce.number().min(0).max(10) })).min(1),
  summary: z.string().max(500),
});

export const goalCheckinSchema = z.object({
  goalId: z.string().min(1),
  progressDelta: z.coerce.number().min(0),
  note: z.string().max(300),
});

export type RubricDimensionValues = z.infer<typeof rubricDimensionSchema>;
export type ObservationValues = z.infer<typeof observationSchema>;
export type GoalCheckinValues = z.infer<typeof goalCheckinSchema>;

export const rubricDimensionDefaultValues: RubricDimensionValues = {
  code: 'focus',
  name: '专注投入',
  weight: 30,
  min: 1,
  max: 5,
  description: '课堂专注度、任务切换与持续投入表现。',
  sort: 10,
};
