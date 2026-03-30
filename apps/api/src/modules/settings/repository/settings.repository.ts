import { Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { createDb, dbSchema } from '../../../db';
import { FileJsonStore } from '../../../shared/persistence/file-json-store';
import { isDbPersistenceEnabled } from '../../../shared/persistence/adapter';

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

interface SettingsStoreShape {
  campuses: CampusRecord[];
  terms: TermRecord[];
  dictionaries: DictionaryRecord[];
}

// Stable seed UUIDs — referenced by users.repository.ts campusIds
const CAMPUS_ID_GSH = randomUUID();
const CAMPUS_ID_NM = randomUUID();

const defaultCampuses: CampusRecord[] = [
  { id: CAMPUS_ID_GSH, code: 'GSH', name: '观山湖校区', status: 'active' },
  { id: CAMPUS_ID_NM, code: 'NM', name: '南明校区', status: 'active' },
];

const defaultTerms: TermRecord[] = [
  { id: randomUUID(), campusId: CAMPUS_ID_GSH, code: '2026-SPRING', name: '2026 春季学期', startDate: '2026-02-24', endDate: '2026-07-10', status: 'active' },
  { id: randomUUID(), campusId: CAMPUS_ID_NM, code: '2026-SPRING-NM', name: '2026 春季学期（南明）', startDate: '2026-02-24', endDate: '2026-07-10', status: 'active' },
];

const defaultDictionaries: DictionaryRecord[] = [
  { id: randomUUID(), dictType: 'student_status', code: 'active', label: '在读', value: 'active' },
  { id: randomUUID(), dictType: 'student_status', code: 'graduated', label: '结业', value: 'graduated' },
  { id: randomUUID(), dictType: 'job_status', code: 'running', label: '执行中', value: 'running' },
  { id: randomUUID(), dictType: 'job_status', code: 'succeeded', label: '已完成', value: 'succeeded' },
];

interface SettingsRepositoryPort {
  listCampuses(): Promise<CampusRecord[]>;
  listTerms(campusId?: string): Promise<TermRecord[]>;
  listDictionaries(dictType?: string): Promise<DictionaryRecord[]>;
}

class FileSettingsRepository implements SettingsRepositoryPort {
  private readonly store = new FileJsonStore<SettingsStoreShape>('.data/settings.json', () => ({
    campuses: structuredClone(defaultCampuses),
    terms: structuredClone(defaultTerms),
    dictionaries: structuredClone(defaultDictionaries),
  }));

  async listCampuses() {
    return [...this.store.read().campuses];
  }

  async listTerms(campusId?: string) {
    return this.store.read().terms.filter((term) => !campusId || term.campusId === campusId);
  }

  async listDictionaries(dictType?: string) {
    return this.store.read().dictionaries.filter((item) => !dictType || item.dictType === dictType);
  }
}

class DbSettingsRepository implements SettingsRepositoryPort {
  private readonly db = createDb();

  async listCampuses() {
    const rows = await this.db.select().from(dbSchema.campuses).orderBy(asc(dbSchema.campuses.sortOrder), asc(dbSchema.campuses.code));
    return rows.map((row) => ({ id: row.id, code: row.code, name: row.name, status: row.status }));
  }

  async listTerms(campusId?: string) {
    const rows = campusId
      ? await this.db.select().from(dbSchema.schoolTerms).where(eq(dbSchema.schoolTerms.campusId, campusId)).orderBy(asc(dbSchema.schoolTerms.startDate))
      : await this.db.select().from(dbSchema.schoolTerms).orderBy(asc(dbSchema.schoolTerms.startDate));

    return rows.map((row) => ({
      id: row.id,
      campusId: row.campusId ?? '',
      code: row.code,
      name: row.name,
      startDate: row.startDate,
      endDate: row.endDate,
      status: row.status,
    }));
  }

  async listDictionaries(dictType?: string) {
    const rows = dictType
      ? await this.db.select().from(dbSchema.systemDictionaries).where(eq(dbSchema.systemDictionaries.dictType, dictType)).orderBy(asc(dbSchema.systemDictionaries.sortOrder))
      : await this.db.select().from(dbSchema.systemDictionaries).orderBy(asc(dbSchema.systemDictionaries.dictType), asc(dbSchema.systemDictionaries.sortOrder));

    return rows.map((row) => ({
      id: row.id,
      dictType: row.dictType,
      code: row.code,
      label: row.label,
      value: row.value ?? '',
    }));
  }
}

@Injectable()
export class SettingsRepository {
  private readonly adapter: SettingsRepositoryPort;

  constructor() {
    this.adapter = isDbPersistenceEnabled() ? new DbSettingsRepository() : new FileSettingsRepository();
  }

  listCampuses() {
    return this.adapter.listCampuses();
  }

  listTerms(campusId?: string) {
    return this.adapter.listTerms(campusId);
  }

  listDictionaries(dictType?: string) {
    return this.adapter.listDictionaries(dictType);
  }
}

export const settingsRepositorySeed = {
  campuses: defaultCampuses,
  terms: defaultTerms,
  dictionaries: defaultDictionaries,
  campusIdGsh: CAMPUS_ID_GSH,
  campusIdNm: CAMPUS_ID_NM,
};
