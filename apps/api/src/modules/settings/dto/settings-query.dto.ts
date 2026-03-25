import { optionalIdString, optionalTrimmedString, strictObject } from '../../../common/validation';

export class TermsQueryDto {
  static schema = strictObject({
    campusId: optionalIdString(),
  });

  campusId?: string;
}

export class DictionariesQueryDto {
  static schema = strictObject({
    dictType: optionalTrimmedString(64),
  });

  dictType?: string;
}
