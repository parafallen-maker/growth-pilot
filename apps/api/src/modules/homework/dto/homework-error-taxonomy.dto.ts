import { enumValue, optionalIntegerNumber, optionalTrimmedString, strictObject, trimmedString } from '../../../common/validation';

export class HomeworkErrorTaxonomyQueryDto {
  static schema = strictObject({
    status: enumValue(['draft', 'active', 'inactive']).optional(),
    subject: optionalTrimmedString(64),
    keyword: optionalTrimmedString(100),
  });

  status?: 'draft' | 'active' | 'inactive';
  subject?: string;
  keyword?: string;
}

export class CreateHomeworkErrorTaxonomyDto {
  static schema = strictObject({
    code: trimmedString(1, 64),
    name: trimmedString(1, 128),
    subject: optionalTrimmedString(64),
    stageScope: optionalTrimmedString(64),
    description: optionalTrimmedString(1000),
    status: enumValue(['draft', 'active', 'inactive']).optional(),
    sortOrder: optionalIntegerNumber(),
  });

  code!: string;
  name!: string;
  subject?: string;
  stageScope?: string;
  description?: string;
  status?: 'draft' | 'active' | 'inactive';
  sortOrder?: number;
}

export class UpdateHomeworkErrorTaxonomyDto {
  static schema = strictObject({
    code: optionalTrimmedString(64),
    name: optionalTrimmedString(128),
    subject: optionalTrimmedString(64),
    stageScope: optionalTrimmedString(64),
    description: optionalTrimmedString(1000),
    status: enumValue(['draft', 'active', 'inactive']).optional(),
    sortOrder: optionalIntegerNumber(),
  });

  code?: string;
  name?: string;
  subject?: string;
  stageScope?: string;
  description?: string;
  status?: 'draft' | 'active' | 'inactive';
  sortOrder?: number;
}
