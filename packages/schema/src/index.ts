export interface HealthCheckDto {
  ok: boolean;
  service: 'web' | 'api';
}
