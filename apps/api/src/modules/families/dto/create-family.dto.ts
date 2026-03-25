import { optionalMobileString, optionalTrimmedString, strictObject } from '../../../common/validation';

export class CreateFamilyDto {
  static schema = strictObject({
    familyCode: optionalTrimmedString(64),
    familyName: optionalTrimmedString(128),
    primaryContactName: optionalTrimmedString(64),
    primaryMobile: optionalMobileString(),
    secondaryMobile: optionalMobileString(),
    familyStructure: optionalTrimmedString(64),
    address: optionalTrimmedString(255),
    communicationPreference: optionalTrimmedString(64),
    notes: optionalTrimmedString(1000),
  });

  familyCode?: string;
  familyName?: string;
  primaryContactName?: string;
  primaryMobile?: string;
  secondaryMobile?: string;
  familyStructure?: string;
  address?: string;
  communicationPreference?: string;
  notes?: string;
}
