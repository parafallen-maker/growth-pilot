import { integerNumber, optionalIdString, optionalIntegerNumber, optionalTrimmedString, strictObject, trimmedString, zod } from '../../../common/validation';

class CreateRubricDimensionDto {
  static schema = strictObject({
    code: trimmedString(1, 64),
    name: trimmedString(1, 128),
    weight: optionalIntegerNumber(0, 100),
    scoreMin: optionalIntegerNumber(),
    scoreMax: optionalIntegerNumber(),
    description: optionalTrimmedString(255),
    sortOrder: optionalIntegerNumber(),
  });

  code!: string;
  name!: string;
  weight?: number;
  scoreMin?: number;
  scoreMax?: number;
  description?: string;
  sortOrder?: number;
}

export class CreateRubricTemplateDto {
  static schema = strictObject({
    campusId: optionalIdString(),
    termId: optionalIdString(),
    name: trimmedString(1, 128),
    stageScope: optionalTrimmedString(64),
    status: optionalTrimmedString(32),
    description: optionalTrimmedString(1000),
    dimensions: zod.array(CreateRubricDimensionDto.schema).min(1).max(20),
  });

  campusId?: string;
  termId?: string;
  name!: string;
  stageScope?: string;
  status?: string;
  description?: string;
  dimensions!: Array<CreateRubricDimensionDto>;
}
