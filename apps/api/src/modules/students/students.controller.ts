import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ok } from '../../common/api-response';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { StudentQueryDto } from './dto/student-query.dto';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  list(@Query() query: StudentQueryDto) {
    return ok(this.studentsService.list(query));
  }

  @Get(':studentId')
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
