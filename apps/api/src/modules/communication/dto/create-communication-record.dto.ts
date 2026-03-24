export class CreateCommunicationRecordDto {
  familyId!: string;
  studentId?: string;
  channel!: string;
  direction!: string;
  topic?: string;
  summary!: string;
  nextAction?: string;
}
