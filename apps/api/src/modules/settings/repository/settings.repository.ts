import { Injectable } from '@nestjs/common';

export interface CampusRecord {
  id: string;
  code: string;
  name: string;
  status: string;
}

export interface TermRecord {
  id: string;
  campusId: string;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface DictionaryRecord {
  id: string;
  dictType: string;
  code: string;
  label: string;
  value: string;
}

@Injectable()
export class SettingsRepository {
  private readonly campuses: CampusRecord[] = [
    {
      id: 'campus-guanshanhu',
      code: 'GSH',
      name: '观山湖校区',
      status: 'active',
    },
    {
      id: 'campus-nanming',
      code: 'NM',
      name: '南明校区',
      status: 'active',
    },
  ];

  private readonly terms: TermRecord[] = [
    {
      id: 'term-2026-spring-gsh',
      campusId: 'campus-guanshanhu',
      code: '2026-SPRING',
      name: '2026 春季学期',
      startDate: '2026-02-24',
      endDate: '2026-07-10',
      status: 'active',
    },
    {
      id: 'term-2026-spring-nm',
      campusId: 'campus-nanming',
      code: '2026-SPRING-NM',
      name: '2026 春季学期（南明）',
      startDate: '2026-02-24',
      endDate: '2026-07-10',
      status: 'active',
    },
  ];

  private readonly dictionaries: DictionaryRecord[] = [
    {
      id: 'dict-student-status-active',
      dictType: 'student_status',
      code: 'active',
      label: '在读',
      value: 'active',
    },
    {
      id: 'dict-student-status-graduated',
      dictType: 'student_status',
      code: 'graduated',
      label: '结业',
      value: 'graduated',
    },
    {
      id: 'dict-job-status-running',
      dictType: 'job_status',
      code: 'running',
      label: '执行中',
      value: 'running',
    },
    {
      id: 'dict-job-status-succeeded',
      dictType: 'job_status',
      code: 'succeeded',
      label: '已完成',
      value: 'succeeded',
    },
  ];

  listCampuses() {
    return [...this.campuses];
  }

  listTerms(campusId?: string) {
    return this.terms.filter((term) => !campusId || term.campusId === campusId);
  }

  listDictionaries(dictType?: string) {
    return this.dictionaries.filter((item) => !dictType || item.dictType === dictType);
  }
}
