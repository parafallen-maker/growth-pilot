import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../../common/auth.guard';
import { PermissionGuard } from '../../common/permission.guard';
import { RequirePermission } from '../../common/permission.decorator';
import { ok } from '../../common/api-response';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { CreateStudentImportDto } from './dto/create-student-import.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { StudentQueryDto } from './dto/student-query.dto';
import { StudentsService } from './students.service';

@Controller('students')
@UseGuards(ApiAuthGuard, PermissionGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  @RequirePermission('students:view')
  async list(@Query() query: StudentQueryDto) {
    return ok(await this.studentsService.list(query));
  }

  @Get(':studentId/360')
  @RequirePermission('students:view')
  async detail360(@Param('studentId') studentId: string) {
    return ok(await this.studentsService.detail360(studentId));
  }

  @Get(':studentId')
  @RequirePermission('students:view')
  async detail(@Param('studentId') studentId: string) {
    return ok(await this.studentsService.detail(studentId));
  }

  @Post()
  async create(@Body() payload: CreateStudentDto) {
    return ok(await this.studentsService.create(payload));
  }

  @Post(':studentId/enrollments')
  async createEnrollment(@Param('studentId') studentId: string, @Body() payload: CreateEnrollmentDto) {
    return ok(await this.studentsService.createEnrollment(studentId, payload));
  }

  @Post('import')
  @RequirePermission('students:view')
  async import(@Body() payload: CreateStudentImportDto) {
    return ok(await this.studentsService.importStudents(payload));
  }
}
