import { Controller, Get, Res } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth() {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  async getReadiness(@Res({ passthrough: true }) response: { status: (code: number) => unknown }) {
    const readiness = await this.healthService.getReadiness();
    response.status(readiness.statusCode);
    return readiness;
  }
}
