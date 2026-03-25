import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../../common/auth.guard';
import { PermissionGuard } from '../../common/permission.guard';
import { RequirePermission } from '../../common/permission.decorator';
import { ok } from '../../common/api-response';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { TeacherQueryDto } from './dto/teacher-query.dto';
import { TeachersService } from './teachers.service';

@Controller('teachers')
@UseGuards(ApiAuthGuard, PermissionGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  @RequirePermission('teachers:view')
  async list(@Query() query: TeacherQueryDto) {
    return ok(await this.teachersService.list(query));
  }

  @Get(':teacherId')
  @RequirePermission('teachers:view')
  async detail(@Param('teacherId') teacherId: string) {
    return ok(await this.teachersService.detail(teacherId));
  }

  @Post()
  async create(@Body() payload: CreateTeacherDto) {
    return ok(await this.teachersService.create(payload));
  }
}
