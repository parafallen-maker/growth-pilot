import { Injectable, NotFoundException } from '@nestjs/common';
import type { Family, Guardian, Student } from '@growthpilot/schema/index';
import { normalizePage } from '../../common/base-list-query.dto';
import type { PageResult } from '../../common/api-response';
import { CreateFamilyDto } from './dto/create-family.dto';
import { CreateGuardianDto } from './dto/create-guardian.dto';
import { FamilyQueryDto } from './dto/family-query.dto';

@Injectable()
export class FamiliesService {
  private readonly families: Family[] = [
    {
      id: 'family-001',
      familyCode: 'F001',
      familyName: '明明家',
      primaryContactName: '王妈妈',
      primaryMobile: '13900000001',
      familyStructure: 'nuclear',
      status: 'active',
    },
  ];

  private readonly guardians: Guardian[] = [
    {
      id: 'guardian-001',
      familyId: 'family-001',
      name: '王妈妈',
      relation: 'mother',
      mobile: '13900000001',
      isPrimary: true,
      isEmergency: true,
    },
  ];

  private readonly familyStudents: Student[] = [
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
    },
  ];

  list(query: FamilyQueryDto): PageResult<Family> {
    const { pageNo, pageSize } = normalizePage(query);
    const filtered = this.families.filter((family) => {
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

  detail(familyId: string) {
    const family = this.families.find((item) => item.id === familyId);
    if (!family) {
      throw new NotFoundException(`Family ${familyId} not found`);
    }

    return {
      family,
      guardians: this.guardians.filter((item) => item.familyId === familyId),
      students: this.familyStudents.filter((item) => item.familyId === familyId),
      billingSummary: {},
      tasks: [],
      communications: [],
    };
  }

  create(payload: CreateFamilyDto): Family {
    const family: Family = {
      id: `family-${String(this.families.length + 1).padStart(3, '0')}`,
      familyCode: payload.familyCode ?? `F${String(this.families.length + 1).padStart(3, '0')}`,
      familyName: payload.familyName,
      primaryContactName: payload.primaryContactName,
      primaryMobile: payload.primaryMobile,
      familyStructure: payload.familyStructure,
      status: 'active',
    };

    this.families.unshift(family);
    return family;
  }

  createGuardian(familyId: string, payload: CreateGuardianDto): Guardian {
    this.detail(familyId);

    const guardian: Guardian = {
      id: `guardian-${String(this.guardians.length + 1).padStart(3, '0')}`,
      familyId,
      name: payload.name,
      relation: payload.relation,
      mobile: payload.mobile,
      isPrimary: payload.isPrimary ?? false,
      isEmergency: payload.isEmergency ?? false,
    };

    this.guardians.unshift(guardian);
    return guardian;
  }
}
