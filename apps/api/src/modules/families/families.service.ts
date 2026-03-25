import { Injectable } from '@nestjs/common';
import type { Family, FamilyTask, Guardian } from '@growthpilot/schema/index';
import { normalizePage } from '../../common/base-list-query.dto';
import type { PageResult } from '../../common/api-response';
import { CreateFamilyDto } from './dto/create-family.dto';
import { CreateGuardianDto } from './dto/create-guardian.dto';
import { CreateFamilyTaskDto } from './dto/create-family-task.dto';
import { FamilyQueryDto } from './dto/family-query.dto';
import { FamiliesRepository } from './repository/families.repository';

@Injectable()
export class FamiliesService {
  constructor(private readonly familiesRepository: FamiliesRepository = new FamiliesRepository()) {}

  async list(query: FamilyQueryDto): Promise<PageResult<Family>> {
    const { pageNo, pageSize } = normalizePage(query);
    const families = await this.familiesRepository.listFamilies();
    const filtered = families.filter((family) => {
      if (query.status && family.status !== query.status) return false;
      if (query.keyword) {
        const keyword = query.keyword.toLowerCase();
        return [family.familyCode, family.familyName, family.primaryContactName, family.primaryMobile]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(keyword));
      }
      return true;
    });

    const start = (pageNo - 1) * pageSize;
    return {
      list: filtered.slice(start, start + pageSize),
      page: { pageNo, pageSize, total: filtered.length },
    };
  }

  async detail(familyId: string) {
    const family = await this.familiesRepository.requireFamilyById(familyId);

    return {
      family,
      guardians: await this.familiesRepository.listGuardiansByFamily(familyId),
      students: await this.familiesRepository.listStudentsByFamily(familyId),
      billingSummary: {},
      tasks: await this.familiesRepository.listTasksByFamily(familyId),
      communications: [],
    };
  }

  async create(payload: CreateFamilyDto): Promise<Family> {
    const families = await this.familiesRepository.listFamilies();
    const nextCode = payload.familyCode ?? `F${String(families.length + 1).padStart(3, '0')}`;
    return this.familiesRepository.createFamily({
      familyCode: nextCode,
      familyName: payload.familyName,
      primaryContactName: payload.primaryContactName,
      primaryMobile: payload.primaryMobile,
      secondaryMobile: payload.secondaryMobile,
      familyStructure: payload.familyStructure,
      address: payload.address,
      communicationPreference: payload.communicationPreference,
      notes: payload.notes,
    });
  }

  createGuardian(familyId: string, payload: CreateGuardianDto): Promise<Guardian> {
    return this.familiesRepository.createGuardian(familyId, {
      name: payload.name,
      relation: payload.relation,
      mobile: payload.mobile,
      wechatId: payload.wechatId,
      email: payload.email,
      occupation: payload.occupation,
      isPrimary: payload.isPrimary ?? false,
      isEmergency: payload.isEmergency ?? false,
      notes: payload.notes,
    });
  }

  createTask(familyId: string, payload: CreateFamilyTaskDto, createdBy?: string | null): Promise<FamilyTask> {
    return this.familiesRepository.createTask(familyId, {
      studentId: payload.studentId ?? null,
      sourceType: payload.sourceType,
      sourceId: payload.sourceId ?? null,
      title: payload.title,
      description: payload.description,
      frequency: payload.frequency ?? 'once',
      assigneeGuardianId: payload.assigneeGuardianId ?? null,
      startDate: payload.startDate ?? null,
      dueDate: payload.dueDate ?? null,
      status: payload.status ?? 'todo',
      createdBy: createdBy ?? null,
    });
  }
}
