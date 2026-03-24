import { Injectable, NotFoundException } from '@nestjs/common';
import type { Teacher } from '@growthpilot/schema/index';
import { normalizePage } from '../../common/base-list-query.dto';
import type { PageResult } from '../../common/api-response';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { TeacherQueryDto } from './dto/teacher-query.dto';

interface TeacherDetail {
  teacher: Teacher;
  subjects: Array<{ subject: string; gradeRange?: string; level?: string }>;
  shifts: Array<{ id: string; weekday: number; startTime: string; endTime: string; shiftType: string }>;
  developmentRecords: Array<{ id: string; recordType: string; title: string; status: string; occurredAt: string }>;
}

@Injectable()
export class TeachersService {
  private readonly teachers: Teacher[] = [
    {
      id: 'teacher-001',
      campusId: 'campus-001',
      employeeNo: 'T001',
      name: '王老师',
      mobile: '13800000001',
      leadSubject: 'math',
      status: 'active',
    },
  ];

  list(query: TeacherQueryDto): PageResult<Teacher> {
    const { pageNo, pageSize } = normalizePage(query);
    const filtered = this.teachers.filter((teacher) => {
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
    const teacher = this.teachers.find((item) => item.id === teacherId);
    if (!teacher) {
      throw new NotFoundException(`Teacher ${teacherId} not found`);
    }

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
    const teacher: Teacher = {
      id: `teacher-${String(this.teachers.length + 1).padStart(3, '0')}`,
      campusId: payload.campusId,
      employeeNo: payload.employeeNo,
      name: payload.name,
      mobile: payload.mobile,
      leadSubject: payload.leadSubject,
      status: payload.status ?? 'active',
    };

    this.teachers.unshift(teacher);
    return teacher;
  }
}
