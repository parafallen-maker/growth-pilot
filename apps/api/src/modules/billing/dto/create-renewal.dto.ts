export class CreateRenewalDto {
  familyId!: string;
  studentId!: string;
  campusId?: string;
  termId?: string;
  contractId?: string;
  ownerUserId?: string;
  expectedEndDate?: string;
  status?: 'todo' | 'contacting' | 'won' | 'lost' | 'closed';
  lastContactAt?: string;
  nextFollowUpAt?: string;
  note?: string;
}
