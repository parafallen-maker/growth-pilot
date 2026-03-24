import { Injectable } from '@nestjs/common';
import type { Teacher } from '@growthpilot/schema/index';
import { normalizePage } from '../../common/base-list-query.dto';
import type { PageResult } from '../../common/api-response';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { TeacherQueryDto } from './dto/teacher-query.dto';
import { TeachersRepository } from './repository/teachers.repository';

interface TeacherDetail {
  teacher: Teacher;
  subjects: Array<{ subject: string; gradeRange?: string; level?: string }>;
  shifts: Array<{ id: string; weekday: number; startTime: string; endTime: string; shiftType: string }>;
  developmentRecords: Array<{ id: string; recordType: string; title: string; status: string; occurredAt: string }>;
}

@Injectable()
export class TeachersService {
  constructor(private readonly teachersRepository: TeachersRepository = new TeachersRepository()) {}

  list(query: TeacherQueryDto): PageResult<Teacher> {
    const { pageNo, pageSize } = normalizePage(query);
    const filtered = this.teachersRepository.list().filter((teacher) => {
      if (query.campusId && teacher.campusId !== query.campusId) return false;
      if (query.status && teacher.status !== query.status) return false;
      if (query.subject && teacher.leadSubject !== query.subject) return false;
      if (query.keyword) {
        const keyword = query.keyword.toLowerCase();
        return teacher.name.toLowerCase().includes(keyword) || teacher.employeeNo.toLowerCase().includes(keyword);
      }
      return true;
    });

    const start = (pageNo - 1) * pageSize;
    return {
      list: filtered.slice(start, start + pageSize),
      page: { pageNo, pageSize, total: filtered.length },
    };
  }

  detail(teacherId: string): TeacherDetail {
    const teacher = this.teachersRepository.requireById(teacherId);

    return {
      teacher,
      subjects: teacher.leadSubject
        ? [{ subject: teacher.leadSubject, gradeRange: 'G1-G6', level: 'core' }]
        : [],
      shifts: [],
      developmentRecords: [],
    };
  }

  create(payload: CreateTeacherDto): Teacher {
    return this.teachersRepository.create({
      campusId: payload.campusId,
      employeeNo: payload.employeeNo,
      name: payload.name,
      mobile: payload.mobile,
      email: payload.email,
      hireDate: payload.hireDate,
      leadSubject: payload.leadSubject,
      status: payload.status ?? 'active',
    });
  }
}
