export class CreateFamilyTaskDto {
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
