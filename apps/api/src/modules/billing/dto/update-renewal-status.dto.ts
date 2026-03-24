export class UpdateRenewalStatusDto {
  status!: 'todo' | 'contacting' | 'won' | 'lost' | 'closed';
  lastContactAt?: string;
  note?: string;
}
