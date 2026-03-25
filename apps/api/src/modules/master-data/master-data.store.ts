import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Enrollment, Family, Guardian, Student, Teacher } from '@growthpilot/schema/index';

export interface PersistedTeacher extends Teacher {
  email?: string;
  hireDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersistedFamily extends Family {
  secondaryMobile?: string;
  address?: string;
  communicationPreference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersistedGuardian extends Guardian {
  wechatId?: string;
  email?: string;
  occupation?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersistedStudent extends Student {
  photoFileId?: string | null;
  profileNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersistedEnrollment extends Enrollment {
  leaveReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MasterDataState {
  teachers: PersistedTeacher[];
  students: PersistedStudent[];
  families: PersistedFamily[];
  guardians: PersistedGuardian[];
  enrollments: PersistedEnrollment[];
}

const DEFAULT_STATE: MasterDataState = {
  teachers: [
    {
      id: 'teacher-001',
      campusId: 'campus-001',
      employeeNo: 'T001',
      name: '王老师',
      mobile: '13800000001',
      email: 'teacher001@example.com',
      hireDate: '2025-09-01',
      leadSubject: 'math',
      status: 'active',
      createdAt: '2026-03-24T09:00:00+08:00',
      updatedAt: '2026-03-24T09:00:00+08:00',
    },
    {
      id: 'teacher-002',
      campusId: 'campus-002',
      employeeNo: 'T002',
      name: '李老师',
      mobile: '13800000002',
      email: 'teacher002@example.com',
      hireDate: '2025-09-01',
      leadSubject: 'chinese',
      status: 'active',
      createdAt: '2026-03-24T09:05:00+08:00',
      updatedAt: '2026-03-24T09:05:00+08:00',
    },
  ],
  families: [
    {
      id: 'family-001',
      familyCode: 'F001',
      familyName: '明明家',
      primaryContactName: '王妈妈',
      primaryMobile: '13900000001',
      familyStructure: 'nuclear',
      communicationPreference: 'wechat',
      status: 'active',
      createdAt: '2026-03-24T09:10:00+08:00',
      updatedAt: '2026-03-24T09:10:00+08:00',
    },
  ],
  guardians: [
    {
      id: 'guardian-001',
      familyId: 'family-001',
      name: '王妈妈',
      relation: 'mother',
      mobile: '13900000001',
      isPrimary: true,
      isEmergency: true,
      createdAt: '2026-03-24T09:11:00+08:00',
      updatedAt: '2026-03-24T09:11:00+08:00',
    },
    {
      id: 'guardian-002',
      familyId: 'family-001',
      name: '王爸爸',
      relation: 'father',
      mobile: '13900000002',
      isPrimary: false,
      isEmergency: false,
      createdAt: '2026-03-24T09:12:00+08:00',
      updatedAt: '2026-03-24T09:12:00+08:00',
    },
  ],
  students: [
    {
      id: 'student-001',
      studentNo: 'S001',
      name: '小明',
      gender: 'male',
      birthDate: '2017-05-20',
      schoolName: '洪基实验小学',
      gradeLabel: '一年级',
      className: '1班',
      familyId: 'family-001',
      status: 'active',
      createdAt: '2026-03-24T09:20:00+08:00',
      updatedAt: '2026-03-24T09:20:00+08:00',
    },
  ],
  enrollments: [
    {
      id: 'enrollment-001',
      studentId: 'student-001',
      campusId: 'campus-001',
      termId: 'term-2026-spring',
      primaryTeacherId: 'teacher-001',
      groupId: null,
      enrollDate: '2026-02-18',
      leaveDate: null,
      status: 'active',
      createdAt: '2026-03-24T09:21:00+08:00',
      updatedAt: '2026-03-24T09:21:00+08:00',
    },
  ],
};

@Injectable()
export class MasterDataStore {
  private static readonly cache = new Map<string, MasterDataState>();
  private readonly filePath: string;

  constructor(filePath?: string) {
    this.filePath = resolve(filePath ?? process.env.GROWTHPILOT_MASTER_DATA_PATH ?? '.runtime/master-data.json');
    this.ensureLoaded();
  }

  read(): MasterDataState {
    return structuredClone(this.loadState());
  }

  transact<T>(mutator: (draft: MasterDataState) => T): T {
    const draft = structuredClone(this.loadState());
    const result = mutator(draft);
    this.persist(draft);
    return result;
  }

  reset(state: MasterDataState = DEFAULT_STATE): void {
    this.persist(structuredClone(state));
  }

  private ensureLoaded(): void {
    if (MasterDataStore.cache.has(this.filePath)) {
      return;
    }
    const directory = dirname(this.filePath);
    mkdirSync(directory, { recursive: true });
    if (!existsSync(this.filePath)) {
      writeFileSync(this.filePath, JSON.stringify(DEFAULT_STATE, null, 2), 'utf8');
    }
    const parsed = JSON.parse(readFileSync(this.filePath, 'utf8')) as MasterDataState;
    MasterDataStore.cache.set(this.filePath, parsed);
  }

  private loadState(): MasterDataState {
    this.ensureLoaded();
    const state = MasterDataStore.cache.get(this.filePath);
    if (!state) {
      throw new Error(`master data store not loaded: ${this.filePath}`);
    }
    return state;
  }

  private persist(state: MasterDataState): void {
    const tempFile = `${this.filePath}.tmp`;
    writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf8');
    renameSync(tempFile, this.filePath);
    MasterDataStore.cache.set(this.filePath, state);
  }
}
