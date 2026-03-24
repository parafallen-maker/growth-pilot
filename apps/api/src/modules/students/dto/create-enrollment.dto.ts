export class CreateEnrollmentDto {
  campusId!: string;
  termId!: string;
  primaryTeacherId?: string;
  groupId?: string;
  enrollDate!: string;
  leaveDate?: string;
  leaveReason?: string;
  status?: string;
}
