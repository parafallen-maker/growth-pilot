export class CreateDevelopmentRecordDto {
  recordType!: string;
  title!: string;
  occurredAt?: string;
  observerTeacherId?: string;
  strengths?: string;
  improvements?: string;
  actionItems?: string;
  dueDate?: string;
  status?: string;
  attachmentFileId?: string;
}
