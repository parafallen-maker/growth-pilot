import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ok } from '../../common/api-response';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { TeacherQueryDto } from './dto/teacher-query.dto';
import { TeachersService } from './teachers.service';

@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  list(@Query() query: TeacherQueryDto) {
    return ok(this.teachersService.list(query));
  }

  @Get(':teacherId')
  detail(@Param('teacherId') teacherId: string) {
    return ok(this.teachersService.detail(teacherId));
  }

  @Post()
  create(@Body() payload: CreateTeacherDto) {
    return ok(this.teachersService.create(payload));
  }
}
