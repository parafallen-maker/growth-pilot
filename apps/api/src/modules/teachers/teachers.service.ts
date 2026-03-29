import { Injectable } from '@nestjs/common';
import type { Teacher, TeacherDevelopmentRecord } from '@growthpilot/schema/index';
import { normalizePage } from '../../common/base-list-query.dto';
import type { PageResult } from '../../common/api-response';
import { CreateDevelopmentRecordDto } from './dto/create-development-record.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { TeacherQueryDto } from './dto/teacher-query.dto';
import { TeachersRepository } from './repository/teachers.repository';

interface TeacherDetail {
  teacher: Teacher;
  subjects: Array<{ subject: string; gradeRange?: string; level?: string }>;
  shifts: Array<{ id: string; weekday: number; startTime: string; endTime: string; shiftType: string }>;
  developmentRecords: TeacherDevelopmentRecord[];
}

@Injectable()
export class TeachersService {
  constructor(private readonly teachersRepository: TeachersRepository) {}

  async list(query: TeacherQueryDto): Promise<PageResult<Teacher>> {
    const { pageNo, pageSize } = normalizePage(query);
    const teachers = await this.teachersRepository.list();
    const filtered = teachers.filter((teacher) => {
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

  async detail(teacherId: string): Promise<TeacherDetail> {
    const teacher = await this.teachersRepository.requireById(teacherId);
    const shifts = await this.teachersRepository.listAssignmentsByTeacher(teacherId);

    return {
      teacher,
      subjects: teacher.leadSubject ? [{ subject: teacher.leadSubject, gradeRange: 'G1-G6', level: 'core' }] : [],
      shifts: shifts.map((shift) => ({
        id: shift.id,
        weekday: shift.weekday,
        startTime: shift.startTime,
        endTime: shift.endTime,
        shiftType: shift.shiftType,
      })),
      developmentRecords: await this.teachersRepository.listDevelopmentRecordsByTeacher(teacherId),
    };
  }

  create(payload: CreateTeacherDto): Promise<Teacher> {
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

  createDevelopmentRecord(
    teacherId: string,
    payload: CreateDevelopmentRecordDto,
    createdBy?: string | null,
  ): Promise<TeacherDevelopmentRecord> {
    return this.teachersRepository.createDevelopmentRecord(teacherId, {
      recordType: payload.recordType,
      title: payload.title,
      occurredAt: payload.occurredAt ?? new Date().toISOString(),
      observerTeacherId: payload.observerTeacherId ?? null,
      strengths: payload.strengths,
      improvements: payload.improvements,
      actionItems: payload.actionItems,
      dueDate: payload.dueDate ?? null,
      status: payload.status ?? 'open',
      attachmentFileId: payload.attachmentFileId ?? null,
      createdBy: createdBy ?? null,
    });
  }
}
