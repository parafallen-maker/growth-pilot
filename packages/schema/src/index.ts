export interface HealthCheckDto {
  ok: boolean;
  service: 'web' | 'api';
}

export interface Teacher {
  id: string;
  campusId: string;
  employeeNo: string;
  name: string;
  mobile?: string;
  leadSubject?: string;
  status: string;
}

export interface Student {
  id: string;
  studentNo: string;
  name: string;
  gender?: string;
  birthDate?: string | null;
  schoolName?: string;
  gradeLabel: string;
  className?: string;
  familyId?: string | null;
  status: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  campusId: string;
  termId: string;
  primaryTeacherId?: string | null;
  groupId?: string | null;
  enrollDate: string;
  leaveDate?: string | null;
  status: string;
}

export interface Family {
  id: string;
  familyCode: string;
  familyName?: string;
  primaryContactName?: string;
  primaryMobile?: string;
  familyStructure?: string;
  status: string;
}

export interface Guardian {
  id: string;
  familyId: string;
  name: string;
  relation: string;
  mobile?: string;
  isPrimary: boolean;
  isEmergency: boolean;
}
