import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Family, Guardian, Student } from '@growthpilot/schema/index';
import { MasterDataStore, type PersistedFamily, type PersistedGuardian } from '../../master-data/master-data.store';

@Injectable()
export class FamiliesRepository {
  constructor(private readonly store: MasterDataStore = new MasterDataStore()) {}

  listFamilies(): PersistedFamily[] {
    return this.store.read().families;
  }

  listStudentsByFamily(familyId: string): Student[] {
    return this.store.read().students.filter((item) => item.familyId === familyId);
  }

  listGuardiansByFamily(familyId: string): PersistedGuardian[] {
    return this.store.read().guardians.filter((item) => item.familyId === familyId);
  }

  findFamilyById(familyId: string): PersistedFamily | undefined {
    return this.listFamilies().find((item) => item.id === familyId);
  }

  requireFamilyById(familyId: string): PersistedFamily {
    const family = this.findFamilyById(familyId);
    if (!family) throw new NotFoundException(`Family ${familyId} not found`);
    return family;
  }

  createFamily(input: {
    familyCode: string;
    familyName?: string;
    primaryContactName?: string;
    primaryMobile?: string;
    secondaryMobile?: string;
    familyStructure?: string;
    address?: string;
    communicationPreference?: string;
    notes?: string;
  }): Family {
    return this.store.transact((state) => {
      if (state.families.some((item) => item.familyCode === input.familyCode)) {
        throw new ConflictException({ code: 'DATA_409', message: 'family_code already exists' });
      }
      const now = new Date().toISOString();
      const family: PersistedFamily = {
        id: `family-${String(state.families.length + 1).padStart(3, '0')}`,
        familyCode: input.familyCode,
        familyName: input.familyName,
        primaryContactName: input.primaryContactName,
        primaryMobile: input.primaryMobile,
        secondaryMobile: input.secondaryMobile,
        familyStructure: input.familyStructure,
        address: input.address,
        communicationPreference: input.communicationPreference ?? 'wechat',
        notes: input.notes,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };
      state.families.unshift(family);
      return family;
    });
  }

  createGuardian(familyId: string, input: {
    name: string;
    relation: string;
    mobile?: string;
    wechatId?: string;
    email?: string;
    occupation?: string;
    isPrimary: boolean;
    isEmergency: boolean;
    notes?: string;
  }): Guardian {
    return this.store.transact((state) => {
      const family = state.families.find((item) => item.id === familyId);
      if (!family) throw new NotFoundException(`Family ${familyId} not found`);
      if (input.isPrimary && state.guardians.some((item) => item.familyId === familyId && item.isPrimary)) {
        throw new ConflictException({ code: 'DATA_409', message: 'primary guardian already exists for family' });
      }
      const now = new Date().toISOString();
      const guardian: PersistedGuardian = {
        id: `guardian-${String(state.guardians.length + 1).padStart(3, '0')}`,
        familyId,
        name: input.name,
        relation: input.relation,
        mobile: input.mobile,
        wechatId: input.wechatId,
        email: input.email,
        occupation: input.occupation,
        isPrimary: input.isPrimary,
        isEmergency: input.isEmergency,
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
      };
      state.guardians.unshift(guardian);
      family.updatedAt = now;
      return guardian;
    });
  }
}
