import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../../common/auth.guard';
import { PermissionGuard } from '../../common/permission.guard';
import { RequirePermission } from '../../common/permission.decorator';
import { ok } from '../../common/api-response';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { StudentQueryDto } from './dto/student-query.dto';
import { StudentsService } from './students.service';

@Controller('students')
@UseGuards(ApiAuthGuard, PermissionGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @RequirePermission('students:view')
  list(@Query() query: StudentQueryDto) {
    return ok(this.studentsService.list(query));
  }

  @Get(':studentId/360')
  @RequirePermission('students:view')
  detail360(@Param('studentId') studentId: string) {
    return ok(this.studentsService.detail360(studentId));
  }

  @Get(':studentId')
  @RequirePermission('students:view')
  detail(@Param('studentId') studentId: string) {
    return ok(this.studentsService.detail(studentId));
  }

  @Post()
  create(@Body() payload: CreateStudentDto) {
    return ok(this.studentsService.create(payload));
  }

  @Post(':studentId/enrollments')
  createEnrollment(@Param('studentId') studentId: string, @Body() payload: CreateEnrollmentDto) {
    return ok(this.studentsService.createEnrollment(studentId, payload));
  }
}
