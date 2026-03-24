import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Teacher } from '@growthpilot/schema/index';
import { MasterDataStore, type PersistedTeacher } from '../../master-data/master-data.store';

@Injectable()
export class TeachersRepository {
  constructor(private readonly store: MasterDataStore = new MasterDataStore()) {}

  list(): PersistedTeacher[] {
    return this.store.read().teachers;
  }

  findById(teacherId: string): PersistedTeacher | undefined {
    return this.list().find((item) => item.id === teacherId);
  }

  create(input: {
    campusId: string;
    employeeNo: string;
    name: string;
    mobile?: string;
    email?: string;
    hireDate?: string | null;
    leadSubject?: string;
    status: string;
  }): Teacher {
    return this.store.transact((state) => {
      if (state.teachers.some((item) => item.employeeNo === input.employeeNo)) {
        throw new ConflictException({ code: 'DATA_409', message: 'employee_no already exists' });
      }
      const now = new Date().toISOString();
      const teacher: PersistedTeacher = {
        id: `teacher-${String(state.teachers.length + 1).padStart(3, '0')}`,
        campusId: input.campusId,
        employeeNo: input.employeeNo,
        name: input.name,
        mobile: input.mobile,
        email: input.email,
        hireDate: input.hireDate ?? null,
        leadSubject: input.leadSubject,
        status: input.status,
        createdAt: now,
        updatedAt: now,
      };
      state.teachers.unshift(teacher);
      return teacher;
    });
  }

  requireById(teacherId: string): PersistedTeacher {
    const teacher = this.findById(teacherId);
    if (!teacher) throw new NotFoundException(`Teacher ${teacherId} not found`);
    return teacher;
  }
}
