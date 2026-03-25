import { dateString, optionalIdString, optionalStringArray, optionalTrimmedString, strictObject, trimmedString } from '../../../common/validation';

export class CreateHomeworkSubmissionDto {
  static schema = strictObject({
    studentId: trimmedString(1, 64),
    campusId: optionalIdString(),
    termId: optionalIdString(),
    teacherId: optionalIdString(),
    subject: trimmedString(1, 64),
    homeworkDate: dateString(),
    fileIds: optionalStringArray(trimmedString(1, 64), 1, 20),
    sourceType: optionalTrimmedString(32),
    remark: optionalTrimmedString(1000),
  });

  studentId!: string;
  campusId?: string;
  termId?: string;
  teacherId?: string;
  subject!: string;
  homeworkDate!: string;
  fileIds!: string[];
  sourceType?: string;
  remark?: string;
}
