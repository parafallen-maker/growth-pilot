import { optionalDateString, optionalIdString, optionalStringArray, optionalTrimmedString, strictObject, trimmedString, zod } from '../../../common/validation';

export class ExternalCourseDto {
  static schema = strictObject({
    subject: optionalTrimmedString(64),
    institutionName: optionalTrimmedString(128),
    scheduleNote: optionalTrimmedString(255),
  });

  subject?: string;
  institutionName?: string;
  scheduleNote?: string;
}

export class CreateStudentDto {
  static schema = strictObject({
    studentNo: trimmedString(1, 64),
    name: trimmedString(1, 64),
    gender: optionalTrimmedString(16),
    birthDate: optionalDateString(),
    schoolName: optionalTrimmedString(128),
    gradeLabel: trimmedString(1, 32),
    className: optionalTrimmedString(64),
    familyId: optionalIdString(),
    photoFileId: optionalIdString(),
    profileNotes: optionalTrimmedString(1000),
    tags: optionalStringArray(trimmedString(1, 64), 1, 32),
    outsideCourses: zod.array(ExternalCourseDto.schema).max(16).optional(),
  });

  studentNo!: string;
  name!: string;
  gender?: string;
  birthDate?: string;
  schoolName?: string;
  gradeLabel!: string;
  className?: string;
  familyId?: string;
  photoFileId?: string;
  profileNotes?: string;
  tags?: string[];
  outsideCourses?: ExternalCourseDto[];
}
