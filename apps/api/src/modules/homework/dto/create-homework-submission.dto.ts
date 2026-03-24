export class CreateHomeworkSubmissionDto {
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
