export class CreateDeviceBindingDto {
  studentId!: string;
  deviceId!: string;
  status?: 'active' | 'inactive';
  boundAt?: string;
  createdBy?: string;
}
