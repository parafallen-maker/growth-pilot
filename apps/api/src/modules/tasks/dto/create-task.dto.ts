import { optionalDateTimeString, optionalIdString, optionalTrimmedString, strictObject, trimmedString, optionalEnumValue } from '../../../common/validation';

export class CreateTaskDto {
  static schema = strictObject({
    taskType: trimmedString(1, 64),
    ownerUserId: trimmedString(1, 64),
    title: trimmedString(1, 120),
    description: optionalTrimmedString(1000),
    priority: optionalEnumValue(['low', 'medium', 'high']),
    dueAt: optionalDateTimeString(),
    sourceType: optionalTrimmedString(64),
    sourceId: optionalIdString(),
    studentId: optionalIdString(),
    familyId: optionalIdString(),
    teacherId: optionalIdString(),
    resultNote: optionalTrimmedString(1000),
    status: optionalEnumValue(['open', 'in_progress', 'done']),
  }).strict();

  taskType!: string;
  ownerUserId!: string;
  title!: string;
  description?: string;
  priority?: string;
  dueAt?: string;
  sourceType?: string;
  sourceId?: string;
  studentId?: string;
  familyId?: string;
  teacherId?: string;
  resultNote?: string;
  status?: string;
}
