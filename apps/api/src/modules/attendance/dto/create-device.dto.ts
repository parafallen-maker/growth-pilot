export class CreateDeviceDto {
  campusId?: string;
  serialNo!: string;
  deviceType?: 'beacon' | 'tablet' | 'gate' | 'manual';
  status?: 'idle' | 'bound' | 'repair' | 'retired';
  note?: string;
}
