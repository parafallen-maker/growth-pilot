export interface ExternalCourseDto {
  subject?: string;
  institutionName?: string;
  scheduleNote?: string;
}

export class CreateStudentDto {
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
