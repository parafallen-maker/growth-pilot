export class CreateGuardianDto {
  name!: string;
  relation!: string;
  mobile?: string;
  wechatId?: string;
  email?: string;
  occupation?: string;
  isPrimary?: boolean;
  isEmergency?: boolean;
  notes?: string;
}
