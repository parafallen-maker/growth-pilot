export class UpdateDeviceBindingDto {
  status?: 'active' | 'inactive';
  unboundAt?: string | null;
  note?: string;
}
