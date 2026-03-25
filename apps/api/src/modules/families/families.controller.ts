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
  list(@Query() query: FamilyQueryDto) {
    return ok(this.familiesService.list(query));
  }

  @Get(':familyId')
  @RequirePermission('families:view')
  detail(@Param('familyId') familyId: string) {
    return ok(this.familiesService.detail(familyId));
  }

  @Post()
  create(@Body() payload: CreateFamilyDto) {
    return ok(this.familiesService.create(payload));
  }

  @Post(':familyId/guardians')
  createGuardian(@Param('familyId') familyId: string, @Body() payload: CreateGuardianDto) {
    return ok(this.familiesService.createGuardian(familyId, payload));
  }
}
