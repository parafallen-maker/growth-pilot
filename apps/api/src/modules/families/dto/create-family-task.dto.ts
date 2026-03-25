import { dateString, enumValue, optionalDateString, optionalIdString, optionalTrimmedString, strictObject, trimmedString } from '../../../common/validation';

export class CreateFamilyTaskDto {
  static schema = strictObject({
    studentId: optionalIdString(),
    sourceType: optionalTrimmedString(32),
    sourceId: optionalIdString(),
    title: trimmedString(1, 128),
    description: optionalTrimmedString(1000),
    frequency: optionalTrimmedString(32),
    assigneeGuardianId: optionalIdString(),
    startDate: optionalDateString(),
    dueDate: optionalDateString(),
    status: enumValue(['pending', 'in_progress', 'done', 'cancelled']).optional(),
  });

  studentId?: string;
  sourceType?: string;
  sourceId?: string;
  title!: string;
  description?: string;
  frequency?: string;
  assigneeGuardianId?: string;
  startDate?: string;
  dueDate?: string;
  status?: string;
}
