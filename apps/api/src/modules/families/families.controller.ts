import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../../common/auth.guard';
import { PermissionGuard } from '../../common/permission.guard';
import { RequirePermission } from '../../common/permission.decorator';
import { ok } from '../../common/api-response';
import { CreateFamilyDto } from './dto/create-family.dto';
import { CreateGuardianDto } from './dto/create-guardian.dto';
import { FamilyQueryDto } from './dto/family-query.dto';
import { FamiliesService } from './families.service';

@Controller('families')
@UseGuards(ApiAuthGuard, PermissionGuard)
export class FamiliesController {
  constructor(private readonly familiesService: FamiliesService) {}

  @Get()
  @RequirePermission('families:view')
  async list(@Query() query: FamilyQueryDto) {
    return ok(await this.familiesService.list(query));
  }

  @Get(':familyId')
  @RequirePermission('families:view')
  async detail(@Param('familyId') familyId: string) {
    return ok(await this.familiesService.detail(familyId));
  }

  @Post()
  async create(@Body() payload: CreateFamilyDto) {
    return ok(await this.familiesService.create(payload));
  }

  @Post(':familyId/guardians')
  async createGuardian(@Param('familyId') familyId: string, @Body() payload: CreateGuardianDto) {
    return ok(await this.familiesService.createGuardian(familyId, payload));
  }
}
